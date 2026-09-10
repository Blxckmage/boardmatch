import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import type { ClientMsg, GameCard, ServerMsg } from "./room-protocol.ts";

type Sessions = Map<string, Cloudflare.WebSocket>;
type Names = Map<string, string>;

const send = (socket: Cloudflare.WebSocket, msg: ServerMsg) =>
	socket.send(JSON.stringify(msg));

const broadcast = (sessions: Sessions, msg: ServerMsg) =>
	Effect.gen(function* () {
		for (const peer of sessions.values()) {
			yield* send(peer, msg);
		}
	});

const registerJoin = (
	sessions: Sessions,
	names: Names,
	deck: GameCard[],
	socket: Cloudflare.WebSocket,
	name: string,
) =>
	Effect.gen(function* () {
		const attachment = socket.deserializeAttachment<{ id: string }>();
		if (!attachment) return;
		sessions.set(attachment.id, socket);
		names.set(attachment.id, name);
		yield* send(socket, {
			type: "joined",
			deck,
			players: [...names.values()],
		});
		yield* broadcast(sessions, {
			type: "players",
			players: [...names.values()],
		});
	});

const handleClose = (sessions: Sessions, names: Names) =>
	Effect.fn(function* (ws: Cloudflare.WebSocket, code: number, reason: string) {
		const attachment = ws.deserializeAttachment<{ id: string }>();
		if (attachment) {
			sessions.delete(attachment.id);
			names.delete(attachment.id);
			yield* broadcast(sessions, {
				type: "players",
				players: [...names.values()],
			});
		}
		yield* ws.close(code, reason);
	});

const parseMessage = (message: string | ArrayBuffer): ClientMsg => {
	const text =
		typeof message === "string" ? message : new TextDecoder().decode(message);
	return JSON.parse(text) as ClientMsg;
};

export default class Room extends Cloudflare.DurableObject<Room>()(
	"Rooms",
	Effect.gen(function* () {
		const state = yield* Cloudflare.DurableObjectState;
		return Effect.gen(function* () {
			yield* state.storage.sql.exec(
				"CREATE TABLE IF NOT EXISTS swipes (player TEXT NOT NULL, game INTEGER NOT NULL, direction TEXT NOT NULL, PRIMARY KEY (player, game))",
			);
			yield* state.storage.sql.exec(
				"CREATE TABLE IF NOT EXISTS room (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
			);
			const deckCursor = yield* state.storage.sql.exec(
				"SELECT value FROM room WHERE key = 'deck'",
			);
			const deckRow = yield* deckCursor.one();
			const deck: GameCard[] = deckRow
				? (JSON.parse(deckRow.value as string) as GameCard[])
				: [];
			const sessions: Sessions = new Map();
			const names: Names = new Map();
			for (const socket of yield* state.getWebSockets()) {
				const data = socket.deserializeAttachment<{ id: string }>();
				if (data) sessions.set(data.id, socket);
			}
			const onClose = handleClose(sessions, names);
			return {
				initDeck: (next: GameCard[]) =>
					Effect.gen(function* () {
						yield* state.storage.sql.exec(
							"INSERT OR REPLACE INTO room (key, value) VALUES ('deck', ?)",
							JSON.stringify(next),
						);
						deck.length = 0;
						deck.push(...next);
						return deck.length;
					}),
				fetch: Effect.gen(function* () {
					const [response, socket] = yield* Cloudflare.upgrade();
					const id = crypto.randomUUID();
					socket.serializeAttachment({ id });
					sessions.set(id, socket);
					return response;
				}),
				webSocketMessage: Effect.fn(function* (
					socket: Cloudflare.WebSocket,
					message: string | ArrayBuffer,
				) {
					const parsed = parseMessage(message);
					if (parsed.type === "join") {
						yield* registerJoin(sessions, names, deck, socket, parsed.name);
						return;
					}
					const attachment = socket.deserializeAttachment<{ id: string }>();
					const name = attachment ? names.get(attachment.id) : undefined;
					if (!attachment || !name) return;
					yield* state.storage.sql.exec(
						"INSERT OR REPLACE INTO swipes (player, game, direction) VALUES (?, ?, ?)",
						attachment.id,
						parsed.gameId,
						parsed.direction,
					);
				}),
				webSocketClose: Effect.fn(function* (
					ws: Cloudflare.WebSocket,
					code: number,
					reason: string,
				) {
					yield* onClose(ws, code, reason);
				}),
			};
		});
	}),
) {}
