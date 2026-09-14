import { checkMatch, makeRoomCode } from "#/server/room-protocol";
import type { GameCard } from "#/server/room-protocol";

export type SimUser = {
	id: string;
	name: string;
	host: boolean;
	fake: boolean;
	likes: number[];
	swiped: number;
	kicked: boolean;
};

export type SimRoom = {
	code: string;
	deck: GameCard[];
	started: boolean;
	match: GameCard | null;
	noMatch: boolean;
	notice: string | null;
	users: SimUser[];
};

export const createRoomState = (
	hostName: string,
	deck: GameCard[],
): SimRoom | null => {
	const name = hostName.trim();
	if (!name) return null;
	const id = `you-${Date.now()}`;
	return {
		code: makeRoomCode(),
		deck,
		started: false,
		match: null,
		noMatch: false,
		notice: null,
		users: [
			{
				id,
				name,
				host: true,
				fake: false,
				likes: [],
				swiped: 0,
				kicked: false,
			},
		],
	};
};

export const joinUser = (
	room: SimRoom,
	display: string,
	code: string,
): SimRoom | null => {
	const name = display.trim();
	if (!name) return null;
	if (code.trim().toUpperCase() !== room.code) {
		return { ...room, notice: "room not found — check the code" };
	}
	if (room.started) {
		return { ...room, notice: "game already started — late join refused" };
	}
	const id = `you-${Date.now()}`;
	return {
		...room,
		notice: null,
		users: [
			...room.users,
			{
				id,
				name,
				host: false,
				fake: false,
				likes: [],
				swiped: 0,
				kicked: false,
			},
		],
	};
};

export const startRoom = (room: SimRoom): SimRoom => ({
	...room,
	started: true,
});

export const applySwipe = (
	room: SimRoom,
	userId: string,
	gameId: number,
	direction: "left" | "right",
): SimRoom => ({
	...room,
	users: room.users.map((u) =>
		u.id !== userId || u.kicked
			? u
			: Object.assign({}, u, {
					swiped: u.swiped + 1,
					likes: direction === "right" ? [...u.likes, gameId] : u.likes,
				}),
	),
});

export const kickUser = (room: SimRoom, id: string): SimRoom => {
	const users = room.users.map((u) =>
		u.id === id ? Object.assign({}, u, { kicked: true }) : u,
	);
	const active = users.filter((u) => !u.kicked);
	const hostGone = !active.some((u) => u.host);
	return {
		...room,
		users: users.map((u, _, arr) =>
			hostGone
				? Object.assign({}, u, {
						host: u.id === arr.find((v) => !v.kicked)?.id,
					})
				: u,
		),
	};
};

export const addFakeUser = (room: SimRoom): SimRoom => {
	const n = room.users.filter((u) => u.fake).length + 1;
	const id = `fake-${Date.now()}`;
	return {
		...room,
		users: [
			...room.users,
			{
				id,
				name: `bot-${n}`,
				host: false,
				fake: true,
				likes: [],
				swiped: 0,
				kicked: false,
			},
		],
	};
};

// NOTE: null = still swiping; a game = unanimous agreement in deck order.
export const evaluateRoom = (
	room: SimRoom,
	deck: GameCard[],
): GameCard | null => {
	const active = room.users.filter((u) => !u.kicked);
	if (!room.started || active.length === 0) return null;
	if (active.some((u) => u.swiped < deck.length)) return null;
	const voters = active.map((u) => u.id);
	for (const game of deck) {
		const likedBy = active
			.filter((u) => u.likes.includes(game.id))
			.map((u) => u.id);
		const found = checkMatch(deck, game.id, likedBy, voters);
		if (found) return found;
	}
	return null;
};

export const roomDone = (room: SimRoom, deck: GameCard[]): boolean => {
	const active = room.users.filter((u) => !u.kicked);
	return (
		room.started &&
		active.length > 0 &&
		active.every((u) => u.swiped >= deck.length)
	);
};
