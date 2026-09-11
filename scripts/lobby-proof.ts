// NOTE: e2e proof for the room flow — needs a workerd backend. Either run
// `bunx alchemy dev` and point BACKEND_URL at its backend port, or target
// preview: BACKEND_URL=https://<backend>.workers.dev bun run test:e2e.
export const PROOF = "lobby-start-match";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:1338";
const CODE = `L${Date.now().toString(36).toUpperCase().slice(-5)}`;
const deck = [
	{ id: 1, name: "Azul" },
	{ id: 2, name: "Brass" },
];

type SeenMsg = {
	type: string;
	you?: string;
	host?: string | null;
	deck?: { id: number; name: string }[];
	started?: boolean;
	players?: { name: string }[];
	game?: { name: string };
	[key: string]: unknown;
};

const init = await fetch(`${BACKEND}/room/${CODE}/init`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify(deck),
});
console.log("init:", init.status);

const connect = (name: string) =>
	new Promise<{ ws: WebSocket; seen: SeenMsg[] }>((resolve, reject) => {
		const seen: SeenMsg[] = [];
		const ws = new WebSocket(`${BACKEND}/room/${CODE}`.replace("http", "ws"));
		const timer = setTimeout(
			() => reject(new Error(`${name} join timeout`)),
			10000,
		);
		ws.addEventListener("open", () => {
			ws.send(JSON.stringify({ type: "join", name }));
		});
		ws.addEventListener("message", (e) => {
			const msg = JSON.parse(e.data as string) as SeenMsg;
			seen.push(msg);
			if (msg.type === "joined") {
				clearTimeout(timer);
				resolve({ ws, seen });
			}
		});
		ws.addEventListener("error", () => {
			reject(new Error(`${name} socket error`));
		});
	});

const sleep = (ms: number) =>
	new Promise<void>((r) => {
		setTimeout(r, ms);
	});
const ofType = (seen: SeenMsg[], t: string) => seen.filter((m) => m.type === t);
const playerNames = (msg: SeenMsg) =>
	(msg.players ?? []).map((p) => p.name).join(",");

const a = await connect("ann");
const b = await connect("bob");
const ja = ofType(a.seen, "joined")[0] as SeenMsg;
const jb = ofType(b.seen, "joined")[0] as SeenMsg;
console.log(
	"A you/host:",
	ja.you !== undefined && ja.you === ja.host,
	"deck hidden:",
	(ja.deck ?? []).length === 0,
	"started:",
	ja.started,
);
console.log("B players:", playerNames(jb), "host is A:", jb.host === ja.you);

a.ws.send(JSON.stringify({ type: "swipe", gameId: 1, direction: "right" }));
b.ws.send(JSON.stringify({ type: "swipe", gameId: 1, direction: "right" }));
await sleep(1000);
console.log(
	"pre-start match (want 0):",
	ofType([...a.seen, ...b.seen], "match").length,
);

b.ws.send(JSON.stringify({ type: "start" }));
await sleep(1000);
console.log(
	"rogue start (want 0):",
	ofType([...a.seen, ...b.seen], "start").length,
);

a.ws.send(JSON.stringify({ type: "start" }));
await sleep(1500);
const sa = ofType(a.seen, "start");
const sb = ofType(b.seen, "start");
console.log("start received A/B:", sa.length, sb.length);

a.ws.send(JSON.stringify({ type: "swipe", gameId: 1, direction: "right" }));
await sleep(800);
b.ws.send(JSON.stringify({ type: "swipe", gameId: 1, direction: "right" }));
await sleep(1500);
const matches = ofType([...a.seen, ...b.seen], "match");
const firstGame = matches[0]?.game;
console.log("match msgs (want 2):", matches.length, firstGame?.name);

const ok =
	ja.you !== undefined &&
	ja.you === ja.host &&
	(ja.deck ?? []).length === 0 &&
	jb.host === ja.you &&
	matches.length === 2 &&
	firstGame?.name === "Azul" &&
	sa.length === 1 &&
	sb.length === 1;
console.log(ok ? "PASS" : "FAIL");
a.ws.close();
b.ws.close();
process.exit(ok ? 0 : 1);
