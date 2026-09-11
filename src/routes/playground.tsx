import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "#/components/ui";
import { FIXTURE_DECK } from "#/components/dev-fixtures";
import { useFakeMatch, useFakeRoster } from "#/components/fake-room";
import { PhaseView } from "#/routes/rooms/$code";
import type { Direction } from "#/components/swipe-deck";

export const Route = createFileRoute("/playground")({
	beforeLoad: () => {
		if (!import.meta.env.DEV) throw notFound();
	},
	component: Playground,
});

type PlaygroundPhase = "name" | "lobby" | "deck";

function usePlayground() {
	const roster = useFakeRoster();
	const [phase, setPhase] = useState<PlaygroundPhase>("name");
	const [name, setName] = useState("");
	const [mode, setMode] = useState<"host" | "guest">("host");
	const [runId, setRunId] = useState(0);
	const fakeMatch = useFakeMatch(roster.players, roster.you);

	const join = (asName?: string) => {
		const id = roster.joinAs(asName ?? name, mode === "host");
		if (id) setPhase("lobby");
	};

	const swipe = (gameId: number, direction: Direction) => {
		if (direction === "right") fakeMatch.recordLike(gameId);
	};

	const reset = (nextMode: "host" | "guest") => {
		roster.resetRoster();
		fakeMatch.resetMatch();
		setMode(nextMode);
		setName("");
		setPhase("name");
		setRunId((n) => n + 1);
	};

	return {
		roster,
		phase,
		name,
		mode,
		runId,
		fakeMatch,
		join,
		swipe,
		reset,
		setName,
		setPhase,
	};
}

function Playground() {
	const g = usePlayground();

	return (
		<div className="py-8">
			<p className="font-mono bg-uv px-4 py-2 text-center text-xs uppercase tracking-[1.8px] text-white">
				Fake backend — playground only
			</p>
			<PhaseView
				key={g.runId}
				phase={g.phase}
				problem={null}
				name={g.name}
				busy={false}
				deck={g.phase === "deck" ? FIXTURE_DECK : []}
				players={g.roster.players}
				host={g.roster.host}
				you={g.roster.you}
				onName={g.setName}
				onJoin={() => g.join()}
				onSwipe={g.swipe}
				onStart={() => g.setPhase("deck")}
			/>
			<ControlPanel
				mode={g.mode}
				fakeIds={g.roster.players
					.filter((p) => p.id !== g.roster.you)
					.map((p) => ({ id: p.id, name: p.name }))}
				onMode={g.reset}
				onForce={g.fakeMatch.forceMatch}
				onDrop={g.roster.dropPlayer}
				onAddLate={g.roster.addLateJoiner}
			/>
		</div>
	);
}

function ControlPanel({
	mode,
	fakeIds,
	onMode,
	onForce,
	onDrop,
	onAddLate,
}: {
	mode: "host" | "guest";
	fakeIds: { id: string; name: string }[];
	onMode: (mode: "host" | "guest") => void;
	onForce: () => void;
	onDrop: (id: string) => void;
	onAddLate: () => void;
}) {
	return (
		<div className="rounded-tile mt-8 border border-white bg-canvas p-6">
			<p className="font-mono text-xs uppercase tracking-[1.8px] text-fog">
				Chaos controls
			</p>
			<div className="mt-4 flex flex-wrap gap-3">
				<Button variant="secondary" onClick={onForce}>
					Force match
				</Button>
				<Button variant="secondary" onClick={onAddLate}>
					Add late joiner
				</Button>
				<Button
					variant="secondary"
					onClick={() => onMode(mode === "host" ? "guest" : "host")}
				>
					Reset as {mode === "host" ? "guest" : "host"}
				</Button>
				{fakeIds.map((p) => (
					<Button key={p.id} variant="tertiary" onClick={() => onDrop(p.id)}>
						Drop {p.name}
					</Button>
				))}
			</div>
		</div>
	);
}
