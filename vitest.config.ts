import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { appVersionDefine } from "./config/app-version.ts";

export default defineConfig({
	define: appVersionDefine,
	plugins: [viteReact()],
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		environment: "jsdom",
		// Let jsdom own storage on Node 26; Vitest 4 otherwise keeps Node's globals.
		// Revisit with Vitest 5: https://github.com/vitest-dev/vitest/issues/10867
		execArgv: ["--no-experimental-webstorage"],
		globals: true,
		include: ["src/**/*.test.{ts,tsx}"],
		exclude: ["e2e/**", "playwright.config.ts", "src/routeTree.gen.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
		},
	},
});
