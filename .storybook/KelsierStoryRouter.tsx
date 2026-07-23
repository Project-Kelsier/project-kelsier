import {
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { type ReactNode, useMemo } from "react";

type KelsierStoryRouterProps = {
	children: ReactNode;
	initialPath?: "/" | "/privacy" | "/terms";
};

export function KelsierStoryRouter({
	children,
	initialPath = "/",
}: KelsierStoryRouterProps) {
	const router = useMemo(() => {
		const rootRoute = createRootRoute();
		const indexRoute = createRoute({
			getParentRoute: () => rootRoute,
			path: "/",
			component: () => <>{children}</>,
		});
		const privacyRoute = createRoute({
			getParentRoute: () => rootRoute,
			path: "/privacy",
			component: () => <>{children}</>,
		});
		const termsRoute = createRoute({
			getParentRoute: () => rootRoute,
			path: "/terms",
			component: () => <>{children}</>,
		});

		const routeTree = rootRoute.addChildren([
			indexRoute,
			privacyRoute,
			termsRoute,
		]);

		return createRouter({
			routeTree,
			history: createMemoryHistory({ initialEntries: [initialPath] }),
		});
	}, [children, initialPath]);

	return <RouterProvider router={router} />;
}
