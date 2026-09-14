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
	players?: { id: string; name: string }[];
	game?: { name: string };
	reason?: string;
	[key: string]: unknown;
};

const init = await fetch(`${BACKEND}/room/${CODE}/init`, {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify(deck),
});
console.log("init:", init.status);

const url = `${BACKEND}/room/${CODE}`.replace("http", "ws");

const connect = (name: string, claimId?: string) =>
	new Promise<{ ws: WebSocket; seen: SeenMsg[] }>((resolve, reject) => {
		const seen: SeenMsg[] = [];
		const ws = new WebSocket(url);
		const timer = setTimeout(
			() => reject(new Error(`${name} join timeout`)),
			10000,
		);
		ws.addEventListener("open", () => {
			ws.send(JSON.stringify({ type: "join", name, claimId }));
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

// NOTE: post-start joins are refused with no deck leak — the socket gets
// a refusal and a close, never a joined.
const connectRefused = (name: string) =>
	new Promise<{ seen: SeenMsg[]; code: number }>((resolve, reject) => {
		const seen: SeenMsg[] = [];
		const ws = new WebSocket(url);
		const timer = setTimeout(
			() => reject(new Error(`${name} refusal timeout`)),
			10000,
		);
		ws.addEventListener("open", () => {
			ws.send(JSON.stringify({ type: "join", name }));
		});
		ws.addEventListener("message", (e) => {
			seen.push(JSON.parse(e.data as string) as SeenMsg);
		});
		ws.addEventListener("close", (e) => {
			clearTimeout(timer);
			resolve({ seen, code: (e as CloseEvent).code });
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
const d = await connect("dan");
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

const refused = await connectRefused("cara");
const refusedMsgs = ofType(refused.seen, "refused");
console.log(
	"late join refused (want 1):",
	refusedMsgs.length,
	"reason:",
	refusedMsgs[0]?.reason,
	"close:",
	refused.code,
	"deck leaked (want 0):",
	ofType(refused.seen, "joined").length,
);

a.ws.send(JSON.stringify({ type: "swipe", gameId: 1, direction: "right" }));
b.ws.send(JSON.stringify({ type: "swipe", gameId: 1, direction: "right" }));
await sleep(800);
b.ws.close();
await sleep(1000);
const b2 = await connect("bob", jb.you);
const jr = ofType(b2.seen, "joined")[0] as SeenMsg;
console.log(
	"rejoin same seat:",
	jr.you === jb.you,
	"players:",
	playerNames(jr),
	"host still A:",
	jr.host === ja.you,
	"deck dealt:",
	(jr.deck ?? []).length,
);

d.ws.send(JSON.stringify({ type: "swipe", gameId: 1, direction: "right" }));
await sleep(1500);
const matches = ofType([...a.seen, ...b.seen, ...b2.seen, ...d.seen], "match");
const firstGame = matches[0]?.game;
console.log("match msgs (want 3):", matches.length, firstGame?.name);

const ok =
	ja.you !== undefined &&
	ja.you === ja.host &&
	(ja.deck ?? []).length === 0 &&
	jb.host === ja.you &&
	refusedMsgs.length === 1 &&
	refusedMsgs[0]?.reason === "started" &&
	refused.code === 4000 &&
	jr.you === jb.you &&
	jr.host === ja.you &&
	matches.length === 3 &&
	firstGame?.name === "Azul" &&
	sa.length === 1 &&
	sb.length === 1;
console.log(ok ? "PASS" : "FAIL");
a.ws.close();
b2.ws.close();
d.ws.close();
process.exit(ok ? 0 : 1);
