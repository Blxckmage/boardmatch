import type { GameCard, RoomPlayer } from "#/server/room-protocol";

// NOTE: dev-rig fixtures only — never fetched, never persisted.
export const FIXTURE_DECK: GameCard[] = [
	{ id: 101, name: "Azul" },
	{ id: 102, name: "Brass: Birmingham" },
	{ id: 103, name: "Codenames" },
	{ id: 104, name: "Splendor" },
	{ id: 105, name: "Ticket to Ride" },
	{ id: 106, name: "Catan" },
];

export const FIXTURE_PLAYERS: RoomPlayer[] = [
	{ id: "host-1", name: "ann" },
	{ id: "p-2", name: "bob" },
	{ id: "p-3", name: "cara" },
];

export const FIXTURE_HOST = "host-1";
