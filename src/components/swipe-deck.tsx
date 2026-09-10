import { useEffect, useRef, useState } from "react";

import { Button, PillTag } from "#/components/ui";
import type { GameCard } from "#/server/room-protocol";

export type Direction = "left" | "right";

const SWIPE_PX = 120;
const STAMP_PX = 100;

function useArrowKeys(
	getGame: () => GameCard | undefined,
	cast: (id: number, direction: Direction) => void,
) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const current = getGame();
			if (!current) return;
			if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
				cast(current.id, e.key === "ArrowRight" ? "right" : "left");
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});
}

export function SwipeDeck({
	deck,
	onSwipe,
}: {
	deck: GameCard[];
	onSwipe: (gameId: number, direction: Direction) => void;
}) {
	const [index, setIndex] = useState(0);
	const game = deck[index];

	const cast = (id: number, direction: Direction) => {
		onSwipe(id, direction);
		setIndex((i) => i + 1);
	};
	useArrowKeys(() => deck[index], cast);

	if (!game) {
		return (
			<p className="font-mono mt-8 text-xs uppercase tracking-[1.8px] text-fog">
				You&apos;ve swiped everything — waiting on the room.
			</p>
		);
	}

	return (
		<div className="mt-8 max-w-sm">
			<PillTag tone="mint">
				{index + 1} of {deck.length}
			</PillTag>
			<DragCard
				key={game.id}
				game={game}
				next={deck[index + 1]}
				onFling={(direction) => cast(game.id, direction)}
			/>
			<DeckButtons
				onSkip={() => cast(game.id, "left")}
				onPlay={() => cast(game.id, "right")}
			/>
		</div>
	);
}

function DeckButtons({
	onSkip,
	onPlay,
}: {
	onSkip: () => void;
	onPlay: () => void;
}) {
	return (
		<div className="mt-6 flex gap-3">
			<Button variant="secondary" onClick={onSkip}>
				Skip
			</Button>
			<Button variant="primary" onClick={onPlay}>
				I&apos;d play this
			</Button>
		</div>
	);
}

type Drag = { x: number; y: number; active: boolean };

function cardTransform(
	drag: Drag,
	fling: Direction | null,
	snapping: boolean,
): { transform: string; transition: string } {
	if (fling) {
		return {
			transform: `translate3d(${fling === "right" ? 140 : -140}vw, ${drag.y}px, 0) rotate(${
				fling === "right" ? 18 : -18
			}deg)`,
			transition: "transform 250ms linear",
		};
	}
	if (drag.active) {
		const rotation = Math.max(-10, Math.min(10, drag.x / 14));
		return {
			transform: `translate3d(${drag.x}px, ${drag.y}px, 0) rotate(${rotation}deg)`,
			transition: "none",
		};
	}
	return {
		transform: "translate3d(0, 0, 0)",
		transition: snapping ? "transform 200ms ease-out" : "none",
	};
}

function useDragMachine(onFling: (direction: Direction) => void) {
	const [drag, setDrag] = useState<Drag>({ x: 0, y: 0, active: false });
	const [fling, setFling] = useState<Direction | null>(null);
	const [snapping, setSnapping] = useState(false);
	const gesture = useRef<{ x: number; y: number; pid: number } | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
		},
		[],
	);

	const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
		const g = gesture.current;
		if (!g || g.pid !== e.pointerId) return;
		gesture.current = null;
		const dx = e.clientX - g.x;
		if (Math.abs(dx) > SWIPE_PX) {
			const direction = dx > 0 ? "right" : "left";
			setFling(direction);
			setDrag((d) => ({ ...d, active: false }));
			timer.current = setTimeout(() => onFling(direction), 250);
			return;
		}
		setSnapping(true);
		setDrag({ x: 0, y: 0, active: false });
		timer.current = setTimeout(() => setSnapping(false), 200);
	};

	const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
		if (fling) return;
		e.currentTarget.setPointerCapture(e.pointerId);
		gesture.current = { x: e.clientX, y: e.clientY, pid: e.pointerId };
		setSnapping(false);
		setDrag({ x: 0, y: 0, active: true });
	};

	const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
		const g = gesture.current;
		if (!g || g.pid !== e.pointerId) return;
		setDrag({ x: e.clientX - g.x, y: e.clientY - g.y, active: true });
	};

	return { drag, fling, snapping, onPointerDown, onPointerMove, onPointerUp };
}

function DragCard({
	game,
	next,
	onFling,
}: {
	game: GameCard;
	next?: GameCard;
	onFling: (direction: Direction) => void;
}) {
	const { drag, fling, snapping, onPointerDown, onPointerMove, onPointerUp } =
		useDragMachine(onFling);
	const { transform, transition } = cardTransform(drag, fling, snapping);

	return (
		<div className="relative mt-4 min-h-[420px] w-full select-none [height:62dvh]">
			{next ? (
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 scale-95 opacity-60"
				>
					<CardFace game={next} />
				</div>
			) : null}
			<div
				className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
				style={{ transform, transition, willChange: "transform" }}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
			>
				<div className="h-full animate-card-pop">
					<CardFace game={game} />
				</div>
				<FlingStamps
					play={Math.max(0, Math.min(1, drag.x / STAMP_PX))}
					skip={Math.max(0, Math.min(1, -drag.x / STAMP_PX))}
				/>
			</div>
		</div>
	);
}

function CardFace({ game }: { game: GameCard }) {
	return (
		<article className="flex h-full w-full flex-col overflow-hidden rounded-tile border border-white bg-canvas p-4">
			{game.thumbnail ? (
				<img
					src={game.thumbnail}
					alt={`${game.name} box art`}
					draggable={false}
					className="h-[70%] w-full rounded-[4px] object-cover"
				/>
			) : null}
			<h3 className="mt-4 font-sans text-[28px] font-bold leading-tight text-white">
				{game.name}
			</h3>
		</article>
	);
}

function FlingStamps({ play, skip }: { play: number; skip: number }) {
	return (
		<>
			<span
				aria-hidden
				className="font-mono pointer-events-none absolute left-6 top-10 rounded-[10px] border-4 border-dashed border-black bg-mint px-6 py-2.5 text-5xl font-bold uppercase leading-none tracking-[5px] text-black"
				style={{
					transform: `rotate(-14deg) scale(${0.75 + play * 0.3})`,
					opacity: play,
				}}
			>
				Play
			</span>
			<span
				aria-hidden
				className="font-mono pointer-events-none absolute right-6 top-10 rounded-[10px] border-4 border-dashed border-bone bg-uv px-6 py-2.5 text-5xl font-bold uppercase leading-none tracking-[5px] text-white"
				style={{
					transform: `rotate(14deg) scale(${0.75 + skip * 0.3})`,
					opacity: skip,
				}}
			>
				Skip
			</span>
		</>
	);
}
