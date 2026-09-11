import { Button, Field } from "#/components/ui";
import { FIXTURE_DECK } from "#/components/dev-fixtures";
import type { SimRoom } from "#/components/fake-room";

export function PlaySidebar({
	room,
	name,
	onName,
	onJoin,
	onAddFake,
	onReset,
	onKick,
}: {
	room: SimRoom | null;
	name: string;
	onName: (v: string) => void;
	onJoin: () => void;
	onAddFake: () => void;
	onReset: () => void;
	onKick: (id: string) => void;
}) {
	return (
		<aside className="sticky top-0 h-dvh w-80 shrink-0 overflow-y-auto border-r border-white/20 px-5 py-6">
			<p className="font-mono text-xs uppercase tracking-[1.8px] text-mint">
				Playground
			</p>
			<p className="font-mono mt-1 text-[11px] uppercase tracking-[1.1px] text-fog">
				Fake backend — no WS
			</p>
			<RoomStatusBox room={room} />
			{room ? <RosterTable room={room} onKick={onKick} /> : null}
			<SidebarControls
				roomExists={room !== null}
				name={name}
				onName={onName}
				onJoin={onJoin}
				onAddFake={onAddFake}
				onReset={onReset}
			/>
		</aside>
	);
}

function RoomStatusBox({ room }: { room: SimRoom | null }) {
	return (
		<div className="mt-6 border border-white/20 p-4">
			<p className="font-mono text-[11px] uppercase tracking-[1.1px] text-fog">
				Room
			</p>
			<p className="font-mono mt-1 text-2xl tracking-[2px] text-white">
				{room?.code ?? "——"}
			</p>
			<p className="font-mono mt-1 text-[11px] uppercase tracking-[1.1px] text-fog">
				{roomStatus(room)}
				{room?.match ? " · match" : ""}
				{room?.noMatch ? " · no-match" : ""}
			</p>
		</div>
	);
}

function roomStatus(room: SimRoom | null): string {
	if (room && room.started) return "started";
	if (room) return "lobby";
	return "none";
}

function SidebarControls({
	roomExists,
	name,
	onName,
	onJoin,
	onAddFake,
	onReset,
}: {
	roomExists: boolean;
	name: string;
	onName: (v: string) => void;
	onJoin: () => void;
	onAddFake: () => void;
	onReset: () => void;
}) {
	return (
		<div className="mt-6 border border-white/20 p-4">
			<p className="font-mono text-[11px] uppercase tracking-[1.1px] text-fog">
				Controls
			</p>
			<div className="mt-3">
				<Field
					label="Join as"
					placeholder="e.g. dave"
					value={name}
					onChange={(e) => onName(e.target.value)}
				/>
			</div>
			<div className="mt-3 flex flex-wrap gap-2">
				{roomExists ? (
					<Button variant="secondary" disabled={!name.trim()} onClick={onJoin}>
						Join room
					</Button>
				) : null}
				<Button variant="secondary" onClick={onAddFake}>
					Add fake
				</Button>
				<Button variant="tertiary" onClick={onReset}>
					Reset
				</Button>
			</div>
		</div>
	);
}

function RosterTable({
	room,
	onKick,
}: {
	room: SimRoom;
	onKick: (id: string) => void;
}) {
	return (
		<div className="mt-6 border border-white/20">
			<div className="border-b border-white/20 px-3 py-2">
				<p className="font-mono text-[11px] uppercase tracking-[1.1px] text-fog">
					Roster · {room.users.filter((u) => !u.kicked).length} active
				</p>
			</div>
			<ul>
				{room.users.map((u) => (
					<li
						key={u.id}
						className="flex items-center gap-2 border-b border-white/10 px-3 py-2 font-mono text-xs text-white last:border-b-0"
					>
						<span className={u.kicked ? "text-fog line-through" : ""}>
							{u.name}
						</span>
						{u.host && !u.kicked ? (
							<span className="text-mint">[H]</span>
						) : null}
						{u.fake && !u.kicked ? <span className="text-fog">[F]</span> : null}
						{u.kicked ? <span className="text-fog">[X]</span> : null}
						<span className="ml-auto text-fog">
							{u.swiped}/{FIXTURE_DECK.length}·{u.likes.length}♥
						</span>
						{u.kicked ? null : (
							<button
								type="button"
								onClick={() => onKick(u.id)}
								className="cursor-pointer uppercase tracking-[1.1px] text-fog hover:text-link"
							>
								Kick
							</button>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}
