import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Effect from "effect/Effect";
import { Config } from "effect";
import Backend from "./src/server/backend.ts";

export const Website = Cloudflare.Website.Vite("Website", {
	env: {
		BACKEND: Backend,
		BGG_TOKEN: Config.string("BGG_TOKEN"),
	},
});

export type WebsiteEnv = Cloudflare.InferEnv<typeof Website>;

export default Alchemy.Stack(
	"boardmatch",
	{
		providers: Cloudflare.providers(),
		state: Cloudflare.state(),
	},
	Effect.gen(function* () {
		const backend = yield* Backend;
		const website = yield* Website;

		return {
			backendUrl: backend.url.as<string>(),
			websiteUrl: website.url.as<string>(),
		};
	}),
);
