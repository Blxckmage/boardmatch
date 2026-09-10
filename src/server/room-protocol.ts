export type GameCard = {
	id: number;
	name: string;
	thumbnail?: string;
	image?: string;
};

export type ClientMsg =
	| { type: "join"; name: string }
	| { type: "swipe"; gameId: number; direction: "left" | "right" };

export type ServerMsg =
	| { type: "joined"; deck: GameCard[]; players: string[] }
	| { type: "players"; players: string[] }
	| { type: "match"; game: GameCard };

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const makeRoomCode = (length = 6): string => {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return [...bytes]
		.map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
		.join("");
};

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
