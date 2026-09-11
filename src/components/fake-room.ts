import { useEffect, useRef, useState } from "react";

import { checkMatch } from "#/server/room-protocol";
import type { GameCard, RoomPlayer } from "#/server/room-protocol";
import { FIXTURE_DECK } from "#/components/dev-fixtures";

function useLater() {
	const timers = useRef<number[]>([]);

	useEffect(
		() => () => {
			for (const t of timers.current) clearTimeout(t);
		},
		[],
	);

	const later = (ms: number, fn: () => void) => {
		timers.current.push(window.setTimeout(fn, ms));
	};
	const clear = () => {
		for (const t of timers.current) clearTimeout(t);
		timers.current = [];
	};
	return { later, clear };
}

type PlayerSetter = (update: (prev: RoomPlayer[]) => RoomPlayer[]) => void;

function rosterOps(
	host: string | null,
	setPlayers: PlayerSetter,
	setHost: (host: string | null) => void,
) {
	const arrive = (p: RoomPlayer) => {
		setPlayers((prev) =>
			prev.some((q) => q.id === p.id) ? prev : [...prev, p],
		);
	};

	const dropPlayer = (id: string, players: RoomPlayer[]) => {
		const next = players.filter((p) => p.id !== id);
		setPlayers(() => next);
		if (host === id) setHost(next[0]?.id ?? null);
	};

	const addLateJoiner = () => {
		const id = `dave-${Date.now()}`;
		setPlayers((prev) => [...prev, { id, name: "dave (late)" }]);
	};

	return { arrive, dropPlayer, addLateJoiner };
}

export function useFakeRoster() {
	const [players, setPlayers] = useState<RoomPlayer[]>([]);
	const [host, setHost] = useState<string | null>(null);
	const [you, setYou] = useState<string | null>(null);
	const { later, clear } = useLater();
	const ops = rosterOps(host, setPlayers, setHost);

	const joinAs = (display: string, asHost: boolean): string | null => {
		const trimmed = display.trim();
		if (!trimmed) return null;
		const id = `you-${Date.now()}`;
		setYou(id);
		if (asHost) {
			setHost(id);
			setPlayers([{ id, name: trimmed }]);
			later(2000, () => ops.arrive({ id: "bob", name: "bob" }));
			later(5000, () => ops.arrive({ id: "cara", name: "cara" }));
		} else {
			setHost("ann");
			setPlayers([
				{ id: "ann", name: "ann" },
				{ id: "bob", name: "bob" },
				{ id, name: trimmed },
			]);
		}
		return id;
	};

	const dropPlayer = (id: string) => {
		ops.dropPlayer(id, players);
	};

	const resetRoster = () => {
		clear();
		setPlayers([]);
		setHost(null);
		setYou(null);
	};

	return {
		players,
		host,
		you,
		joinAs,
		dropPlayer,
		addLateJoiner: ops.addLateJoiner,
		resetRoster,
	};
}

export function useFakeMatch(players: RoomPlayer[], you: string | null) {
	const [match, setMatch] = useState<GameCard | null>(null);
	const likes = useRef(new Map<number, Set<string>>());

	const recordLike = (gameId: number) => {
		if (!you) return;
		const set = likes.current.get(gameId) ?? new Set<string>();
		set.add(you);
		likes.current.set(gameId, set);
		const voters = players.map((p) => p.id);
		const likedBy = [...set].filter((id) => voters.includes(id));
		const found = checkMatch(FIXTURE_DECK, gameId, likedBy, voters);
		if (found) setMatch(found);
	};

	const forceMatch = () => {
		for (const game of FIXTURE_DECK) {
			const set = likes.current.get(game.id) ?? new Set<string>();
			for (const p of players) {
				if (p.id !== you) set.add(p.id);
			}
			likes.current.set(game.id, set);
		}
	};

	const resetMatch = () => {
		likes.current.clear();
		setMatch(null);
	};

	return { match, recordLike, forceMatch, resetMatch };
}
