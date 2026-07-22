import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";

const srcPath = fileURLToPath(new URL("../src", import.meta.url));
const packageJson = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

const config: StorybookConfig = {
	stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
	addons: ["@storybook/addon-a11y"],
	framework: {
		name: "@storybook/react-vite",
		options: {},
	},
	core: {
		builder: {
			name: "@storybook/builder-vite",
			options: {
				viteConfigPath: ".storybook/vite.config.ts",
			},
		},
	},
	viteFinal: async (viteConfig) => {
		const existingAlias = viteConfig.resolve?.alias;
		const aliasEntries = Array.isArray(existingAlias)
			? existingAlias
			: Object.entries(existingAlias ?? {}).map(([find, replacement]) => ({
					find,
					replacement,
				}));

		viteConfig.define = {
			...viteConfig.define,
			__APP_VERSION__: JSON.stringify(packageJson.version),
		};
		viteConfig.resolve = {
			...viteConfig.resolve,
			alias: [
				...aliasEntries,
				{ find: /^#\//, replacement: `${srcPath}/` },
				{ find: /^@\//, replacement: `${srcPath}/` },
			],
		};
		viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()];

		return viteConfig;
	},
};

export default config;
