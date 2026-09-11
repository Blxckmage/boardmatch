import { createServerFn } from "@tanstack/react-start";
import * as Effect from "effect/Effect";
import { z } from "zod";
import { getEnv } from "#/cf-env";
import { fetchUserCollection, filterCollection, makeClient } from "./bgg";

export type { CollectionGame } from "./bgg";

const collectionQuery = z.object({
	username: z.string().trim().min(1),
	players: z.number().int().positive().optional(),
	maxPlaytime: z.number().int().positive().optional(),
});

export const fetchCollection = createServerFn({ method: "POST" })
	.validator(collectionQuery)
	.handler(async ({ data }) => {
		const token = await getEnv().then(
			(env) => env.BGG_TOKEN ?? process.env.BGG_TOKEN,
			() => process.env.BGG_TOKEN,
		);
		if (!token) {
			throw new Error("BGG_TOKEN is not configured");
		}
		const items = await Effect.runPromise(
			fetchUserCollection(makeClient(token), data.username),
		).catch((cause) => {
			throw new Error(`BGG collection failed: ${String(cause)}`);
		});
		return { total: items.length, games: filterCollection(items, data) };
	});
