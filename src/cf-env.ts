import type { WebsiteEnv } from "../alchemy.run.ts";

export const getEnv = async (): Promise<WebsiteEnv> => {
	const cf = await import("cloudflare:workers");
	return new Proxy({} as WebsiteEnv, {
		get(_, prop) {
			return (cf.env as Record<string, unknown>)[prop as string];
		},
	});
};
