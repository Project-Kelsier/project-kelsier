import { defineConfig, devices } from "@playwright/test";

const webServerCommand =
	process.platform === "win32"
		? "node_modules\\.bin\\vite.cmd dev --host 127.0.0.1 --port 3000 --strictPort"
		: "./node_modules/.bin/vite dev --host 127.0.0.1 --port 3000 --strictPort";

export default defineConfig({
	testDir: "./e2e",
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
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
	],
});
