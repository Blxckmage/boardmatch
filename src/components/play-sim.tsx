import { Lobby, MatchOverlay, RoomHeader } from "#/components/room-views";
import { SwipeDeck } from "#/components/swipe-deck";
import type { Direction } from "#/components/swipe-deck";
import { PillTag } from "#/components/ui";
import type { SimRoom, SimUser } from "#/components/fake-room";
import type { GameCard } from "#/server/room-protocol";

export type PlaySim = {
	start: () => void;
	swipe: (userId: string, gameId: number, direction: Direction) => void;
	kick: (id: string) => void;
	drop: (id: string) => void;
	rejoin: (id: string) => void;
};

export function RoomSim({ room, sim }: { room: SimRoom; sim: PlaySim }) {
	const hostId =
		room.users.find((u) => u.host && !u.kicked && !u.away)?.id ?? null;
	const active = room.users.filter((u) => !u.kicked);

	return (
		<div className="mx-auto w-full max-w-3xl">
			{room.notice ? (
				<p className="font-mono mt-4 text-xs uppercase tracking-[1.5px] text-white">
					{room.notice}
				</p>
			) : null}
			<RoomHeader code={room.code} />
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
						onDrop={() => sim.drop(u.id)}
						onRejoin={() => sim.rejoin(u.id)}
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

function PaneActions({
	away,
	onKick,
	onDrop,
	onRejoin,
}: {
	away: boolean;
	onKick: () => void;
	onDrop: () => void;
	onRejoin: () => void;
}) {
	return (
		<>
			<button
				type="button"
				onClick={onKick}
				className="font-mono ml-auto cursor-pointer text-[11px] uppercase tracking-[1.1px] text-fog"
			>
				Kick
			</button>
			<button
				type="button"
				onClick={away ? onRejoin : onDrop}
				className="font-mono cursor-pointer text-[11px] uppercase tracking-[1.1px] text-fog"
			>
				{away ? "Rejoin" : "Drop"}
			</button>
		</>
	);
}

function UserPane({
	user,
	deck,
	started,
	onSwipe,
	onKick,
	onDrop,
	onRejoin,
}: {
	user: SimUser;
	deck: GameCard[];
	started: boolean;
	onSwipe: (gameId: number, direction: Direction) => void;
	onKick: () => void;
	onDrop: () => void;
	onRejoin: () => void;
}) {
	return (
		<section className="border border-white/20 bg-canvas p-4">
			<div className="flex items-center gap-3">
				<span className="font-sans text-lg font-bold text-white">
					{user.name}
				</span>
				{user.host ? <PillTag tone="mint">Host</PillTag> : null}
				{user.fake ? <PillTag tone="slate">Fake</PillTag> : null}
				{user.away ? <PillTag tone="slate">Away</PillTag> : null}
				<PaneActions
					away={user.away}
					onKick={onKick}
					onDrop={onDrop}
					onRejoin={onRejoin}
				/>
			</div>
			{user.away ? (
				<p className="font-mono mt-4 text-[11px] uppercase tracking-[1.1px] text-fog">
					Away — seat held in grace…
				</p>
			) : started ? (
				<SwipeDeck key={user.id} deck={deck} onSwipe={onSwipe} />
			) : (
				<p className="font-mono mt-4 text-[11px] uppercase tracking-[1.1px] text-fog">
					Waiting for start…
				</p>
			)}
		</section>
	);
}
