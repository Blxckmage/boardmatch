import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import { HttpServerRequest } from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import Room from "./room.ts";

export default Cloudflare.Worker(
	"Backend",
	{ main: import.meta.url },
	Effect.gen(function* () {
		const rooms = yield* Room;

		return {
			fetch: Effect.gen(function* () {
				const request = yield* HttpServerRequest;

				if (request.url.startsWith("/room/")) {
					if (request.headers.upgrade !== "websocket") {
						return HttpServerResponse.text("Expected Upgrade: websocket", {
							status: 426,
						});
					}
					const id = request.url.split("/").pop();
					if (!id) {
						return HttpServerResponse.text("Missing room id", {
							status: 400,
						});
					}
					return yield* rooms.getByName(id).fetch(request);
				}

				return HttpServerResponse.text("boardmatch backend", { status: 404 });
			}),
		};
	}),
);
