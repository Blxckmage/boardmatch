import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { JoinForm, Lobby, MatchOverlay } from "#/components/room-views";
import { SwipeDeck } from "#/components/swipe-deck";
import type { Direction } from "#/components/swipe-deck";
import type {
	ClientMsg,
	GameCard,
	RoomPlayer,
	ServerMsg,
} from "#/server/room-protocol";

export const Route = createFileRoute("/rooms/$code")({
	validateSearch: (search: Record<string, unknown>) => ({
		name: typeof search.name === "string" ? search.name : undefined,
	}),
	component: RoomPage,
});

type Phase = "name" | "joining" | "lobby" | "deck" | "error";

type JoinedInfo = {
	you: string;
	deck: GameCard[];
	players: RoomPlayer[];
	host: string | null;
	started: boolean;
};

type RoomEvents = {
	onJoined: (info: JoinedInfo) => void;
	onPlayers: (players: RoomPlayer[], host: string | null) => void;
	onStart: (deck: GameCard[]) => void;
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
		if (msg.type === "joined")
			events.onJoined({
				you: msg.you,
				deck: msg.deck,
				players: msg.players,
				host: msg.host,
				started: msg.started,
			});
		else if (msg.type === "players") events.onPlayers(msg.players, msg.host);
		else if (msg.type === "start") events.onStart(msg.deck);
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

type LobbySetters = {
	setPhase: (phase: Phase) => void;
	setYou: (id: string) => void;
	setHost: (host: string | null) => void;
	setPlayers: (players: RoomPlayer[]) => void;
	setDeck: (deck: GameCard[]) => void;
	setMatch: (game: GameCard) => void;
	setProblem: (problem: string | null) => void;
};

function joinEvents(s: LobbySetters): RoomEvents {
	return {
		onJoined: (info) => {
			s.setYou(info.you);
			s.setHost(info.host);
			s.setPlayers(info.players);
			if (info.started) {
				s.setDeck(info.deck);
				s.setPhase("deck");
			} else {
				s.setDeck([]);
				s.setPhase("lobby");
			}
		},
		onPlayers: (nextPlayers, nextHost) => {
			s.setPlayers(nextPlayers);
			s.setHost(nextHost);
		},
		onStart: (nextDeck) => {
			s.setDeck(nextDeck);
			s.setPhase("deck");
		},
		onMatch: s.setMatch,
		onError: () => {
			s.setProblem("Connection failed — the room needs workerd.");
			s.setPhase("error");
		},
	};
}

function useLobbyState() {
	const [players, setPlayers] = useState<RoomPlayer[]>([]);
	const [host, setHost] = useState<string | null>(null);
	const [you, setYou] = useState<string | null>(null);
	const [deck, setDeck] = useState<GameCard[]>([]);
	const [match, setMatch] = useState<GameCard | null>(null);
	return {
		players,
		setPlayers,
		host,
		setHost,
		you,
		setYou,
		deck,
		setDeck,
		match,
		setMatch,
	};
}

function useRoomChannel() {
	const socket = useRef<WebSocket | null>(null);

	useEffect(
		() => () => {
			socket.current?.close();
			socket.current = null;
		},
		[],
	);

	const send = (msg: ClientMsg) => {
		socket.current?.send(JSON.stringify(msg));
	};

	const swipe = (gameId: number, direction: Direction) => {
		send({ type: "swipe", gameId, direction });
	};

	const start = () => {
		send({ type: "start" });
	};

	return { socket, swipe, start };
}

function useRoomConnection(code: string, autoName?: string) {
	const [phase, setPhase] = useState<Phase>("name");
	const [name, setName] = useState("");
	const [problem, setProblem] = useState<string | null>(null);
	const lobby = useLobbyState();
	const { players, host, you, deck, match } = lobby;
	const { setPlayers, setHost, setYou, setDeck, setMatch } = lobby;
	const channel = useRoomChannel();

	const join = (asName?: string) => {
		const trimmed = (asName ?? name).trim();
		if (!trimmed) return;
		setPhase("joining");
		setProblem(null);
		channel.socket.current = connectRoom(
			code,
			trimmed,
			joinEvents({
				setPhase,
				setYou,
				setHost,
				setPlayers,
				setDeck,
				setMatch,
				setProblem,
			}),
		);
	};

	useAutoJoin(autoName, join);

	return {
		phase,
		problem,
		name,
		players,
		host,
		you,
		deck,
		match,
		setName,
		join,
		swipe: channel.swipe,
		start: channel.start,
	};
}

function RoomPage() {
	const { code } = Route.useParams();
	const { name: autoName } = Route.useSearch();
	const {
		phase,
		problem,
		name,
		players,
		host,
		you,
		deck,
		match,
		setName,
		join,
		swipe,
		start,
	} = useRoomConnection(code, autoName);

	return (
		<div className="py-12 md:py-16">
			<PhaseView
				phase={phase}
				problem={problem}
				name={name}
				busy={phase === "joining"}
				deck={deck}
				players={players}
				host={host}
				you={you}
				onName={setName}
				onJoin={join}
				onSwipe={swipe}
				onStart={start}
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
	players,
	host,
	you,
	onName,
	onJoin,
	onSwipe,
	onStart,
}: {
	phase: Phase;
	problem: string | null;
	name: string;
	busy: boolean;
	deck: GameCard[];
	players: RoomPlayer[];
	host: string | null;
	you: string | null;
	onName: (v: string) => void;
	onJoin: () => void;
	onSwipe: (gameId: number, direction: "left" | "right") => void;
	onStart: () => void;
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
	if (phase === "lobby") {
		return <Lobby players={players} host={host} you={you} onStart={onStart} />;
	}
	return <SwipeDeck deck={deck} onSwipe={onSwipe} />;
}
