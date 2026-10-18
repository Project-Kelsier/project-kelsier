import { defineConfig, devices } from "@playwright/test";

const webServerCommand =
	process.platform === "win32"
		? "node_modules\\.bin\\vite.cmd dev --host 127.0.0.1 --port 3000 --strictPort"
		: "./node_modules/.bin/vite dev --host 127.0.0.1 --port 3000 --strictPort";

export default defineConfig({
	testDir: "./e2e",
	testIgnore: "**/*.transport.spec.ts",
	timeout: 30_000,
	expect: {
		timeout: 5_000,
	},
	use: {
		baseURL: "http://127.0.0.1:3000",
		trace: "on-first-retry",
	},
	webServer: {
		command: webServerCommand,
		url: "http://127.0.0.1:3000",
		reuseExistingServer: !process.env.CI,
		stdout: "ignore",
		stderr: "pipe",
		timeout: 120_000,
	},
	projects: [
		// Local Vite has no edge client IP. Give each browser its own simulated
		// client so parallel journeys do not exhaust one shared creation bucket.
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				extraHTTPHeaders: { "CF-Connecting-IP": "192.0.2.1" },
			},
		},
		{
			name: "firefox",
			use: {
				...devices["Desktop Firefox"],
				extraHTTPHeaders: { "CF-Connecting-IP": "192.0.2.2" },
			},
		},
		{
			name: "webkit",
			use: {
				...devices["Desktop Safari"],
				extraHTTPHeaders: { "CF-Connecting-IP": "192.0.2.3" },
			},
		},
	],
});
