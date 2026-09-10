import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent } from "react";

import { Button, Field } from "#/components/ui";
import { useCollectionFetch, useRoomCreate } from "#/components/create-flow";
import type { CollectionGame } from "#/server/collection.functions";

export const Route = createFileRoute("/create")({ component: CreatePage });

function CreatePage() {
	const col = useCollectionFetch();
	const room = useRoomCreate(col.games, col.picked);
	const error = col.error ?? room.error;
	const busy = col.busy || room.busy;

	return (
		<div className="mx-auto w-full max-w-2xl py-12">
			<p className="font-mono text-xs uppercase tracking-[1.8px] text-mint">
				Host setup
			</p>
			<h1 className="mt-2 font-sans text-2xl font-bold text-white">
				Fetch a BGG collection
			</h1>
			<FetchForm
				busy={col.busy}
				fields={col.fields}
				setters={col.setters}
				onFetch={col.fetch}
			/>
			{error && (
				<p className="font-mono mt-6 text-xs uppercase tracking-[1.5px] text-white">
					{error}
				</p>
			)}
			{col.total !== null && (
				<>
					<PoolList
						games={col.games}
						total={col.total}
						picked={col.picked}
						onToggle={col.toggle}
						onSelectAll={col.selectAll}
					/>
					<HostCreate
						host={room.host}
						busy={busy}
						ready={room.ready}
						onHost={room.setHost}
						onCreate={room.create}
					/>
				</>
			)}
		</div>
	);
}

function FetchForm({
	busy,
	fields,
	setters,
	onFetch,
}: {
	busy: boolean;
	fields: Record<"username" | "players" | "maxPlaytime", string>;
	setters: Record<"username" | "players" | "maxPlaytime", (v: string) => void>;
	onFetch: (e: FormEvent) => void;
}) {
	return (
		<form onSubmit={onFetch} className="mt-6 grid gap-6 md:grid-cols-3">
			<Field
				label="BGG username"
				placeholder="e.g. Blxckmage"
				value={fields.username}
				onChange={(e) => setters.username(e.target.value)}
			/>
			<Field
				label="Players"
				type="number"
				min={1}
				placeholder="e.g. 4"
				value={fields.players}
				onChange={(e) => setters.players(e.target.value)}
			/>
			<Field
				label="Max minutes"
				type="number"
				min={1}
				placeholder="e.g. 60"
				value={fields.maxPlaytime}
				onChange={(e) => setters.maxPlaytime(e.target.value)}
			/>
			<div className="md:col-span-3">
				<Button type="submit" variant="secondary" disabled={busy}>
					{busy ? "Fetching…" : "Fetch collection"}
				</Button>
			</div>
		</form>
	);
}

function PoolList({
	games,
	total,
	picked,
	onToggle,
	onSelectAll,
}: {
	games: CollectionGame[];
	total: number;
	picked: Set<number>;
	onToggle: (id: number) => void;
	onSelectAll: (on: boolean) => void;
}) {
	return (
		<div className="mt-8">
			<div className="flex items-center justify-between">
				<p className="font-mono text-xs uppercase tracking-[1.8px] text-fog">
					{picked.size} of {total} picked
				</p>
				<div className="flex gap-4">
					<button
						type="button"
						onClick={() => onSelectAll(true)}
						className="font-mono cursor-pointer text-[11px] uppercase tracking-[1.1px] text-mint"
					>
						All
					</button>
					<button
						type="button"
						onClick={() => onSelectAll(false)}
						className="font-mono cursor-pointer text-[11px] uppercase tracking-[1.1px] text-fog"
					>
						None
					</button>
				</div>
			</div>
			<ul className="mt-4 space-y-2">
				{games.map((game) => (
					<PoolRow
						key={game.id}
						game={game}
						checked={picked.has(game.id)}
						onToggle={onToggle}
					/>
				))}
			</ul>
		</div>
	);
}

function PoolRow({
	game,
	checked,
	onToggle,
}: {
	game: CollectionGame;
	checked: boolean;
	onToggle: (id: number) => void;
}) {
	return (
		<li>
			<label className="rounded-tile flex cursor-pointer items-center gap-4 border border-white bg-canvas px-5 py-3">
				<input
					type="checkbox"
					checked={checked}
					onChange={() => onToggle(game.id)}
					className="h-5 w-5 shrink-0 cursor-pointer accent-mint"
				/>
				<span>
					<span className="block font-sans text-lg font-bold text-white">
						{game.name}
					</span>
					<span className="font-mono block text-[11px] uppercase tracking-[1.1px] text-fog">
						{game.minPlayers ?? "?"}–{game.maxPlayers ?? "?"} players
						{game.playtime !== undefined && ` · ${game.playtime} min`}
					</span>
				</span>
			</label>
		</li>
	);
}

function HostCreate({
	host,
	busy,
	ready,
	onHost,
	onCreate,
}: {
	host: string;
	busy: boolean;
	ready: boolean;
	onHost: (v: string) => void;
	onCreate: () => void;
}) {
	return (
		<div className="mt-8">
			<Field
				label="Your display name (host)"
				placeholder="e.g. Faza"
				value={host}
				onChange={(e) => onHost(e.target.value)}
			/>
			<div className="mt-6">
				<Button variant="primary" disabled={busy || !ready} onClick={onCreate}>
					{busy ? "Creating…" : "Create room"}
				</Button>
			</div>
		</div>
	);
}
