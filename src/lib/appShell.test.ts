import { describe, expect, it } from "vitest";
import {
	getBodyClassName,
	isKelsierHomepage,
	isKelsierSurface,
} from "./appShell";

describe("app shell routing", () => {
	it("treats the root path as the Kelsier homepage", () => {
		expect(isKelsierHomepage("/")).toBe(true);
		expect(getBodyClassName("/")).toContain("kelsier-body");
	});

	it("keeps Kelsier body styles scoped to the homepage", () => {
		expect(isKelsierHomepage("/privacy")).toBe(false);
		expect(getBodyClassName("/privacy")).not.toContain("kelsier-body");
	});

	it("uses Kelsier body styles for unmatched non-legal paths", () => {
		expect(isKelsierSurface("/missing-page")).toBe(true);
		expect(getBodyClassName("/missing-page")).toContain("kelsier-body");
	});

	it("keeps terms outside the Kelsier surface", () => {
		expect(isKelsierSurface("/terms")).toBe(false);
		expect(getBodyClassName("/terms")).not.toContain("kelsier-body");
	});
});
