import { expect, test } from "@playwright/test";
import { type PreviewServer, preview } from "vite";

test("redacts unexpected database errors through the production RPC transport", async ({
	page,
	request,
}) => {
	const database =
		process.env.DATABASE_URL ??
		"postgres://kelsier:kelsier@localhost:55432/kelsier_dev";
	const target = new URL(database);
	if (
		!["postgres:", "postgresql:"].includes(target.protocol) ||
		!["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
		target.pathname !== "/kelsier_dev"
	) {
		throw new Error("Transport tests require the local kelsier_dev database.");
	}

	const previousEnvironment = {
		DATABASE_URL: process.env.DATABASE_URL,
		DATABASE_URL_POOLED: process.env.DATABASE_URL_POOLED,
		CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE:
			process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE,
		WRANGLER_SEND_METRICS: process.env.WRANGLER_SEND_METRICS,
		WRANGLER_LOG: process.env.WRANGLER_LOG,
	};
	const configureDatabase = (value: string) => {
		process.env.DATABASE_URL = value;
		process.env.DATABASE_URL_POOLED = value;
		process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE =
			value;
	};
	const base = "http://127.0.0.1:4191";
	const startPreview = () =>
		preview({
			preview: { host: "127.0.0.1", port: 4191, strictPort: true },
			clearScreen: false,
		});
	let server: PreviewServer | undefined;
	try {
		process.env.WRANGLER_SEND_METRICS = "false";
		process.env.WRANGLER_LOG = "error";
		configureDatabase(database);
		server = await startPreview();
		await page.setExtraHTTPHeaders({ "CF-Connecting-IP": "192.0.2.41" });
		await page.goto(base);
		await expect(
			page.locator(".kelsier-page[data-hydrated='true']"),
		).toBeVisible();

		// Capture the application's real RPC encoding, but abort before creation
		// reaches the server so the test never leaves an assessment fixture behind.
		await page.route("**/_serverFn/**", (route) => route.abort());
		const [creation] = await Promise.all([
			page.waitForRequest(
				(candidate) =>
					candidate.method() === "POST" &&
					new URL(candidate.url()).pathname.startsWith("/_serverFn/"),
			),
			page.getByRole("button", { name: "Start and save progress" }).click(),
		]);
		const headers = await creation.allHeaders();
		for (const name of ["cookie", "host", "content-length"])
			delete headers[name];
		const payload = creation.postData() ?? "";
		await page.close();
		await server.close();
		server = undefined;

		// Only this preview process gets the failing loopback connection. Replaying
		// the captured request exercises the built handler and actual serialization.
		const secretCanary = "TRANSPORT_TEST_PASSWORD_CANARY";
		configureDatabase(
			`postgres://kelsier:${secretCanary}@127.0.0.1:1/kelsier_dev?connect_timeout=1`,
		);
		server = await startPreview();
		const response = await request.post(creation.url(), {
			headers,
			data: payload,
			timeout: 15_000,
		});
		const body = await response.text();
		expect(response.status()).toBe(500);
		expect(response.headers()["cache-control"]).toBe("private, no-store");
		expect(body).toContain(
			"The assessment request is temporarily unavailable.",
		);
		expect(body).not.toMatch(/Failed query|select\s+.+\s+from|insert into/is);
		expect(body).not.toContain(secretCanary);
	} finally {
		try {
			await server?.close();
		} finally {
			for (const [key, value] of Object.entries(previousEnvironment)) {
				if (value === undefined) delete process.env[key];
				else process.env[key] = value;
			}
		}
	}
});
