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

export const fetchOwnedCollection = (client: BggClient, username: string) =>
	Effect.gen(function* () {
		const result = yield* Effect.tryPromise({
			try: () => client.getCollection({ username, own: true }),
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
