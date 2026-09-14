import type { Phase } from "#/components/room-views";
import type { GameCard, RoomPlayer, ServerMsg } from "#/server/room-protocol";

type JoinedInfo = {
	you: string;
	deck: GameCard[];
	players: RoomPlayer[];
	host: string | null;
	started: boolean;
};

export type RoomEvents = {
	onJoined: (info: JoinedInfo) => void;
	onPlayers: (players: RoomPlayer[], host: string | null) => void;
	onStart: (deck: GameCard[]) => void;
	onMatch: (game: GameCard) => void;
	onRefused: () => void;
	onClose: (code: number, reason: string) => void;
	onError: () => void;
};

const wsUrl = (code: string) => {
	const proto = window.location.protocol === "https:" ? "wss" : "ws";
	return `${proto}://${window.location.host}/api/rooms/${code}`;
};

const connectRoom = (
	code: string,
	name: string,
	claimId: string | undefined,
	events: RoomEvents,
) => {
	const ws = new WebSocket(wsUrl(code));
	ws.addEventListener("open", () => {
		ws.send(JSON.stringify({ type: "join", name, claimId }));
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
		else if (msg.type === "refused") events.onRefused();
	});
	ws.addEventListener("close", (event) => {
		events.onClose(event.code, event.reason);
	});
	ws.addEventListener("error", events.onError);
	return ws;
};

export type LobbySetters = {
	code: string;
	setPhase: (phase: Phase) => void;
	setYou: (id: string) => void;
	setHost: (host: string | null) => void;
	setPlayers: (players: RoomPlayer[]) => void;
	setDeck: (deck: GameCard[]) => void;
	setMatch: (game: GameCard) => void;
	setProblem: (problem: string | null) => void;
	markSettled: () => void;
	isSettled: () => boolean;
};

function joinEvents(s: LobbySetters): RoomEvents {
	return {
		onJoined: (info) => {
			s.markSettled();
			sessionStorage.setItem(`bm-seat:${s.code}`, info.you);
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
		onRefused: () => {
			s.markSettled();
			s.setProblem("Game already started — no late joins.");
			s.setPhase("error");
		},
		onClose: (_code, reason) => {
			if (s.isSettled()) {
				s.setProblem("Connection lost — rejoin your seat.");
				s.setPhase("error");
				return;
			}
			s.markSettled();
			s.setProblem(reason || "Connection closed before joining.");
			s.setPhase("error");
		},
		onError: () => {
			s.setProblem("Connection failed — the room needs workerd.");
			s.setPhase("error");
		},
	};
}

export type JoinSetters = Omit<LobbySetters, "markSettled" | "isSettled">;

export function openRoomSocket(
	code: string,
	name: string,
	claimId: string | undefined,
	s: JoinSetters,
) {
	let done = false;
	return connectRoom(
		code,
		name,
		claimId,
		joinEvents({
			...s,
			markSettled: () => {
				done = true;
			},
			isSettled: () => done,
		}),
	);
}
