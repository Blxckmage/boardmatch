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
			<p className="font-mono text-xs uppercase tracking-[1.8px] text-mint">
				Swipe &middot; Match &middot; Play
			</p>
			<h1 className="font-display mt-4 text-6xl leading-display text-white md:text-8xl">
				BOARDMATCH
			</h1>
			<p className="mt-4 max-w-xl font-sans text-[19px] font-light tracking-[1.9px] text-bone">
				One deck, one group, one game tonight.
			</p>

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

			<section className="mt-12 grid gap-6 md:grid-cols-2">
				<Field label="BGG username" placeholder="e.g. faza" />
				<Field
					label="Room code"
					placeholder="e.g. KX7Q"
					error="Room not found — check the code"
				/>
			</section>

			<CollectionSection />
		</div>
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
			const toNum = (v: string) => (v.trim() === "" ? undefined : Number(v));
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
			<p className="font-mono text-xs uppercase tracking-[1.8px] text-mint">
				Host setup
			</p>
			<h2 className="mt-2 font-sans text-2xl font-bold text-white">
				Fetch a BGG collection
			</h2>
			<form onSubmit={submit} className="mt-6 grid gap-6 md:grid-cols-3">
				<Field
					label="BGG username"
					placeholder="e.g. Blxckmage"
					value={username}
					onChange={(e) => setUsername(e.target.value)}
				/>
				<Field
					label="Players"
					type="number"
					min={1}
					placeholder="e.g. 4"
					value={players}
					onChange={(e) => setPlayers(e.target.value)}
				/>
				<Field
					label="Max minutes"
					type="number"
					min={1}
					placeholder="e.g. 60"
					value={maxPlaytime}
					onChange={(e) => setMaxPlaytime(e.target.value)}
				/>
			</form>
			<div className="mt-6">
				<Button variant="secondary" disabled={busy} onClick={submit}>
					{busy ? "Fetching…" : "Fetch collection"}
				</Button>
			</div>
			{error ? (
				<p className="font-mono mt-6 text-xs uppercase tracking-[1.5px] text-white">
					{error}
				</p>
			) : null}
			{total !== null && !error ? (
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
									{game.playtime !== undefined
										? ` · ${game.playtime} min`
										: null}
								</p>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</section>
	);
}
