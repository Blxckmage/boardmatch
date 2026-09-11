import { describe, expect, test } from "bun:test";
import type { BggCollectionItem } from "bgg-api-ts";

import { decodeEntities, filterCollection } from "./bgg";

type TextName = { "#text": string };

const item = (over: Record<string, unknown> = {}): BggCollectionItem =>
	({
		objecttype: "thing",
		objectid: 1,
		subtype: "boardgame",
		collid: 1,
		name: [{ "#text": "Azul" } as unknown as TextName],
		stats: { minplayers: 2, maxplayers: 4, playingtime: 60 },
		...over,
	}) as unknown as BggCollectionItem;

describe("decodeEntities", () => {
	test("numeric entities", () => {
		expect(decodeEntities("Aeon&#039;s End")).toBe("Aeon's End");
	});

	test("hex entities", () => {
		expect(decodeEntities("&#x41;bc")).toBe("Abc");
	});

	test("named entities", () => {
		expect(decodeEntities("Fish &amp; Chips")).toBe("Fish & Chips");
	});

	test("plain text passes through", () => {
		expect(decodeEntities("Catan")).toBe("Catan");
	});
});

describe("filterCollection", () => {
	test("keeps games in range with decoded names", () => {
		const [game] = filterCollection([item()], { players: 3, maxPlaytime: 90 });
		expect(game?.name).toBe("Azul");
		expect(game?.minPlayers).toBe(2);
	});

	test("drops out-of-range player counts", () => {
		expect(filterCollection([item()], { players: 6 })).toHaveLength(0);
	});

	test("drops over-playtime games", () => {
		expect(filterCollection([item()], { maxPlaytime: 30 })).toHaveLength(0);
	});

	test("drops games with missing stats when filtered", () => {
		const noStats = item({ stats: undefined });
		expect(filterCollection([noStats], { players: 2 })).toHaveLength(0);
	});

	test("no filters keeps everything", () => {
		expect(filterCollection([item(), item({ objectid: 2 })], {})).toHaveLength(
			2,
		);
	});

	test("nameless items are skipped", () => {
		const nameless = item({ name: [] });
		expect(filterCollection([nameless], {})).toHaveLength(0);
	});
});
