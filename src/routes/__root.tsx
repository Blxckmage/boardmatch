import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Link,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";

import { Button } from "#/components/ui";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Boardmatch",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<header className="border-b border-white/10">
					<nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
						<Link
							to="/"
							className="font-display text-2xl tracking-wide text-white transition-colors hover:text-link"
						>
							BOARDMATCH
						</Link>
						<div className="flex items-center gap-6">
							<Link
								to="/"
								className="font-mono text-xs uppercase tracking-[1.5px] text-white transition-colors hover:text-link"
							>
								Rooms
							</Link>
							<Button variant="primary">Create room</Button>
						</div>
					</nav>
				</header>
				<main className="mx-auto w-full max-w-5xl px-6">{children}</main>
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
