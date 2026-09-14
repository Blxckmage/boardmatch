import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { Button, Field } from "#/components/ui";
import { FIXTURE_DECK } from "#/components/dev-fixtures";
import { useCollectionFetch } from "#/components/create-flow";
import {
	addFakeUser,
	applySwipe,
	createRoomState,
	dropUser,
	evaluateRoom,
	joinUser,
	kickUser,
	rejoinUser,
	roomDone,
	startRoom,
	type SimRoom,
} from "#/components/fake-room";
import { PlaySidebar } from "#/components/play-sidebar";
import { RoomSim } from "#/components/play-sim";
import { FetchForm } from "#/routes/create";
import type { GameCard } from "#/server/room-protocol";

export const Route = createFileRoute("/playground")({
	beforeLoad: () => {
		if (!import.meta.env.DEV) throw notFound();
	},
	component: Playground,
});

function simActions(setRoom: Dispatch<SetStateAction<SimRoom | null>>) {
	return {
		create: (name: string, deck: GameCard[]) =>
			setRoom(createRoomState(name, deck)),
		join: (name: string, code: string) =>
			setRoom((prev) => (prev ? joinUser(prev, name, code) : prev)),
		start: () => setRoom((prev) => (prev ? startRoom(prev) : prev)),
		swipe: (userId: string, gameId: number, direction: "left" | "right") =>
			setRoom((prev) =>
				prev ? applySwipe(prev, userId, gameId, direction) : prev,
			),
		kick: (id: string) => setRoom((prev) => (prev ? kickUser(prev, id) : prev)),
		drop: (id: string) => setRoom((prev) => (prev ? dropUser(prev, id) : prev)),
		rejoin: (id: string) =>
			setRoom((prev) => (prev ? rejoinUser(prev, id) : prev)),
		addFake: () => setRoom((prev) => (prev ? addFakeUser(prev) : prev)),
		reset: () => setRoom(null),
	};
}

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

	return { room, ...simActions(setRoom) };
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
