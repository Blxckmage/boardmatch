import { describe, expect, test } from "bun:test";

import { checkMatch } from "./room-protocol";
import type { GameCard } from "./room-protocol";

const deck: GameCard[] = [
	{ id: 1, name: "Azul" },
	{ id: 2, name: "Brass" },
];

describe("checkMatch", () => {
	test("full agreement returns the game", () => {
		expect(checkMatch(deck, 1, ["a", "b"], ["a", "b"])).toEqual({
			id: 1,
			name: "Azul",
		});
	});

	test("one holdout means no match", () => {
		expect(checkMatch(deck, 1, ["a"], ["a", "b"])).toBeNull();
	});

	test("empty room cannot match", () => {
		expect(checkMatch(deck, 1, [], [])).toBeNull();
	});

	test("unknown game never matches", () => {
		expect(checkMatch(deck, 9, ["a", "b"], ["a", "b"])).toBeNull();
	});

	test("likes from left players do not count", () => {
		expect(checkMatch(deck, 1, ["a", "b", "ghost"], ["a", "b"])).toEqual({
			id: 1,
			name: "Azul",
		});
	});
});
