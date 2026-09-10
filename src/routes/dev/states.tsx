import { createFileRoute, notFound } from "@tanstack/react-router";

import { MatchOverlay, PhaseView } from "#/routes/rooms/$code";
import { FIXTURE_DECK, FIXTURE_PLAYERS } from "#/components/dev-fixtures";

export const Route = createFileRoute("/dev/states")({
	beforeLoad: () => {
		if (!import.meta.env.DEV) throw notFound();
	},
	component: StatePreviews,
});

const noop = () => {};

type PreviewPhase = "name" | "joining" | "room" | "error";

function PhasePreview({
	title,
	phase,
	name = "",
	busy = false,
	problem = null,
	players = [],
	deck = [],
}: {
	title: string;
	phase: PreviewPhase;
	name?: string;
	busy?: boolean;
	problem?: string | null;
	players?: string[];
	deck?: typeof FIXTURE_DECK;
}) {
	return (
		<section>
			<PreviewTitle>{title}</PreviewTitle>
			<PhaseView
				phase={phase}
				problem={problem}
				name={name}
				busy={busy}
				players={players}
				deck={deck}
				onName={noop}
				onJoin={noop}
				onSwipe={noop}
			/>
		</section>
	);
}

function StatePreviews() {
	return (
		<div className="space-y-16 py-12">
			<p className="font-mono text-xs uppercase tracking-[1.8px] text-mint">
				/dev/states — no backend
			</p>
			<PhasePreview title="Join (name)" phase="name" />
			<PhasePreview
				title="Join (joining)"
				phase="joining"
				name="ann"
				busy={true}
			/>
			<PhasePreview
				title="Error"
				phase="error"
				problem="Connection failed — the room needs workerd."
			/>
			<PhasePreview
				title="Room"
				phase="room"
				players={FIXTURE_PLAYERS}
				deck={FIXTURE_DECK}
			/>
			<section>
				<PreviewTitle>Match overlay</PreviewTitle>
				<MatchOverlay game={FIXTURE_DECK[0]} />
			</section>
		</div>
	);
}

function PreviewTitle({ children }: { children: string }) {
	return (
		<p className="font-mono mb-4 text-xs uppercase tracking-[1.8px] text-fog">
			{children}
		</p>
	);
}
