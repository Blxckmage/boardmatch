import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import Room from "./room.ts";
import type { GameCard } from "./room-protocol.ts";

export default Cloudflare.Worker(
	"Backend",
	{ main: import.meta.url },
	Effect.gen(function* () {
		const rooms = yield* Room;

		return {
			fetch: Effect.gen(function* () {
				const request = yield* HttpServerRequest;

				if (request.url.startsWith("/room/")) {
					// NOTE: /room/:id or /room/:id/init — pop() would grab "init".
					const id = request.url.split("/")[2];
					if (!id) {
						return HttpServerResponse.text("Missing room id", {
							status: 400,
						});
					}
					if (request.method === "POST" && request.url.endsWith("/init")) {
						const deck = (yield* request.json) as GameCard[];
						const count = yield* rooms.getByName(id).initDeck(deck);
						return yield* HttpServerResponse.json({ ok: true, games: count });
					}
					if (request.headers.upgrade !== "websocket") {
						return HttpServerResponse.text("Expected Upgrade: websocket", {
							status: 426,
						});
					}
					return yield* rooms.getByName(id).fetch(request);
				}

				return HttpServerResponse.text("boardmatch backend", { status: 404 });
			}),
		};
	}),
);
