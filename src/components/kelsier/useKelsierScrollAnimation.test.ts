import { describe, expect, it } from "vitest";
import { clamp, ease } from "./useKelsierScrollAnimation";

describe("Kelsier scroll animation helpers", () => {
	it("clamps values to the provided range", () => {
		expect(clamp(-2, 0, 1)).toBe(0);
		expect(clamp(0.4, 0, 1)).toBe(0.4);
		expect(clamp(4, 0, 1)).toBe(1);
	});

	it("eases progress symmetrically between 0 and 1", () => {
		expect(ease(0)).toBe(0);
		expect(ease(0.25)).toBeCloseTo(0.125);
		expect(ease(0.5)).toBe(0.5);
		expect(ease(0.75)).toBeCloseTo(0.875);
		expect(ease(1)).toBe(1);
	});
});
