import { useMemo, useState } from "react";

import { Button, Field, PillTag } from "#/components/ui";
import { SwipeDeck } from "#/components/swipe-deck";
import type { GameCard, RoomPlayer } from "#/server/room-protocol";

export function Lobby({
	players,
	host,
	you,
	onStart,
}: {
	players: RoomPlayer[];
	host: string | null;
	you: string | null;
	onStart: () => void;
}) {
	const ordered = [
		...players.filter((p) => p.id === host),
		...players.filter((p) => p.id !== host),
	];
	const isHost = host !== null && host === you;
	const ready = players.length >= 2;

	return (
		<div className="mx-auto mt-8 w-full max-w-sm">
			<ul className="space-y-2">
				{ordered.map((p) => (
					<LobbyRow key={p.id} player={p} isHost={p.id === host} />
				))}
			</ul>
			{isHost ? (
				<div className="mt-6">
					<Button variant="primary" disabled={!ready} onClick={onStart}>
						Start
					</Button>
					{!ready && (
						<p className="font-mono mt-4 text-[11px] uppercase tracking-[1.1px] text-fog">
							Need at least 2 players
						</p>
					)}
				</div>
			) : (
				<p className="font-mono mt-6 text-[11px] uppercase tracking-[1.1px] text-fog">
					Waiting for the host to start…
				</p>
			)}
		</div>
	);
}

function LobbyRow({ player, isHost }: { player: RoomPlayer; isHost: boolean }) {
	return (
		<li className="rounded-tile flex items-center gap-3 border border-white bg-canvas px-5 py-3">
			<span className="font-sans text-lg font-bold text-white">
				{player.name}
			</span>
			{isHost ? <PillTag tone="mint">Host</PillTag> : null}
		</li>
	);
}

export function RoomHeader({ code }: { code: string }) {
	const [copied, setCopied] = useState(false);
	const copy = () => {
		try {
			void navigator.clipboard
				.writeText(window.location.href)
				.then(() => setCopied(true));
		} catch {
			setCopied(false);
		}
	};
	return (
		<div className="mx-auto flex w-full max-w-sm items-center gap-3">
			<p className="font-mono text-xs uppercase tracking-[1.8px] text-mint">
				Room {code}
			</p>
			<button
				type="button"
				onClick={copy}
				className="font-mono ml-auto cursor-pointer text-[11px] uppercase tracking-[1.1px] text-fog"
			>
				{copied ? "Copied" : "Copy invite"}
			</button>
		</div>
	);
}

export function JoinForm({
	name,
	busy,
	onName,
	onJoin,
}: {
	name: string;
	busy: boolean;
	onName: (v: string) => void;
	onJoin: () => void;
}) {
	const [tried, setTried] = useState(false);
	const blank = !name.trim();
	return (
		<form
			className="mt-6 max-w-sm"
			onSubmit={(e) => {
				e.preventDefault();
				if (blank) {
					setTried(true);
					return;
				}
				onJoin();
			}}
		>
			<Field
				label="Display name"
				placeholder="e.g. Faza"
				value={name}
				onChange={(e) => onName(e.target.value)}
			/>
			{tried && blank ? (
				<p className="font-mono mt-4 text-[11px] uppercase tracking-[1.1px] text-white">
					Enter a display name to join.
				</p>
			) : null}
			<div className="mt-6">
				<Button type="submit" variant="primary" disabled={busy || blank}>
					{busy ? "Joining…" : "Join room"}
				</Button>
			</div>
		</form>
	);
}

const CONFETTI_TONES = ["#3cffd0", "#5200ff", "#ffffff"];

function Confetti() {
	const pieces = useMemo(
		() =>
			Array.from({ length: 28 }, (_, i) => ({
				left: (i * 37) % 100,
				delay: (i % 7) * 0.35,
				duration: 2.4 + (i % 5) * 0.4,
				tone: CONFETTI_TONES[i % CONFETTI_TONES.length],
			})),
		[],
	);
	return (
		<>
			<style>{`@keyframes bm-fall{to{transform:translateY(110vh) rotate(540deg)}}`}</style>
			{pieces.map((p, i) => (
				<span
					// NOTE: decorative only, stable order
					key={i}
					className="absolute top-[-5vh] h-3 w-2"
					style={{
						left: `${p.left}%`,
						background: p.tone,
						animation: `bm-fall ${p.duration}s linear ${p.delay}s infinite`,
					}}
				/>
			))}
		</>
	);
}

export function MatchOverlay({ game }: { game: GameCard }) {
	return (
		<div className="fixed inset-0 z-50 overflow-hidden bg-black/80">
			<Confetti />
			<div className="relative mx-auto mt-24 max-w-md rounded-tile border border-transparent bg-mint p-8 text-center md:p-10">
				<p className="font-mono text-xs uppercase tracking-[1.8px] text-black">
					Match found
				</p>
				{(game.image ?? game.thumbnail) ? (
					<img
						src={(game.image ?? game.thumbnail) as string}
						alt=""
						className="mx-auto mt-6 h-40 rounded-[4px] border border-black/20 object-cover"
					/>
				) : null}
				<h2 className="mt-6 font-sans text-2xl font-bold leading-none text-black">
					Tonight you&apos;re playing: {game.name}
				</h2>
				<p className="font-mono mt-6 text-[11px] uppercase tracking-[1.1px] text-black/70">
					Powered by{" "}
					<a
						href="https://boardgamegeek.com"
						target="_blank"
						rel="noreferrer"
						className="underline"
					>
						BoardGameGeek
					</a>
				</p>
			</div>
		</div>
	);
}

export type Phase = "name" | "joining" | "lobby" | "deck" | "error";

export function PhaseError({
	problem,
	onJoin,
}: {
	problem: string | null;
	onJoin: () => void;
}) {
	return (
		<div className="mx-auto mt-6 w-full max-w-sm">
			<p className="font-mono text-xs uppercase tracking-[1.5px] text-white">
				{problem}
			</p>
			<div className="mt-6">
				<Button variant="secondary" onClick={onJoin}>
					Rejoin
				</Button>
			</div>
		</div>
	);
}

export function PhaseView({
	phase,
	problem,
	code,
	name,
	busy,
	deck,
	players,
	host,
	you,
	onName,
	onJoin,
	onSwipe,
	onStart,
}: {
	phase: Phase;
	problem: string | null;
	code: string;
	name: string;
	busy: boolean;
	deck: GameCard[];
	players: RoomPlayer[];
	host: string | null;
	you: string | null;
	onName: (v: string) => void;
	onJoin: () => void;
	onSwipe: (gameId: number, direction: "left" | "right") => void;
	onStart: () => void;
}) {
	if (phase === "name" || phase === "joining") {
		return <JoinForm name={name} busy={busy} onName={onName} onJoin={onJoin} />;
	}
	if (phase === "error") {
		return <PhaseError problem={problem} onJoin={onJoin} />;
	}
	if (phase === "lobby") {
		return (
			<>
				<RoomHeader code={code} />
				<Lobby players={players} host={host} you={you} onStart={onStart} />
			</>
		);
	}
	return (
		<>
			<RoomHeader code={code} />
			<SwipeDeck deck={deck} onSwipe={onSwipe} />
		</>
	);
}
