import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Scripts,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import { KelsierNotFoundPage } from "../components/kelsier/KelsierNotFoundPage";
import { getBodyClassName } from "../lib/appShell";
import { KELSIER_THEME_BOOTSTRAP_SCRIPT } from "../lib/kelsierThemes";
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
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com",
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Geist+Mono:wght@400;500&family=Geist:wght@300;400;500&display=swap",
			},
			{
				rel: "stylesheet",
				href: kelsierCss,
			},
		],
	}),
	notFoundComponent: KelsierNotFoundPage,
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
				<script>{KELSIER_THEME_BOOTSTRAP_SCRIPT}</script>
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
