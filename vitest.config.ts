import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] }), viteReact()],
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
