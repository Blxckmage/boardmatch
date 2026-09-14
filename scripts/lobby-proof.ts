// NOTE: e2e proof for the room flow — needs a workerd backend. Either run
// `bunx alchemy dev` and point BACKEND_URL at its backend port, or target
// preview: BACKEND_URL=https://<backend>.workers.dev bun run test:e2e.
// Room A: 4-client ensemble (staggered swipes, refusal, drop+rejoin).
// Room B: grace expiry (drop, outlast 60s grace, solo completion).
export const PROOF = "lobby-start-match";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:1338";
const stamp = Date.now().toString(36).toUpperCase().slice(-5);
const CODE_A = `A${stamp}`;
const CODE_B = `B${stamp}`;
const deck = [
	{ id: 1, name: "Azul" },
	{ id: 2, name: "Brass" },
];
// NOTE: server grace is 60s — outlast it with margin, keep it generous.
const GRACE_WAIT = 70_000;

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

const initRoom = (code: string) =>
	fetch(`${BACKEND}/room/${code}/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(deck),
	});

const sleep = (ms: number) =>
	new Promise<void>((r) => {
		setTimeout(r, ms);
	});
const ofType = (seen: SeenMsg[], t: string) => seen.filter((m) => m.type === t);
const playerNames = (msg: SeenMsg) =>
	(msg.players ?? []).map((p) => p.name).join(",");
const swipe = (ws: WebSocket, gameId: number) => {
	ws.send(JSON.stringify({ type: "swipe", gameId, direction: "right" }));
};

const connect = (url: string, name: string, claimId?: string) =>
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
const connectRefused = (url: string, name: string) =>
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

// --- Room A: ensemble -------------------------------------------------
const urlA = `${BACKEND}/room/${CODE_A}`.replace("http", "ws");
console.log("init A:", (await initRoom(CODE_A)).status);

const a = await connect(urlA, "ann");
const b = await connect(urlA, "bob");
const d = await connect(urlA, "dan");
const e = await connect(urlA, "eli");
const ja = ofType(a.seen, "joined")[0] as SeenMsg;
const jb = ofType(b.seen, "joined")[0] as SeenMsg;
const je = ofType(e.seen, "joined")[0] as SeenMsg;
console.log(
	"A you/host:",
	ja.you !== undefined && ja.you === ja.host,
	"deck hidden:",
	(ja.deck ?? []).length === 0,
	"started:",
	ja.started,
);
console.log(
	"roster:",
	playerNames(je),
	"host is A:",
	je.host === ja.you,
	"voters:",
	(je.players ?? []).length,
);

swipe(a.ws, 1);
swipe(b.ws, 1);
await sleep(1000);
console.log(
	"pre-start match (want 0):",
	ofType([...a.seen, ...b.seen, ...d.seen, ...e.seen], "match").length,
);

b.ws.send(JSON.stringify({ type: "start" }));
await sleep(1000);
console.log(
	"rogue start (want 0):",
	ofType([...a.seen, ...b.seen, ...d.seen, ...e.seen], "start").length,
);

a.ws.send(JSON.stringify({ type: "start" }));
await sleep(1500);
const startsA = ofType([...a.seen, ...b.seen, ...d.seen, ...e.seen], "start");
console.log("start received (want 4):", startsA.length);

const refused = await connectRefused(urlA, "cara");
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

swipe(a.ws, 1);
await sleep(400);
swipe(d.ws, 1);
await sleep(400);
swipe(b.ws, 1);
await sleep(400);
e.ws.close();
await sleep(1000);
const e2 = await connect(urlA, "eli", je.you);
const jr = ofType(e2.seen, "joined")[0] as SeenMsg;
console.log(
	"rejoin same seat:",
	jr.you === je.you,
	"host still A:",
	jr.host === ja.you,
	"deck dealt:",
	(jr.deck ?? []).length,
);
swipe(e2.ws, 1);
await sleep(1500);
const matchesA = ofType(
	[...a.seen, ...b.seen, ...d.seen, ...e.seen, ...e2.seen],
	"match",
);
console.log("match msgs A (want 4):", matchesA.length, matchesA[0]?.game?.name);

const okA =
	ja.you !== undefined &&
	ja.you === ja.host &&
	(ja.deck ?? []).length === 0 &&
	jb.host === ja.you &&
	(je.players ?? []).length === 4 &&
	refusedMsgs.length === 1 &&
	refusedMsgs[0]?.reason === "started" &&
	refused.code === 4000 &&
	jr.you === je.you &&
	jr.host === ja.you &&
	matchesA.length === 4 &&
	matchesA[0]?.game?.name === "Azul" &&
	startsA.length === 4;
console.log(okA ? "ROOM A PASS" : "ROOM A FAIL");
a.ws.close();
b.ws.close();
d.ws.close();
e2.ws.close();

// --- Room B: grace expiry ---------------------------------------------
const urlB = `${BACKEND}/room/${CODE_B}`.replace("http", "ws");
console.log("init B:", (await initRoom(CODE_B)).status);

const a2 = await connect(urlB, "amy");
const b2 = await connect(urlB, "ben");
const ja2 = ofType(a2.seen, "joined")[0] as SeenMsg;
const jb2 = ofType(b2.seen, "joined")[0] as SeenMsg;
a2.ws.send(JSON.stringify({ type: "start" }));
await sleep(1500);
swipe(b2.ws, 1);
await sleep(800);
b2.ws.close();
console.log("ben dropped; outlasting grace…");
await sleep(GRACE_WAIT);
const amyLive =
	a2.ws.readyState === WebSocket.OPEN
		? true
		: await connect(urlB, "amy", ja2.you)
				.then(({ ws, seen }) => {
					a2.ws = ws;
					a2.seen.push(...seen);
					return true;
				})
				.catch(() => false);
console.log("amy still seated:", amyLive);
swipe(a2.ws, 1);
await sleep(1500);
const matchesB = ofType(a2.seen, "match");
const rostersB = ofType(a2.seen, "players");
const lastRoster = rostersB.at(-1);
const benPurged =
	lastRoster !== undefined &&
	!playerNames(lastRoster).split(",").includes("ben");
console.log(
	"match msgs B (want 1):",
	matchesB.length,
	matchesB[0]?.game?.name,
	"ben purged from roster:",
	benPurged,
	"ben seat was:",
	jb2.you !== undefined,
);

const okB =
	amyLive &&
	matchesB.length === 1 &&
	matchesB[0]?.game?.name === "Azul" &&
	benPurged;
console.log(okB ? "ROOM B PASS" : "ROOM B FAIL");
a2.ws.close();

const ok = okA && okB;
console.log(ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
