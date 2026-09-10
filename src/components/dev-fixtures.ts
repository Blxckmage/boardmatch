import type { GameCard } from "#/server/room-protocol";

// NOTE: dev-rig fixtures only — never fetched, never persisted.
export const FIXTURE_DECK: GameCard[] = [
	{ id: 101, name: "Azul" },
	{ id: 102, name: "Brass: Birmingham" },
	{ id: 103, name: "Codenames" },
	{ id: 104, name: "Splendor" },
	{ id: 105, name: "Ticket to Ride" },
	{ id: 106, name: "Catan" },
];

export const FIXTURE_PLAYERS = ["ann", "bob", "cara"];
