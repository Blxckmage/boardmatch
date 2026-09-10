import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { type FormEvent, useState } from "react";

import { Button, Field } from "#/components/ui";
import { CreateRoomButton } from "#/components/create-room-button";
import {
	type CollectionGame,
	fetchCollection,
} from "#/server/collection.functions";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<div className="py-12 md:py-16">
			<SiteHero />
			<EntryChoices />
			<CollectionSection />
		</div>
	);
}

function SiteHero() {
	return (
		<div className="text-center">
			<p className="font-mono text-xs uppercase tracking-[1.8px] text-mint">
				Swipe &middot; Match &middot; Play
			</p>
			<h1 className="font-display mt-4 text-6xl leading-display text-white md:text-8xl">
				BOARDMATCH
			</h1>
			<p className="mx-auto mt-4 max-w-xl font-sans text-[19px] font-light tracking-[1.9px] text-bone">
				One deck, one group, one game tonight.
			</p>
		</div>
	);
}

function scrollToSetup() {
	document.querySelector("#host-setup")?.scrollIntoView({ behavior: "smooth" });
}

function EntryChoices() {
	const navigate = useNavigate();
	const [code, setCode] = useState("");

	const join = (e: FormEvent) => {
		e.preventDefault();
		const trimmed = code.trim().toUpperCase();
		if (!trimmed) return;
		void navigate({ to: "/rooms/$code", params: { code: trimmed } });
	};

	return (
		<section className="mx-auto mt-12 grid max-w-2xl gap-6 md:grid-cols-2">
			<form
				onSubmit={join}
				className="rounded-tile border border-white bg-canvas p-6"
			>
				<Field
					label="Room code"
					placeholder="e.g. KX7Q2M"
					value={code}
					onChange={(e) => setCode(e.target.value)}
				/>
				<div className="mt-6">
					<Button type="submit" variant="primary" disabled={!code.trim()}>
						Join room
					</Button>
				</div>
			</form>
			<div className="rounded-tile border border-white bg-canvas p-6">
				<p className="font-sans text-lg font-bold text-white">
					Hosting tonight?
				</p>
				<p className="font-mono mt-2 text-[11px] uppercase tracking-[1.1px] text-fog">
					Fetch your collection, pick the pool
				</p>
				<div className="mt-6">
					<Button variant="secondary" onClick={scrollToSetup}>
						Create room
					</Button>
				</div>
			</div>
		</section>
	);
}

const toNum = (v: string) => (v.trim() === "" ? undefined : Number(v));

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
	return (
		<>
			<p className="font-mono text-xs uppercase tracking-[1.8px] text-mint">
				{kicker}
			</p>
			<h2 className="mt-2 font-sans text-2xl font-bold text-white">{title}</h2>
		</>
	);
}

function CollectionSection() {
	const run = useServerFn(fetchCollection);
	const [username, setUsername] = useState("");
	const [players, setPlayers] = useState("");
	const [maxPlaytime, setMaxPlaytime] = useState("");
	const [games, setGames] = useState<CollectionGame[]>([]);
	const [total, setTotal] = useState<number | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const submit = async (e: FormEvent) => {
		e.preventDefault();
		setBusy(true);
		setError(null);
		try {
			const res = await run({
				data: {
					username: username.trim(),
					players: toNum(players),
					maxPlaytime: toNum(maxPlaytime),
				},
			});
			setGames(res.games);
			setTotal(res.total);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};

	return (
		<section className="mt-12" id="host-setup">
			<SectionHeading kicker="Host setup" title="Fetch a BGG collection" />
			<CollectionForm
				busy={busy}
				onSubmit={submit}
				fields={{ username, players, maxPlaytime }}
				onField={{
					username: setUsername,
					players: setPlayers,
					maxPlaytime: setMaxPlaytime,
				}}
			/>
			<CollectionOutput error={error} games={games} total={total} />
		</section>
	);
}

type CollectionFieldValues = {
	username: string;
	players: string;
	maxPlaytime: string;
};

function CollectionForm({
	busy,
	onSubmit,
	fields,
	onField,
}: {
	busy: boolean;
	onSubmit: (e: FormEvent) => void;
	fields: CollectionFieldValues;
	onField: Record<keyof CollectionFieldValues, (v: string) => void>;
}) {
	return (
		<>
			<form onSubmit={onSubmit} className="mt-6 grid gap-6 md:grid-cols-3">
				<Field
					label="BGG username"
					placeholder="e.g. Blxckmage"
					value={fields.username}
					onChange={(e) => onField.username(e.target.value)}
				/>
				<Field
					label="Players"
					type="number"
					min={1}
					placeholder="e.g. 4"
					value={fields.players}
					onChange={(e) => onField.players(e.target.value)}
				/>
				<Field
					label="Max minutes"
					type="number"
					min={1}
					placeholder="e.g. 60"
					value={fields.maxPlaytime}
					onChange={(e) => onField.maxPlaytime(e.target.value)}
				/>
			</form>
			<div className="mt-6">
				<Button variant="secondary" disabled={busy} onClick={onSubmit}>
					{busy ? "Fetching…" : "Fetch collection"}
				</Button>
			</div>
		</>
	);
}

function CollectionOutput({
	error,
	games,
	total,
}: {
	error: string | null;
	games: CollectionGame[];
	total: number | null;
}) {
	return (
		<>
			{error && (
				<p className="font-mono mt-6 text-xs uppercase tracking-[1.5px] text-white">
					{error}
				</p>
			)}
			{!error && total !== null && (
				<>
					<ResultsList games={games} total={total} />
					<CreateRoomButton games={games} />
				</>
			)}
		</>
	);
}

function ResultsList({
	games,
	total,
}: {
	games: CollectionGame[];
	total: number;
}) {
	return (
		<div className="mt-6">
			<p className="font-mono text-xs uppercase tracking-[1.8px] text-fog">
				{games.length} of {total} games
			</p>
			<ul className="mt-4 space-y-2">
				{games.map((game) => (
					<li
						key={game.id}
						className="rounded-tile border border-white bg-canvas px-5 py-3"
					>
						<p className="font-sans text-lg font-bold text-white">
							{game.name}
						</p>
						<p className="font-mono text-[11px] uppercase tracking-[1.1px] text-fog">
							{game.minPlayers ?? "?"}–{game.maxPlayers ?? "?"} players
							{game.playtime !== undefined && ` · ${game.playtime} min`}
						</p>
					</li>
				))}
			</ul>
		</div>
	);
}
