import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getEnv } from "#/cf-env";
import { makeRoomCode } from "./room-protocol.ts";

const card = z.object({
	id: z.number().int(),
	name: z.string().min(1),
	thumbnail: z.string().url().optional(),
});

export const createRoom = createServerFn({ method: "POST" })
	.validator(z.object({ deck: z.array(card).min(1) }))
	.handler(async ({ data }) => {
		const code = makeRoomCode();
		const env = await getEnv().catch(() => {
			throw new Error("rooms need workerd (alchemy dev / deploy)");
		});
		const res = await env.BACKEND.fetch(
			new Request(`https://backend/room/${code}/init`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data.deck),
			}),
		);
		if (!res.ok) {
			throw new Error(`room init failed: ${res.status}`);
		}
		return { code, path: `/rooms/${code}`, games: data.deck.length };
	});
