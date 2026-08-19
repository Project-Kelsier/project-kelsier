import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { appVersionDefine } from "./config/app-version.ts";

const config = defineConfig(({ command }) => {
	// Wrangler loads local Worker variables during multiple Vite environments.
	// Keep routine startup quiet while allowing explicit diagnostic overrides.
	if (command === "serve" && process.env.WRANGLER_LOG === undefined) {
		process.env.WRANGLER_LOG = "warn";
	}

	return {
		define: appVersionDefine,
		plugins: [
			cloudflare({ viteEnvironment: { name: "ssr" } }),
			devtools(),
			tailwindcss(),
			tanstackStart(),
			viteReact(),
		],
		resolve: {
			tsconfigPaths: true,
		},
	};
});

export default config;
