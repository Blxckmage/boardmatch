import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button, Field, PillTag } from "#/components/ui";
import { FIXTURE_DECK } from "#/components/dev-fixtures";
import { useCollectionFetch } from "#/components/create-flow";
import {
	addFakeUser,
	applySwipe,
	createRoomState,
	evaluateRoom,
	joinUser,
	kickUser,
	roomDone,
	startRoom,
	type SimRoom,
	type SimUser,
} from "#/components/fake-room";
import { PlaySidebar } from "#/components/play-sidebar";
import { FetchForm } from "#/routes/create";
import type { GameCard } from "#/server/room-protocol";
import { Lobby, MatchOverlay } from "#/components/room-views";
import { SwipeDeck, type Direction } from "#/components/swipe-deck";

export const Route = createFileRoute("/playground")({
	beforeLoad: () => {
		if (!import.meta.env.DEV) throw notFound();
	},
	component: Playground,
});

function useSimRoom() {
	const [room, setRoom] = useState<SimRoom | null>(null);

	useEffect(() => {
		if (!room?.started) return;
		const timer = window.setInterval(() => {
			setRoom((prev) => {
				if (!prev?.started) return prev;
				let next = prev;
				for (const u of prev.users) {
					if (u.fake && !u.kicked && u.swiped < prev.deck.length) {
						next = applySwipe(next, u.id, prev.deck[u.swiped].id, "right");
					}
				}
				return next;
			});
		}, 1200);
		return () => window.clearInterval(timer);
	}, [room?.started]);

	useEffect(() => {
		if (!room || !room.started || room.match || room.noMatch) return;
		if (!roomDone(room, room.deck)) return;
		const game = evaluateRoom(room, room.deck);
		setRoom((prev) => (prev ? { ...prev, match: game, noMatch: !game } : prev));
	}, [room]);

	const create = (name: string, deck: GameCard[]) =>
		setRoom(createRoomState(name, deck));
	const join = (name: string, code: string) =>
		setRoom((prev) => (prev ? joinUser(prev, name, code) : prev));
	const start = () => setRoom((prev) => (prev ? startRoom(prev) : prev));
	const swipe = (userId: string, gameId: number, direction: Direction) =>
		setRoom((prev) =>
			prev ? applySwipe(prev, userId, gameId, direction) : prev,
		);
	const kick = (id: string) =>
		setRoom((prev) => (prev ? kickUser(prev, id) : prev));
	const addFake = () => setRoom((prev) => (prev ? addFakeUser(prev) : prev));
	const reset = () => setRoom(null);

	return { room, create, join, start, swipe, kick, addFake, reset };
}

function Playground() {
	const sim = useSimRoom();
	const [name, setName] = useState("");
	const [code, setCode] = useState("");

	return (
		<div className="flex min-h-dvh">
			<PlaySidebar
				room={sim.room}
				name={name}
				onName={setName}
				code={code}
				onCode={setCode}
				onJoin={() => sim.join(name, code)}
				onAddFake={sim.addFake}
				onReset={sim.reset}
				onKick={sim.kick}
			/>
			<div className="min-w-0 flex-1 px-6 py-8">
				{sim.room ? (
					<RoomSim room={sim.room} sim={sim} />
				) : (
					<SetupBox
						name={name}
						onName={setName}
						onCreate={(deck) => sim.create(name, deck)}
					/>
				)}
			</div>
		</div>
	);
}

function SetupBox({
	name,
	onName,
	onCreate,
}: {
	name: string;
	onName: (v: string) => void;
	onCreate: (deck: GameCard[]) => void;
}) {
	const col = useCollectionFetch();
	const deck = col.games.length > 0 ? col.games : FIXTURE_DECK;

	return (
		<div className="mx-auto mt-8 w-full max-w-2xl">
			<FetchForm
				busy={col.busy}
				fields={col.fields}
				setters={col.setters}
				onFetch={col.fetch}
			/>
			<DeckStatus
				count={col.games.length}
				total={col.total}
				error={col.error}
			/>
			<div className="mt-6 max-w-sm">
				<Field
					label="Display name"
					placeholder="e.g. ann"
					value={name}
					onChange={(e) => onName(e.target.value)}
				/>
				<div className="mt-6">
					<Button
						type="button"
						variant="primary"
						disabled={!name.trim()}
						onClick={() => onCreate(deck)}
					>
						Create room
					</Button>
				</div>
			</div>
		</div>
	);
}

function DeckStatus({
	count,
	total,
	error,
}: {
	count: number;
	total: number | null;
	error: string | null;
}) {
	return (
		<>
			{error ? (
				<p className="font-mono mt-6 text-xs uppercase tracking-[1.5px] text-white">
					{error}
				</p>
			) : null}
			<p className="font-mono mt-6 text-xs uppercase tracking-[1.8px] text-fog">
				{count > 0
					? `${count} of ${total} games — real deck`
					: `fixture deck (${FIXTURE_DECK.length})`}
			</p>
		</>
	);
}

function RoomSim({
	room,
	sim,
}: {
	room: SimRoom;
	sim: ReturnType<typeof useSimRoom>;
}) {
	const hostId = room.users.find((u) => u.host && !u.kicked)?.id ?? null;
	const active = room.users.filter((u) => !u.kicked);

	return (
		<div className="mx-auto w-full max-w-3xl">
			{room.notice ? (
				<p className="font-mono mt-4 text-xs uppercase tracking-[1.5px] text-white">
					{room.notice}
				</p>
			) : null}
			<Lobby
				players={active.map(({ id, name: n }) => ({ id, name: n }))}
				host={hostId}
				you={hostId}
				onStart={sim.start}
			/>
			<div className="mt-8 grid gap-8 md:grid-cols-2">
				{active.map((u) => (
					<UserPane
						key={u.id}
						user={u}
						deck={room.deck}
						started={room.started}
						onSwipe={(gameId, direction) => sim.swipe(u.id, gameId, direction)}
						onKick={() => sim.kick(u.id)}
					/>
				))}
			</div>
			<SimOutcome room={room} />
		</div>
	);
}

function SimOutcome({ room }: { room: SimRoom }) {
	return (
		<>
			{room.match ? <MatchOverlay game={room.match} /> : null}
			{room.noMatch ? (
				<p className="font-mono mt-8 text-center text-xs uppercase tracking-[1.8px] text-fog">
					No match — nobody agreed on anything.
				</p>
			) : null}
		</>
	);
}

function UserPane({
	user,
	deck,
	started,
	onSwipe,
	onKick,
}: {
	user: SimUser;
	deck: GameCard[];
	started: boolean;
	onSwipe: (gameId: number, direction: Direction) => void;
	onKick: () => void;
}) {
	return (
		<section className="border border-white/20 bg-canvas p-4">
			<div className="flex items-center gap-3">
				<span className="font-sans text-lg font-bold text-white">
					{user.name}
				</span>
				{user.host ? <PillTag tone="mint">Host</PillTag> : null}
				{user.fake ? <PillTag tone="slate">Fake</PillTag> : null}
				<button
					type="button"
					onClick={onKick}
					className="font-mono ml-auto cursor-pointer text-[11px] uppercase tracking-[1.1px] text-fog"
				>
					Kick
				</button>
			</div>
			{started ? (
				<SwipeDeck key={user.id} deck={deck} onSwipe={onSwipe} />
			) : (
				<p className="font-mono mt-4 text-[11px] uppercase tracking-[1.1px] text-fog">
					Waiting for start…
				</p>
			)}
		</section>
	);
}
