import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import { getBodyClassName } from "../lib/appShell";
import kelsierCss from "../styles/kelsier.css?url";
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
				title: "Kelsier | Behavioural team intelligence",
			},
			{
				name: "description",
				content:
					"Kelsier reveals the hidden behavioural dynamics shaping every team decision, conflict, and breakthrough.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "stylesheet",
				href: kelsierCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className={getBodyClassName(pathname)}>
				{children}
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
