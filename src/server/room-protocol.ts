export type GameCard = {
	id: number;
	name: string;
	thumbnail?: string;
};

export type ClientMsg =
	| { type: "join"; name: string }
	| { type: "swipe"; gameId: number; direction: "left" | "right" };

export type ServerMsg =
	| { type: "joined"; deck: GameCard[]; players: string[] }
	| { type: "players"; players: string[] };

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const makeRoomCode = (length = 6): string => {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return [...bytes]
		.map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
		.join("");
};
