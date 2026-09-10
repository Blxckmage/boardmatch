import { createFileRoute } from "@tanstack/react-router";

import { Button, Field, PillTag, StoryTile } from "#/components/ui";

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
		</div>
	);
}
