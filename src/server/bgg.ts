import {
	BggClient,
	BggError,
	BggTimeoutError,
	type BggCollectionItem,
} from "bgg-api-ts";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Schedule from "effect/Schedule";

export class BggCollectionError extends Data.TaggedError("BggCollectionError")<{
	readonly status?: number;
	readonly message: string;
}> {}

const toCollectionError = (cause: unknown) =>
	cause instanceof BggTimeoutError
		? new BggCollectionError({ message: cause.message })
		: cause instanceof BggError
			? new BggCollectionError({
					status: cause.statusCode,
					message: cause.message,
				})
			: new BggCollectionError({ message: String(cause) });

const isTransient = (e: BggCollectionError) =>
	e.status === undefined || e.status === 429 || e.status >= 500;

export const fetchUserCollection = (client: BggClient, username: string) =>
	Effect.gen(function* () {
		const result = yield* Effect.tryPromise({
			try: () => client.getCollection({ username, stats: true }),
			catch: toCollectionError,
		});
		return result.items.item ?? [];
	}).pipe(
		Effect.retry({
			schedule: Schedule.recurs(2),
			while: isTransient,
		}),
	);

export const makeClient = (token: string) =>
	new BggClient("https://boardgamegeek.com/xmlapi2/", token);

export type CollectionGame = {
	id: number;
	name: string;
	thumbnail?: string;
	image?: string;
	minPlayers?: number;
	maxPlayers?: number;
	playtime?: number;
};

export type CollectionFilter = {
	players?: number;
	maxPlaytime?: number;
};

// NOTE: pure — owns the #text shape, entity decoding, and filter rules so
// bun test can cover it without a token.
export const filterCollection = (
	items: BggCollectionItem[],
	filters: CollectionFilter,
): CollectionGame[] => {
	const games: CollectionGame[] = [];
	for (const item of items) {
		const rawName = item.name[0] as
			{ value?: string; "#text"?: string } | undefined;
		const raw = rawName?.value ?? rawName?.["#text"];
		const name = raw ? decodeEntities(raw) : undefined;
		if (!name) continue;
		const stats = item.stats;
		if (
			filters.players !== undefined &&
			(stats?.minplayers === undefined ||
				stats?.maxplayers === undefined ||
				filters.players < stats.minplayers ||
				filters.players > stats.maxplayers)
		) {
			continue;
		}
		if (
			filters.maxPlaytime !== undefined &&
			(stats?.playingtime === undefined ||
				stats.playingtime > filters.maxPlaytime)
		) {
			continue;
		}
		games.push({
			id: item.objectid,
			name,
			thumbnail: item.thumbnail,
			image: item.image,
			minPlayers: stats?.minplayers,
			maxPlayers: stats?.maxplayers,
			playtime: stats?.playingtime,
		});
	}
	return games;
};

const NAMED_ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
};

// NOTE: bgg-api-ts leaves XML entities encoded in text nodes.
export const decodeEntities = (value: string): string =>
	value
		.replaceAll(/&#(\d+);/gu, (_, code: string) =>
			String.fromCodePoint(Number(code)),
		)
		.replaceAll(/&#x([0-9a-fA-F]+);/gu, (_, hex: string) =>
			String.fromCodePoint(Number.parseInt(hex, 16)),
		)
		.replaceAll(
			/&(amp|lt|gt|quot|apos|nbsp);/gu,
			(match: string, name: string) => NAMED_ENTITIES[name] ?? match,
		);
