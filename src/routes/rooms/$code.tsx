import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button, Field } from "#/components/ui";
import { SwipeDeck, type Direction } from "#/components/swipe-deck";
import type { GameCard, ServerMsg } from "#/server/room-protocol";

export const Route = createFileRoute("/rooms/$code")({
	validateSearch: (search: Record<string, unknown>) => ({
		name: typeof search.name === "string" ? search.name : undefined,
	}),
	component: RoomPage,
});

type Phase = "name" | "joining" | "room" | "error";

type RoomEvents = {
	onJoined: (deck: GameCard[], players: string[]) => void;
	onPlayers: (players: string[]) => void;
	onMatch: (game: GameCard) => void;
	onError: () => void;
};

const wsUrl = (code: string) => {
	const proto = window.location.protocol === "https:" ? "wss" : "ws";
	return `${proto}://${window.location.host}/api/rooms/${code}`;
};

const connectRoom = (code: string, name: string, events: RoomEvents) => {
	const ws = new WebSocket(wsUrl(code));
	ws.addEventListener("open", () => {
		ws.send(JSON.stringify({ type: "join", name }));
	});
	ws.addEventListener("message", (event) => {
		const msg = JSON.parse(event.data as string) as ServerMsg;
		if (msg.type === "joined") events.onJoined(msg.deck, msg.players);
		else if (msg.type === "players") events.onPlayers(msg.players);
		else if (msg.type === "match") events.onMatch(msg.game);
	});
	ws.addEventListener("error", events.onError);
	return ws;
};

function useAutoJoin(
	autoName: string | undefined,
	join: (asName?: string) => void,
) {
	const didAuto = useRef(false);
	useEffect(() => {
		if (autoName && !didAuto.current) {
			didAuto.current = true;
			join(autoName);
		}
	});
}

function useRoomConnection(code: string, autoName?: string) {
	const [phase, setPhase] = useState<Phase>("name");
	const [name, setName] = useState("");
	const [players, setPlayers] = useState<string[]>([]);
	const [deck, setDeck] = useState<GameCard[]>([]);
	const [match, setMatch] = useState<GameCard | null>(null);
	const [problem, setProblem] = useState<string | null>(null);
	const socket = useRef<WebSocket | null>(null);

	useEffect(
		() => () => {
			socket.current?.close();
			socket.current = null;
		},
		[],
	);

	const join = (asName?: string) => {
		const trimmed = (asName ?? name).trim();
		if (!trimmed) return;
		setPhase("joining");
		setProblem(null);
		socket.current = connectRoom(code, trimmed, {
			onJoined: (nextDeck, nextPlayers) => {
				setDeck(nextDeck);
				setPlayers(nextPlayers);
				setPhase("room");
			},
			onPlayers: setPlayers,
			onMatch: setMatch,
			onError: () => {
				setProblem("Connection failed — the room needs workerd.");
				setPhase("error");
			},
		});
	};

	useAutoJoin(autoName, join);

	const swipe = (gameId: number, direction: Direction) => {
		socket.current?.send(JSON.stringify({ type: "swipe", gameId, direction }));
	};

	return { phase, problem, name, players, deck, match, setName, join, swipe };
}

function RoomPage() {
	const { code } = Route.useParams();
	const { name: autoName } = Route.useSearch();
	const { phase, problem, name, deck, match, setName, join, swipe } =
		useRoomConnection(code, autoName);

	return (
		<div className="py-12 md:py-16">
			<PhaseView
				phase={phase}
				problem={problem}
				name={name}
				busy={phase === "joining"}
				deck={deck}
				onName={setName}
				onJoin={join}
				onSwipe={swipe}
			/>
			{match ? <MatchOverlay game={match} /> : null}
		</div>
	);
}

export function PhaseView({
	phase,
	problem,
	name,
	busy,
	deck,
	onName,
	onJoin,
	onSwipe,
}: {
	phase: Phase;
	problem: string | null;
	name: string;
	busy: boolean;
	deck: GameCard[];
	onName: (v: string) => void;
	onJoin: () => void;
	onSwipe: (gameId: number, direction: "left" | "right") => void;
}) {
	if (phase === "name" || phase === "joining") {
		return <JoinForm name={name} busy={busy} onName={onName} onJoin={onJoin} />;
	}
	if (phase === "error") {
		return (
			<p className="font-mono mt-6 text-xs uppercase tracking-[1.5px] text-white">
				{problem}
			</p>
		);
	}
	return <SwipeDeck deck={deck} onSwipe={onSwipe} />;
}

function JoinForm({
	name,
	busy,
	onName,
	onJoin,
}: {
	name: string;
	busy: boolean;
	onName: (v: string) => void;
	onJoin: () => void;
}) {
	return (
		<form
			className="mt-6 max-w-sm"
			onSubmit={(e) => {
				e.preventDefault();
				onJoin();
			}}
		>
			<Field
				label="Display name"
				placeholder="e.g. Faza"
				value={name}
				onChange={(e) => onName(e.target.value)}
			/>
			<div className="mt-6">
				<Button type="submit" variant="primary" disabled={busy || !name.trim()}>
					{busy ? "Joining…" : "Join room"}
				</Button>
			</div>
		</form>
	);
}

const CONFETTI_TONES = ["#3cffd0", "#5200ff", "#ffffff"];

function Confetti() {
	const pieces = useMemo(
		() =>
			Array.from({ length: 28 }, (_, i) => ({
				left: (i * 37) % 100,
				delay: (i % 7) * 0.35,
				duration: 2.4 + (i % 5) * 0.4,
				tone: CONFETTI_TONES[i % CONFETTI_TONES.length],
			})),
		[],
	);
	return (
		<>
			<style>{`@keyframes bm-fall{to{transform:translateY(110vh) rotate(540deg)}}`}</style>
			{pieces.map((p, i) => (
				<span
					// NOTE: decorative only, stable order
					key={i}
					className="absolute top-[-5vh] h-3 w-2"
					style={{
						left: `${p.left}%`,
						background: p.tone,
						animation: `bm-fall ${p.duration}s linear ${p.delay}s infinite`,
					}}
				/>
			))}
		</>
	);
}

export function MatchOverlay({ game }: { game: GameCard }) {
	return (
		<div className="fixed inset-0 z-50 overflow-hidden bg-black/80">
			<Confetti />
			<div className="relative mx-auto mt-24 max-w-md rounded-tile border border-transparent bg-mint p-8 text-center md:p-10">
				<p className="font-mono text-xs uppercase tracking-[1.8px] text-black">
					Match found
				</p>
				{(game.image ?? game.thumbnail) ? (
					<img
						src={(game.image ?? game.thumbnail) as string}
						alt=""
						className="mx-auto mt-6 h-40 rounded-[4px] border border-black/20 object-cover"
					/>
				) : null}
				<h2 className="mt-6 font-sans text-2xl font-bold leading-none text-black">
					Tonight you&apos;re playing: {game.name}
				</h2>
				<p className="font-mono mt-6 text-[11px] uppercase tracking-[1.1px] text-black/70">
					Powered by{" "}
					<a
						href="https://boardgamegeek.com"
						target="_blank"
						rel="noreferrer"
						className="underline"
					>
						BoardGameGeek
					</a>
				</p>
			</div>
		</div>
	);
}
