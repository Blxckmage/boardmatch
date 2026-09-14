import { describe, expect, test } from "bun:test";

import {
	activeVoters,
	checkMatch,
	graceExpired,
	GRACE_MS,
} from "./room-protocol";
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

describe("grace", () => {
	test("expiry is GRACE_MS after leaving", () => {
		expect(graceExpired(1000, 1000)).toBe(false);
		expect(graceExpired(1000 + GRACE_MS - 1, 1000)).toBe(false);
		expect(graceExpired(1000 + GRACE_MS, 1000)).toBe(true);
	});

	test("seated and in-grace voters count, expired do not", () => {
		const left = new Map([
			["b", 1000],
			["c", 1000 - GRACE_MS],
		]);
		expect(activeVoters(["a", "b", "c"], left, 1000)).toEqual(["a", "b"]);
	});
});
