import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Button } from "#/components/ui";
import type { CollectionGame } from "#/server/collection.functions";
import { createRoom } from "#/server/room.functions";

export function CreateRoomButton({ games }: { games: CollectionGame[] }) {
	const run = useServerFn(createRoom);
	const [room, setRoom] = useState<{ code: string; path: string } | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const submit = async () => {
		setBusy(true);
		setError(null);
		try {
			setRoom(
				await run({
					data: {
						deck: games.map((g) => ({
							id: g.id,
							name: g.name,
							thumbnail: g.thumbnail,
						})),
					},
				}),
			);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setBusy(false);
		}
	};

	if (room) {
		return (
			<RoomCreated code={room.code} path={room.path} count={games.length} />
		);
	}

	return (
		<div className="mt-6">
			<Button variant="primary" disabled={busy} onClick={submit}>
				{busy ? "Creating…" : "Create room"}
			</Button>
			{error && (
				<p className="font-mono mt-4 text-xs uppercase tracking-[1.5px] text-white">
					{error}
				</p>
			)}
		</div>
	);
}

function RoomCreated({
	code,
	path,
	count,
}: {
	code: string;
	path: string;
	count: number;
}) {
	const link = `${window.location.origin}${path}`;
	return (
		<div className="mt-6">
			<p className="font-mono text-xs uppercase tracking-[1.8px] text-mint">
				Room {code} · {count} games
			</p>
			<p className="mt-2 font-sans text-lg text-white">{link}</p>
		</div>
	);
}
