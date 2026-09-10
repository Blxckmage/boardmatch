import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "#/components/ui";
import { SwipeDeck, type Direction } from "#/components/swipe-deck";
import { FIXTURE_DECK } from "#/components/dev-fixtures";

export const Route = createFileRoute("/dev/swipe")({
	beforeLoad: () => {
		if (!import.meta.env.DEV) throw notFound();
	},
	component: SwipeRig,
});

type Logged = { n: number; game: string; direction: Direction };

function SwipeRig() {
	const [run, setRun] = useState(0);
	const [log, setLog] = useState<Logged[]>([]);

	return (
		<div className="py-12">
			<p className="font-mono text-xs uppercase tracking-[1.8px] text-mint">
				/dev/swipe — no backend
			</p>
			<SwipeDeck
				key={run}
				deck={FIXTURE_DECK}
				onSwipe={(id, direction) => {
					const game = FIXTURE_DECK.find((g) => g.id === id);
					setLog((l) => [
						...l,
						{ n: l.length + 1, game: game?.name ?? String(id), direction },
					]);
				}}
			/>
			<div className="mt-6">
				<Button
					variant="secondary"
					onClick={() => {
						setRun((r) => r + 1);
						setLog([]);
					}}
				>
					Re-deal
				</Button>
			</div>
			<ul className="mt-6 space-y-1">
				{log.map((entry) => (
					<li
						key={entry.n}
						className="font-mono text-[11px] uppercase tracking-[1.1px] text-fog"
					>
						{entry.n}. {entry.game} — {entry.direction}
					</li>
				))}
			</ul>
		</div>
	);
}
