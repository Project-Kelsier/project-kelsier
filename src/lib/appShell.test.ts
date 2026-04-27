import { describe, expect, it } from "vitest";
import { getBodyClassName, isKelsierHomepage } from "./appShell";

describe("app shell routing", () => {
	it("treats the root path as the Kelsier homepage", () => {
		expect(isKelsierHomepage("/")).toBe(true);
		expect(getBodyClassName("/")).toContain("kelsier-body");
	});

	it("keeps Kelsier body styles scoped to the homepage", () => {
		expect(isKelsierHomepage("/about")).toBe(false);
		expect(getBodyClassName("/about")).not.toContain("kelsier-body");
	});
});
