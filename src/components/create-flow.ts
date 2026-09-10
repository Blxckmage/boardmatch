import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { type FormEvent, useState } from "react";

import {
	type CollectionGame,
	fetchCollection,
} from "#/server/collection.functions";
import { createRoom } from "#/server/room.functions";

const toNum = (v: string) => (v.trim() === "" ? undefined : Number(v));

function useFetchFields() {
	const [username, setUsername] = useState("");
	const [players, setPlayers] = useState("");
	const [maxPlaytime, setMaxPlaytime] = useState("");
	return {
		fields: { username, players, maxPlaytime },
		setters: {
			username: setUsername,
			players: setPlayers,
			maxPlaytime: setMaxPlaytime,
		},
		query: () => ({
			username: username.trim(),
			players: toNum(players),
			maxPlaytime: toNum(maxPlaytime),
		}),
	};
}

function usePicked() {
	const [picked, setPicked] = useState<Set<number>>(new Set());

	const toggle = (id: number) => {
		setPicked((prev) => {
			const next = new Set(prev);
			if (!next.delete(id)) next.add(id);
			return next;
		});
	};

	return {
		picked,
		select: (ids: number[]) => setPicked(new Set(ids)),
		toggle,
		selectAll: (ids: number[], on: boolean) =>
			setPicked(new Set(on ? ids : [])),
	};
}

export function useCollectionFetch() {
	const runFetch = useServerFn(fetchCollection);
	const form = useFetchFields();
	const [games, setGames] = useState<CollectionGame[]>([]);
	const [total, setTotal] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const pick = usePicked();

	const fetch = async (e: FormEvent) => {
		e.preventDefault();
		setBusy(true);
		setError(null);
		try {
			const res = await runFetch({ data: form.query() });
			setGames(res.games);
			setTotal(res.total);
			pick.select(res.games.map((g) => g.id));
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};

	return {
		fields: form.fields,
		setters: form.setters,
		games,
		total,
		picked: pick.picked,
		error,
		busy,
		fetch,
		toggle: pick.toggle,
		selectAll: (on: boolean) =>
			pick.selectAll(
				games.map((g) => g.id),
				on,
			),
	};
}

export function useRoomCreate(games: CollectionGame[], picked: Set<number>) {
	const navigate = useNavigate();
	const runCreate = useServerFn(createRoom);
	const [host, setHost] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const create = async () => {
		const deck = games
			.filter((g) => picked.has(g.id))
			.map((g) => ({
				id: g.id,
				name: g.name,
				thumbnail: g.thumbnail,
				image: g.image,
			}));
		if (deck.length === 0 || !host.trim()) return;
		setBusy(true);
		setError(null);
		try {
			const room = await runCreate({ data: { deck } });
			await navigate({
				to: "/rooms/$code",
				params: { code: room.code },
				search: { name: host.trim() },
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setBusy(false);
		}
	};

	return {
		host,
		setHost,
		error,
		busy,
		ready: picked.size > 0 && host.trim() !== "",
		create,
	};
}
