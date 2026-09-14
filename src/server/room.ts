import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import {
	type ClientMsg,
	type GameCard,
	type RoomPlayer,
	type ServerMsg,
	activeVoters,
	checkMatch,
	graceExpired,
} from "./room-protocol.ts";

type Sessions = Map<string, Cloudflare.WebSocket>;
type Names = Map<string, string>;
type Away = Map<string, { at: number; host: boolean }>;

const leftKey = (id: string): string => `left:${id}`;

const listPlayers = (names: Names): RoomPlayer[] =>
	[...names.entries()].map(([id, name]) => ({ id, name }));

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
	host: string | null,
	started: boolean,
) =>
	Effect.gen(function* () {
		const attachment = socket.deserializeAttachment<{ id: string }>();
		if (!attachment) return null;
		sessions.set(attachment.id, socket);
		names.set(attachment.id, name);
		yield* send(socket, {
			type: "joined",
			you: attachment.id,
			deck: started ? deck : [],
			players: listPlayers(names),
			host,
			started,
		});
		return attachment.id;
	});

// NOTE: close drops the socket but keeps the seat — the player is away
// in grace, not gone. Names are purged only by sweep after expiry.
const dropSession = (sessions: Sessions) =>
	Effect.fn(function* (ws: Cloudflare.WebSocket, code: number, reason: string) {
		const attachment = ws.deserializeAttachment<{ id: string }>();
		if (attachment) sessions.delete(attachment.id);
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
	if (msg.type === "join")
		return (
			typeof msg.name === "string" &&
			(msg.claimId === undefined || typeof msg.claimId === "string")
		);
	if (msg.type === "start") return true;
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
			let host: string | null = null;
			let started = (yield* readKey("started")) === "1";
			const sessions: Sessions = new Map();
			const names: Names = new Map();
			const away: Away = new Map();
			for (const socket of yield* state.getWebSockets()) {
				const data = socket.deserializeAttachment<{ id: string }>();
				if (data) sessions.set(data.id, socket);
			}
			const allCursor = yield* state.storage.sql.exec<{
				key: string;
				value: string;
			}>("SELECT key, value FROM room");
			for (const row of yield* allCursor.toArray()) {
				if (!row.key.startsWith("left:")) continue;
				away.set(
					row.key.slice("left:".length),
					JSON.parse(row.value) as { at: number; host: boolean },
				);
			}
			// NOTE: lazy expiry — no alarms. Expired seats are purged on the
			// next message or close, never by a timer.
			const sweepExpired = (now: number) =>
				Effect.gen(function* () {
					let changed = false;
					for (const [id, left] of away) {
						if (!graceExpired(now, left.at)) continue;
						away.delete(id);
						names.delete(id);
						yield* state.storage.sql.exec(
							"DELETE FROM room WHERE key = ?",
							leftKey(id),
						);
						if (id === host) {
							host = [...names.keys()][0] ?? null;
						}
						changed = true;
					}
					if (changed) {
						yield* broadcast(sessions, {
							type: "players",
							players: listPlayers(names),
							host,
						});
					}
				});
			const markAway = (id: string, now: number) =>
				Effect.gen(function* () {
					const seat = { at: now, host: id === host };
					away.set(id, seat);
					yield* state.storage.sql.exec(
						"INSERT OR REPLACE INTO room (key, value) VALUES (?, ?)",
						leftKey(id),
						JSON.stringify(seat),
					);
				});
			const onClose = dropSession(sessions);
			return {
				initDeck: (next: GameCard[]) =>
					Effect.gen(function* () {
						yield* state.storage.sql.exec(
							"INSERT OR REPLACE INTO room (key, value) VALUES ('deck', ?)",
							JSON.stringify(next),
						);
						yield* state.storage.sql.exec(
							"DELETE FROM room WHERE key IN ('closed', 'started')",
						);
						yield* state.storage.sql.exec(
							"DELETE FROM room WHERE key LIKE 'left:%'",
						);
						away.clear();
						deck.length = 0;
						deck.push(...next);
						closed = null;
						host = null;
						started = false;
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
						const now = Date.now();
						yield* sweepExpired(now);
						// NOTE: closed rooms stay closed — a post-start join is
						// refused with no deck leak, unless it reclaims a seat
						// still inside grace.
						const claim =
							parsed.claimId &&
							names.has(parsed.claimId) &&
							away.has(parsed.claimId)
								? parsed.claimId
								: null;
						if (started && !claim) {
							yield* send(socket, { type: "refused", reason: "started" });
							yield* socket.close(4000, "game already started");
							const doomed = socket.deserializeAttachment<{ id: string }>();
							if (doomed) sessions.delete(doomed.id);
							return;
						}
						if (claim) {
							socket.serializeAttachment({ id: claim });
							const left = away.get(claim);
							away.delete(claim);
							yield* state.storage.sql.exec(
								"DELETE FROM room WHERE key = ?",
								leftKey(claim),
							);
							if (left?.host) host = claim;
						}
						const pre = socket.deserializeAttachment<{ id: string }>();
						if (pre && !host) host = pre.id;
						const id = yield* registerJoin(
							sessions,
							names,
							deck,
							socket,
							parsed.name,
							host,
							started,
						);
						if (!id) return;
						yield* broadcast(sessions, {
							type: "players",
							players: listPlayers(names),
							host,
						});
						return;
					}
					if (parsed.type === "start") {
						yield* sweepExpired(Date.now());
						const attachment = socket.deserializeAttachment<{ id: string }>();
						if (
							!attachment ||
							attachment.id !== host ||
							started ||
							names.size < 2
						) {
							return;
						}
						started = true;
						yield* state.storage.sql.exec(
							"INSERT OR REPLACE INTO room (key, value) VALUES ('started', '1')",
						);
						yield* broadcast(sessions, { type: "start", deck });
						return;
					}
					const now = Date.now();
					yield* sweepExpired(now);
					if (!started || closed) return;
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
					const voters = activeVoters(
						[...names.keys()],
						new Map([...away].map(([id, left]) => [id, left.at])),
						now,
					);
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
					const attachment = ws.deserializeAttachment<{ id: string }>();
					const now = Date.now();
					yield* sweepExpired(now);
					yield* onClose(ws, code, reason);
					if (attachment && names.has(attachment.id)) {
						yield* markAway(attachment.id, now);
						if (attachment.id === host) {
							host =
								[...names.keys()].find((id) => id !== attachment.id) ??
								attachment.id;
						}
					}
					yield* broadcast(sessions, {
						type: "players",
						players: listPlayers(names),
						host,
					});
				}),
			};
		});
	}),
) {}
