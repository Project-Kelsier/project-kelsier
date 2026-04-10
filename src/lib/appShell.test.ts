import { describe, expect, it } from "vitest";
import {
	getBodyClassName,
	isKelsierHomepage,
	shouldRenderGlobalHeader,
} from "./appShell";

describe("app shell routing", () => {
	it("treats the root path as the Kelsier homepage", () => {
		expect(isKelsierHomepage("/")).toBe(true);
		expect(shouldRenderGlobalHeader("/")).toBe(false);
		expect(getBodyClassName("/")).toContain("kelsier-body");
	});

	it("keeps the shared header for non-home routes", () => {
		expect(isKelsierHomepage("/about")).toBe(false);
		expect(shouldRenderGlobalHeader("/about")).toBe(true);
		expect(getBodyClassName("/about")).not.toContain("kelsier-body");
	});
});
