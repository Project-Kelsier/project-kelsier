import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	testMatch: "**/*.transport.spec.ts",
	workers: 1,
	timeout: 60_000,
	use: { browserName: "chromium" },
});
