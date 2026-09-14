export type GameCard = {
	id: number;
	name: string;
	thumbnail?: string;
	image?: string;
};

export type ClientMsg =
	| { type: "join"; name: string; claimId?: string }
	| { type: "swipe"; gameId: number; direction: "left" | "right" }
	| { type: "start" };

export type RoomPlayer = { id: string; name: string };

export type ServerMsg =
	| {
			type: "joined";
			you: string;
			deck: GameCard[];
			players: RoomPlayer[];
			host: string | null;
			started: boolean;
	  }
	| { type: "players"; players: RoomPlayer[]; host: string | null }
	| { type: "start"; deck: GameCard[] }
	| { type: "match"; game: GameCard }
	| { type: "refused"; reason: "started" };

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const makeRoomCode = (length = 6): string => {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return [...bytes]
		.map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
		.join("");
};

// NOTE: disconnect grace — a dropped seat (id, swipes, host) survives
// short drops; past the window the voter is gone and matches complete.
export const GRACE_MS = 60_000;

export const graceExpired = (now: number, leftAt: number): boolean =>
	now - leftAt >= GRACE_MS;

// NOTE: voters = every seated player whose grace has not expired. Called
// after a sweep, so any leftAt still present is inside grace and counts.
export const activeVoters = (
	ids: readonly string[],
	left: ReadonlyMap<string, number>,
	now: number,
): string[] => ids.filter((id) => !graceExpired(now, left.get(id) ?? now));

// NOTE: pure match engine — first match wins, full agreement only, no
// partial/majority. likedBy/voters are player ids; voters empty = no match.
export const checkMatch = (
	deck: GameCard[],
	gameId: number,
	likedBy: readonly string[],
	voters: readonly string[],
): GameCard | null => {
	if (voters.length === 0) return null;
	if (!voters.every((v) => likedBy.includes(v))) return null;
	return deck.find((g) => g.id === gameId) ?? null;
};
