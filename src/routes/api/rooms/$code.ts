import { createFileRoute } from "@tanstack/react-router";
// NOTE: applies the server-route type augmentation from start-client-core
import "@tanstack/react-start";
import { getEnv } from "#/cf-env";

export const Route = createFileRoute("/api/rooms/$code")({
	server: {
		handlers: {
			GET: ({ request, params }) => {
				if (request.headers.get("Upgrade") !== "websocket") {
					return Response.json({
						room: params.code,
						ws: `/api/rooms/${params.code}`,
					});
				}
				return getEnv()
					.then((env) =>
						env.BACKEND.fetch(
							new Request(`https://backend/room/${params.code}`, request),
						),
					)
					.catch(() =>
						Response.json(
							{ error: "room sockets need workerd (alchemy dev / deploy)" },
							{ status: 503 },
						),
					);
			},
		},
	},
});
