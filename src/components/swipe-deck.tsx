import { useEffect, useState } from "react";

import { Button, PillTag } from "#/components/ui";
import type { GameCard } from "#/server/room-protocol";

export type Direction = "left" | "right";

export function SwipeDeck({
	deck,
	onSwipe,
}: {
	deck: GameCard[];
	onSwipe: (gameId: number, direction: Direction) => void;
}) {
	const [index, setIndex] = useState(0);
	const game = deck[index];

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const current = deck[index];
			if (!current) return;
			if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
				onSwipe(current.id, e.key === "ArrowRight" ? "right" : "left");
				setIndex((i) => i + 1);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	if (!game) {
		return (
			<p className="font-mono mt-8 text-xs uppercase tracking-[1.8px] text-fog">
				You&apos;ve swiped everything — waiting on the room.
			</p>
		);
	}

	return (
		<DeckCard
			game={game}
			position={index + 1}
			total={deck.length}
			onCast={(direction) => {
				onSwipe(game.id, direction);
				setIndex((i) => i + 1);
			}}
		/>
	);
}

function DeckCard({
	game,
	position,
	total,
	onCast,
}: {
	game: GameCard;
	position: number;
	total: number;
	onCast: (direction: Direction) => void;
}) {
	return (
		<div className="mt-8 max-w-sm">
			<PillTag tone="mint">
				{position} of {total}
			</PillTag>
			<div className="rounded-tile mt-4 border border-white bg-canvas p-6">
				{game.thumbnail ? (
					<img
						src={game.thumbnail}
						alt=""
						className="h-48 w-full rounded-[4px] border border-white/20 object-cover"
					/>
				) : null}
				<h3 className="mt-4 font-sans text-2xl font-bold leading-none text-white">
					{game.name}
				</h3>
				<div className="mt-6 flex gap-3">
					<Button variant="secondary" onClick={() => onCast("left")}>
						Skip
					</Button>
					<Button variant="primary" onClick={() => onCast("right")}>
						I&apos;d play this
					</Button>
				</div>
			</div>
		</div>
	);
}
