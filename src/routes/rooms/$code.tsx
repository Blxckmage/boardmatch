import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { openRoomSocket } from "#/components/room-channel";
import { MatchOverlay, PhaseView } from "#/components/room-views";
import type { Direction } from "#/components/swipe-deck";
import type { Phase } from "#/components/room-views";
import type { ClientMsg } from "#/server/room-protocol";
import type { GameCard, RoomPlayer } from "#/server/room-protocol";

export const Route = createFileRoute("/rooms/$code")({
	validateSearch: (search: Record<string, unknown>) => ({
		name: typeof search.name === "string" ? search.name : undefined,
	}),
	component: RoomPage,
});

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
		channel.socket.current = openRoomSocket(
			code,
			trimmed,
			you ?? sessionStorage.getItem(`bm-seat:${code}`) ?? undefined,
			{
				code,
				setPhase,
				setYou,
				setHost,
				setPlayers,
				setDeck,
				setMatch,
				setProblem,
			},
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
				code={code}
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
