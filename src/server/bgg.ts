import { BggClient, BggError, BggTimeoutError } from "bgg-api-ts";
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
