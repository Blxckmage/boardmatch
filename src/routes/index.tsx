import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";

import { Button, Field } from "#/components/ui";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<div className="flex min-h-dvh flex-col items-center justify-center py-8">
			<SiteHero />
			<EntryChoices />
		</div>
	);
}

function SiteHero() {
	return (
		<div className="text-center">
			<p className="font-mono text-xs uppercase tracking-[1.8px] text-mint">
				Swipe &middot; Match &middot; Play
			</p>
			<h1 className="font-display mt-4 text-6xl leading-display text-white md:text-8xl">
				BOARDMATCH
			</h1>
			<p className="mx-auto mt-4 max-w-xl font-sans text-[19px] font-light tracking-[1.9px] text-bone">
				One deck, one group, one game tonight.
			</p>
		</div>
	);
}

function EntryChoices() {
	const navigate = useNavigate();
	const [code, setCode] = useState("");

	const join = (e: FormEvent) => {
		e.preventDefault();
		const trimmed = code.trim().toUpperCase();
		if (!trimmed) return;
		void navigate({
			to: "/rooms/$code",
			params: { code: trimmed },
			search: { name: undefined },
		});
	};

	const create = () => {
		void navigate({ to: "/create" });
	};

	return (
		<section className="mx-auto mt-8 grid w-full max-w-2xl gap-6 md:grid-cols-2">
			<JoinCard code={code} onCode={setCode} onJoin={join} />
			<div className="rounded-tile border border-white bg-canvas p-6">
				<p className="font-sans text-lg font-bold text-white">
					Hosting tonight?
				</p>
				<p className="font-mono mt-2 text-[11px] uppercase tracking-[1.1px] text-fog">
					Fetch your collection, pick the pool
				</p>
				<div className="mt-6">
					<Button variant="secondary" onClick={create}>
						Create room
					</Button>
				</div>
			</div>
		</section>
	);
}

function JoinCard({
	code,
	onCode,
	onJoin,
}: {
	code: string;
	onCode: (v: string) => void;
	onJoin: (e: FormEvent) => void;
}) {
	return (
		<form
			onSubmit={onJoin}
			className="rounded-tile border border-white bg-canvas p-6"
		>
			<Field
				label="Room code"
				placeholder="e.g. KX7Q2M"
				value={code}
				onChange={(e) => onCode(e.target.value)}
			/>
			<div className="mt-6">
				<Button type="submit" variant="primary" disabled={!code.trim()}>
					Join room
				</Button>
			</div>
		</form>
	);
}
