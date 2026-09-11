import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button, Field, PillTag } from "#/components/ui";
import { FIXTURE_DECK } from "#/components/dev-fixtures";
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
					if (u.fake && !u.kicked && u.swiped < FIXTURE_DECK.length) {
						next = applySwipe(next, u.id, FIXTURE_DECK[u.swiped].id, "right");
					}
				}
				return next;
			});
		}, 1200);
		return () => window.clearInterval(timer);
	}, [room?.started]);

	useEffect(() => {
		if (!room || !room.started || room.match || room.noMatch) return;
		if (!roomDone(room, FIXTURE_DECK)) return;
		const game = evaluateRoom(room, FIXTURE_DECK);
		setRoom((prev) => (prev ? { ...prev, match: game, noMatch: !game } : prev));
	}, [room]);

	const create = (name: string) => setRoom(createRoomState(name));
	const join = (name: string) =>
		setRoom((prev) => (prev ? joinUser(prev, name) : prev));
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

	return (
		<div className="flex min-h-dvh">
			<PlaySidebar
				room={sim.room}
				name={name}
				onName={setName}
				onJoin={() => sim.join(name)}
				onAddFake={sim.addFake}
				onReset={sim.reset}
				onKick={sim.kick}
			/>
			<div className="min-w-0 flex-1 px-6 py-8">
				{sim.room ? (
					<RoomSim room={sim.room} sim={sim} />
				) : (
					<AccessBox
						name={name}
						onName={setName}
						action="Create room"
						onGo={() => sim.create(name)}
					/>
				)}
			</div>
		</div>
	);
}

function AccessBox({
	name,
	onName,
	action,
	onGo,
}: {
	name: string;
	onName: (v: string) => void;
	action: string;
	onGo: () => void;
}) {
	return (
		<form
			className="mx-auto mt-8 w-full max-w-sm"
			onSubmit={(e) => {
				e.preventDefault();
				onGo();
			}}
		>
			<Field
				label="Display name"
				placeholder="e.g. ann"
				value={name}
				onChange={(e) => onName(e.target.value)}
			/>
			<div className="mt-6">
				<Button type="submit" variant="primary" disabled={!name.trim()}>
					{action}
				</Button>
			</div>
		</form>
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
	started,
	onSwipe,
	onKick,
}: {
	user: SimUser;
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
				<SwipeDeck key={user.id} deck={FIXTURE_DECK} onSwipe={onSwipe} />
			) : (
				<p className="font-mono mt-4 text-[11px] uppercase tracking-[1.1px] text-fog">
					Waiting for start…
				</p>
			)}
		</section>
	);
}
