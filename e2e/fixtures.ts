import {
	test as base,
	type ConsoleMessage,
	expect,
	type Page,
	type Request,
	type Response,
} from "@playwright/test";

type Diagnostic = {
	type: string;
	text: string;
	url: string;
	errors: { name: string; message: string }[];
	expected?: boolean;
};
type Failure =
	| { kind: "rpc"; method: "GET" | "POST" }
	| { kind: "scripts" }
	| { kind: "not-found"; url: string };
type Scope = {
	failure: Failure;
	urls: Set<string>;
	diagnostics: Diagnostic[];
	failedRequests: number;
};
type BrowserErrors = {
	expectFailure<T>(
		page: Page,
		failure: Failure,
		action: () => Promise<T>,
	): Promise<T>;
};

const hydration =
	/hydrat|(?:did|does) not match|server[- ]rendered|Minified React error #(418|423|425)\b/i;
const networkMessage =
	/^(Failed to fetch|NetworkError when attempting to fetch resource\.|Load failed)$/;
const routeWarning = /^Warning: Error in route match: \/\/?$/;
const resourceFailure =
	/^Failed to load resource: (net::ERR_FAILED|Load failed|the server responded with a status of 404 \(Not Found\))$/;

function expected(diagnostic: Diagnostic, scope: Scope) {
	if (diagnostic.type === "pageerror" || hydration.test(diagnostic.text))
		return false;
	if (scope.urls.size === 0) return false;
	if (scope.urls.has(diagnostic.url) && resourceFailure.test(diagnostic.text))
		return true;
	return (
		scope.failure.kind === "rpc" &&
		((diagnostic.type === "warning" && routeWarning.test(diagnostic.text)) ||
			(diagnostic.text.includes(
				"The above error occurred in the <MatchInnerImpl> component",
			) &&
				diagnostic.text.includes("CatchBoundary") &&
				diagnostic.errors.some(
					(error) =>
						error.name === "TypeError" && networkMessage.test(error.message),
				)))
	);
}

export const test = base.extend<{
	localClient: { setIp(ip: string): void };
	browserErrors: BrowserErrors;
}>({
	localClient: [
		async ({ context, baseURL, browserName }, use) => {
			if (!baseURL)
				throw new Error("Browser tests require an explicit local baseURL.");
			const origin = new URL(baseURL).origin;
			if (
				!["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname)
			)
				throw new Error(
					"Simulated client IPs must only be sent to a local app.",
				);
			let ip = `192.0.2.${{ chromium: 1, firefox: 2, webkit: 3 }[browserName]}`;
			const pattern = `${origin}/**`;
			await context.route(pattern, (route) =>
				route.fallback({
					headers: { ...route.request().headers(), "CF-Connecting-IP": ip },
				}),
			);
			try {
				await use({
					setIp(value) {
						if (
							!/^192\.0\.2\.\d{1,3}$/.test(value) ||
							Number(value.split(".")[3]) > 255
						)
							throw new Error("Use a reserved test client IP.");
						ip = value;
					},
				});
			} finally {
				await context.unroute(pattern);
			}
		},
		{ auto: true },
	],
	browserErrors: [
		async ({ context }, use, testInfo) => {
			const diagnostics: Diagnostic[] = [];
			const pending = new Set<Promise<void>>();
			const scopes = new Map<Page, Scope>();
			const listeners: (() => void)[] = [];
			const observe = (page: Page) => {
				const onConsole = (message: ConsoleMessage) => {
					if (
						message.type() !== "error" &&
						!(
							message.type() === "warning" &&
							(hydration.test(message.text()) ||
								routeWarning.test(message.text()))
						)
					)
						return;
					const diagnostic: Diagnostic = {
						type: message.type(),
						text: message.text(),
						url: message.location().url,
						errors: [],
					};
					diagnostics.push(diagnostic);
					scopes.get(page)?.diagnostics.push(diagnostic);
					const task = Promise.all(
						message.args().map(async (arg) => {
							try {
								return await arg.evaluate((value) =>
									value instanceof Error
										? { name: value.name, message: value.message }
										: null,
								);
							} catch {
								return null;
							}
						}),
					).then((errors) => {
						diagnostic.errors = errors.filter((error) => error !== null);
					});
					pending.add(task);
					void task.finally(() => pending.delete(task));
				};
				const onError = (error: Error) => {
					diagnostics.push({
						type: "pageerror",
						text: error.stack ?? error.message,
						url: page.url(),
						errors: [],
					});
				};
				const onFailed = (request: Request) => {
					const scope = scopes.get(page);
					if (!scope) return;
					const url = new URL(request.url());
					if (url.origin !== new URL(page.url()).origin) return;
					if (
						(scope.failure.kind === "rpc" &&
							url.pathname.startsWith("/_serverFn/")) ||
						(scope.failure.kind === "scripts" &&
							request.resourceType() === "script")
					) {
						scope.failedRequests++;
						// Count all RPC failures, but witness only the declared method.
						if (
							scope.failure.kind !== "rpc" ||
							request.method() === scope.failure.method
						)
							scope.urls.add(request.url());
					}
				};
				page.on("console", onConsole);
				page.on("pageerror", onError);
				page.on("requestfailed", onFailed);
				listeners.push(() => {
					page.off("console", onConsole);
					page.off("pageerror", onError);
					page.off("requestfailed", onFailed);
				});
			};
			context.on("page", observe);
			for (const page of context.pages()) observe(page);
			try {
				await use({
					async expectFailure(page, failure, action) {
						if (scopes.has(page))
							throw new Error(
								"Failure expectations cannot overlap on one page.",
							);
						return base.step(
							`Expected browser failure: ${failure.kind}`,
							async () => {
								console.info(
									`[Expected browser failure] ${failure.kind}; only matching diagnostics are permitted in this step.`,
								);
								const scope: Scope = {
									failure,
									urls: new Set(),
									diagnostics: [],
									failedRequests: 0,
								};
								const onResponse = (response: Response) => {
									if (
										failure.kind === "not-found" &&
										response.url() === failure.url &&
										response.status() === 404 &&
										response.request().isNavigationRequest()
									)
										scope.urls.add(response.url());
								};
								scopes.set(page, scope);
								page.on("response", onResponse);
								try {
									const result = await action();
									// Drain console events emitted before this protocol round trip.
									if (!page.isClosed()) await page.evaluate(() => undefined);
									await Promise.all(pending);
									expect(
										scope.urls.size,
										"The declared network failure must actually occur",
									).toBeGreaterThan(0);
									if (failure.kind === "rpc")
										expect(
											scope.failedRequests,
											"Exactly one intended RPC must fail; recovery requests must succeed",
										).toBe(1);
									for (const diagnostic of scope.diagnostics)
										diagnostic.expected = expected(diagnostic, scope);
									return result;
								} finally {
									scopes.delete(page);
									page.off("response", onResponse);
								}
							},
						);
					},
				});
			} finally {
				await Promise.all(pending);
				context.off("page", observe);
				for (const remove of listeners) remove();
				if (diagnostics.length)
					await testInfo.attach("browser-errors", {
						body: JSON.stringify(diagnostics, null, 2),
						contentType: "application/json",
					});
				expect(
					diagnostics.filter((diagnostic) => !diagnostic.expected),
					"Unexpected browser errors",
				).toEqual([]);
			}
		},
		{ auto: true },
	],
});

export { expect };
