import { useEffect, useRef, useState } from "react";

import { PillTag } from "#/components/ui";
import {
	cardTransform,
	useDragMachine,
	type Direction,
	type FlingSignal,
} from "#/components/swipe-gesture";
import type { GameCard } from "#/server/room-protocol";

export type { Direction } from "#/components/swipe-gesture";

const STAMP_PX = 100;

function useArrowKeys(onArrow: (direction: Direction) => void) {
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
				onArrow(e.key === "ArrowRight" ? "right" : "left");
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
	const [signal, setSignal] = useState<FlingSignal>(null);
	const game = deck[index];

	const cast = (id: number, direction: Direction) => {
		onSwipe(id, direction);
		setSignal(null);
		setIndex((i) => i + 1);
	};
	const castAnimated = (direction: Direction) => {
		if (!deck[index] || signal) return;
		setSignal((s) => ({ direction, n: (s?.n ?? 0) + 1 }));
	};
	useArrowKeys(castAnimated);

	if (!game) {
		return (
			<p className="font-mono mt-8 text-xs uppercase tracking-[1.8px] text-fog">
				You&apos;ve swiped everything — waiting on the room.
			</p>
		);
	}

	return (
		<div className="mx-auto mt-8 w-full max-w-sm">
			<DeckCounter left={deck.length - index} />
			<DragCard
				key={game.id}
				game={game}
				next={deck[index + 1]}
				signal={signal}
				onFling={(direction) => cast(game.id, direction)}
			/>
			<DeckButtons
				onSkip={() => castAnimated("left")}
				onPlay={() => castAnimated("right")}
			/>
		</div>
	);
}

function DeckCounter({ left }: { left: number }) {
	return <PillTag tone="mint">{left} left</PillTag>;
}

function DeckButtons({
	onSkip,
	onPlay,
}: {
	onSkip: () => void;
	onPlay: () => void;
}) {
	return (
		<div className="relative z-10 -mt-8 flex justify-center gap-6">
			<button
				type="button"
				onClick={onSkip}
				aria-label="Skip"
				className="h-16 w-16 cursor-pointer rounded-full bg-surface font-sans text-2xl font-bold text-bone"
			>
				✕
			</button>
			<button
				type="button"
				onClick={onPlay}
				aria-label="I'd play this"
				className="h-16 w-16 cursor-pointer rounded-full bg-mint font-sans text-2xl font-bold text-black"
			>
				✓
			</button>
		</div>
	);
}

function useFlingSignal(
	signal: FlingSignal,
	fling: Direction | null,
	flingTo: (direction: Direction) => void,
) {
	const seen = useRef(0);
	useEffect(() => {
		if (signal && signal.n !== seen.current && !fling) {
			seen.current = signal.n;
			flingTo(signal.direction);
		}
	});
}

function DragCard({
	game,
	next,
	signal,
	onFling,
}: {
	game: GameCard;
	next?: GameCard;
	signal: FlingSignal;
	onFling: (direction: Direction) => void;
}) {
	const { drag, fling, flingTo, onPointerDown, onPointerMove, onPointerUp } =
		useDragMachine(onFling);
	useFlingSignal(signal, fling, flingTo);
	const { transform, transition } = cardTransform(drag, fling);
	const fade = 1 - Math.min(Math.abs(drag.x) / 500, 0.35);

	return (
		<div className="relative min-h-[480px] w-full select-none [height:68dvh]">
			{next ? (
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 scale-95 opacity-60"
				>
					<CardFace game={next} />
				</div>
			) : null}
			<DraggableFace
				game={game}
				transform={transform}
				transition={transition}
				fade={fade}
				play={Math.max(0, Math.min(1, drag.x / STAMP_PX))}
				skip={Math.max(0, Math.min(1, -drag.x / STAMP_PX))}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
			/>
		</div>
	);
}

type PointerHandler = (e: React.PointerEvent<HTMLDivElement>) => void;

function DraggableFace({
	game,
	transform,
	transition,
	fade,
	play,
	skip,
	onPointerDown,
	onPointerMove,
	onPointerUp,
}: {
	game: GameCard;
	transform: string;
	transition: string;
	fade: number;
	play: number;
	skip: number;
	onPointerDown: PointerHandler;
	onPointerMove: PointerHandler;
	onPointerUp: PointerHandler;
}) {
	return (
		<div
			className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
			style={{ transform, transition, opacity: fade, willChange: "transform" }}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerUp}
		>
			<div className="h-full animate-card-pop">
				<CardFace game={game} />
			</div>
			<FlingStamps play={play} skip={skip} />
		</div>
	);
}

function CardFace({ game }: { game: GameCard }) {
	return (
		<article className="relative h-full w-full overflow-hidden rounded-tile bg-surface">
			{(game.image ?? game.thumbnail) ? (
				<img
					src={(game.image ?? game.thumbnail) as string}
					alt={`${game.name} box art`}
					draggable={false}
					className="absolute inset-0 h-full w-full object-cover"
				/>
			) : null}
			<div
				aria-hidden
				className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/80 to-transparent"
			/>
			<h3 className="absolute inset-x-0 bottom-0 p-6 pb-12 font-sans text-3xl font-bold leading-none text-white drop-shadow-lg">
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
