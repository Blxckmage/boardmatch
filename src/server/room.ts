import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import {
	type ClientMsg,
	type GameCard,
	type ServerMsg,
	checkMatch,
} from "./room-protocol.ts";

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

// NOTE: trust-at-boundary guard — malformed client input is ignored, never
// a DO crash.
const isClientMsg = (value: unknown): value is ClientMsg => {
	if (typeof value !== "object" || value === null) return false;
	const msg = value as Record<string, unknown>;
	if (msg.type === "join") return typeof msg.name === "string";
	if (msg.type === "swipe")
		return (
			typeof msg.gameId === "number" &&
			(msg.direction === "left" || msg.direction === "right")
		);
	return false;
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
			// NOTE: one() throws on empty — toArray() is the safe boot read.
			const readKey = (key: string) =>
				Effect.gen(function* () {
					const cursor = yield* state.storage.sql.exec<{ value: string }>(
						"SELECT value FROM room WHERE key = ?",
						key,
					);
					const rows = yield* cursor.toArray();
					return rows[0]?.value;
				});
			const deckJson = yield* readKey("deck");
			const deck: GameCard[] = deckJson
				? (JSON.parse(deckJson) as GameCard[])
				: [];
			const closedJson = yield* readKey("closed");
			let closed: GameCard | null = closedJson
				? (JSON.parse(closedJson) as GameCard)
				: null;
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
						yield* state.storage.sql.exec(
							"DELETE FROM room WHERE key = 'closed'",
						);
						deck.length = 0;
						deck.push(...next);
						closed = null;
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
					const parsed = yield* Effect.try({
						try: () => parseMessage(message),
						catch: () => null,
					});
					if (!isClientMsg(parsed)) return;
					if (parsed.type === "join") {
						yield* registerJoin(sessions, names, deck, socket, parsed.name);
						return;
					}
					if (closed) return;
					const attachment = socket.deserializeAttachment<{ id: string }>();
					const name = attachment ? names.get(attachment.id) : undefined;
					if (!attachment || !name) return;
					yield* state.storage.sql.exec(
						"INSERT OR REPLACE INTO swipes (player, game, direction) VALUES (?, ?, ?)",
						attachment.id,
						parsed.gameId,
						parsed.direction,
					);
					if (parsed.direction !== "right") return;
					const voters = [...names.keys()];
					const likesCursor = yield* state.storage.sql.exec<{
						player: string;
					}>(
						"SELECT player FROM swipes WHERE game = ? AND direction = 'right'",
						parsed.gameId,
					);
					const likedBy = (yield* likesCursor.toArray())
						.map((row) => row.player)
						.filter((player) => voters.includes(player));
					const match = checkMatch(deck, parsed.gameId, likedBy, voters);
					if (!match) return;
					closed = match;
					yield* state.storage.sql.exec(
						"INSERT OR REPLACE INTO room (key, value) VALUES ('closed', ?)",
						JSON.stringify(match),
					);
					yield* broadcast(sessions, { type: "match", game: match });
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
