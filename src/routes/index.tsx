import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { type FormEvent, useState } from "react";

import { Button, Field, PillTag, StoryTile } from "#/components/ui";
import {
	type CollectionGame,
	fetchCollection,
} from "#/server/collection.functions";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<div className="py-12 md:py-16">
			<SiteHero />
			<PrimitiveDemos />
			<TileFeed />
			<DemoFields />
			<CollectionSection />
		</div>
	);
}

function SiteHero() {
	return (
		<>
			<p className="font-mono text-xs uppercase tracking-[1.8px] text-mint">
				Swipe &middot; Match &middot; Play
			</p>
			<h1 className="font-display mt-4 text-6xl leading-display text-white md:text-8xl">
				BOARDMATCH
			</h1>
			<p className="mt-4 max-w-xl font-sans text-[19px] font-light tracking-[1.9px] text-bone">
				One deck, one group, one game tonight.
			</p>
		</>
	);
}

function PrimitiveDemos() {
	return (
		<>
			<section className="mt-10 flex flex-wrap gap-3">
				<Button variant="primary">Create room</Button>
				<Button variant="secondary">How it works</Button>
				<Button variant="tertiary">Join room</Button>
				<Button variant="uv">Go ultraviolet</Button>
			</section>
			<section className="mt-8 flex flex-wrap gap-2">
				<PillTag tone="mint">Tonight</PillTag>
				<PillTag tone="uv">4 players</PillTag>
				<PillTag tone="slate">60 min</PillTag>
				<PillTag tone="white">Match found</PillTag>
			</section>
		</>
	);
}

function TileFeed() {
	return (
		<section className="mt-12 space-y-4 border-l border-rule pl-6">
			<StoryTile
				timestamp="Just now"
				kicker="Room opened"
				title="Faza started a room for 4"
				deck="Waiting on 3 more players to join with a display name. No accounts, no invites."
			/>
			<StoryTile
				timestamp="2 min ago"
				kicker="Match found"
				title="Tonight you're playing: Brass Birmingham"
				tone="mint"
			/>
			<StoryTile
				timestamp="Last night"
				kicker="Room closed"
				title="5 players agreed on Azul in 11 swipes"
				tone="uv"
			/>
		</section>
	);
}

function DemoFields() {
	return (
		<section className="mt-12 grid gap-6 md:grid-cols-2">
			<Field label="BGG username" placeholder="e.g. faza" />
			<Field
				label="Room code"
				placeholder="e.g. KX7Q"
				error="Room not found — check the code"
			/>
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
		<section className="mt-12">
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
			{!error && total !== null && <ResultsList games={games} total={total} />}
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
