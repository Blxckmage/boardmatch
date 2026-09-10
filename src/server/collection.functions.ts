import { createServerFn } from "@tanstack/react-start";
import * as Effect from "effect/Effect";
import { z } from "zod";
import { getEnv } from "#/cf-env";
import { fetchUserCollection, makeClient } from "./bgg";

const collectionQuery = z.object({
	username: z.string().trim().min(1),
	players: z.number().int().positive().optional(),
	maxPlaytime: z.number().int().positive().optional(),
});

export type CollectionGame = {
	id: number;
	name: string;
	thumbnail?: string;
	minPlayers?: number;
	maxPlayers?: number;
	playtime?: number;
};

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
		const games: CollectionGame[] = [];
		for (const item of items) {
			const rawName = item.name[0] as
				{ value?: string; "#text"?: string } | undefined;
			const name = rawName?.value ?? rawName?.["#text"];
			if (!name) continue;
			const stats = item.stats;
			if (
				data.players !== undefined &&
				(stats?.minplayers === undefined ||
					stats?.maxplayers === undefined ||
					data.players < stats.minplayers ||
					data.players > stats.maxplayers)
			) {
				continue;
			}
			if (
				data.maxPlaytime !== undefined &&
				(stats?.playingtime === undefined ||
					stats.playingtime > data.maxPlaytime)
			) {
				continue;
			}
			games.push({
				id: item.objectid,
				name,
				thumbnail: item.thumbnail,
				minPlayers: stats?.minplayers,
				maxPlayers: stats?.maxplayers,
				playtime: stats?.playingtime,
			});
		}
		return { total: items.length, games };
	});
