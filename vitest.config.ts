import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [viteReact()],
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		environment: "jsdom",
		globals: true,
		include: ["src/**/*.test.{ts,tsx}"],
		exclude: ["e2e/**", "playwright.config.ts", "src/routeTree.gen.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
		},
	},
});
