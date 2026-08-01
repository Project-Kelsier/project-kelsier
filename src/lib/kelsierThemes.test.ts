import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	DEFAULT_KELSIER_THEME,
	isKelsierTheme,
	KELSIER_THEME_BOOTSTRAP_SCRIPT,
	KELSIER_THEME_STORAGE_KEY,
	KELSIER_THEMES,
} from "./kelsierThemes";

const kelsierCss = readFileSync(
	resolve(process.cwd(), "src/styles/kelsier.css"),
	"utf8",
);

const requiredPaletteTokens = [
	"--k-void",
	"--k-bg-edge",
	"--k-accent",
	"--k-accent-hover",
	"--k-text",
	"--k-text-muted",
	"--k-text-soft",
	"--k-text-hover",
	"--k-on-accent",
	"--k-data-1",
	"--k-data-2",
	"--k-data-3",
	"--k-data-5",
];

function getCssBlock(selector: string) {
	const start = kelsierCss.indexOf(`${selector} {`);
	if (start === -1) {
		return null;
	}

	const end = kelsierCss.indexOf("}", start);
	return kelsierCss.slice(start, end);
}

describe("Kelsier themes", () => {
	it("keeps theme IDs unique and validates only registered themes", () => {
		const themeIds = KELSIER_THEMES.map((theme) => theme.id);

		expect(new Set(themeIds).size).toBe(themeIds.length);
		expect(themeIds).toContain(DEFAULT_KELSIER_THEME);
		for (const themeId of themeIds) {
			expect(isKelsierTheme(themeId)).toBe(true);
		}
		expect(isKelsierTheme("unsupported")).toBe(false);
	});

	it("restores every registered theme from the shared bootstrap data", () => {
		expect(KELSIER_THEME_BOOTSTRAP_SCRIPT).toContain(
			JSON.stringify(KELSIER_THEME_STORAGE_KEY),
		);
		for (const theme of KELSIER_THEMES) {
			expect(KELSIER_THEME_BOOTSTRAP_SCRIPT).toContain(`"${theme.id}"`);
		}
	});

	it("defines the complete default palette on root", () => {
		const rootBlock = getCssBlock(":root");

		expect(rootBlock).not.toBeNull();
		for (const token of requiredPaletteTokens) {
			expect(rootBlock).toContain(token);
		}
	});

	it("defines complete CSS overrides for every non-default theme", () => {
		for (const theme of KELSIER_THEMES) {
			if (theme.id === DEFAULT_KELSIER_THEME) {
				continue;
			}

			const themeBlock = getCssBlock(`:root[data-kelsier-theme="${theme.id}"]`);
			expect(
				themeBlock,
				`${theme.label} is missing its CSS block`,
			).not.toBeNull();
			for (const token of requiredPaletteTokens) {
				expect(themeBlock, `${theme.label} is missing ${token}`).toContain(
					token,
				);
			}
		}
	});
});
