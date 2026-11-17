import { act, renderHook } from "@testing-library/react";
import { createElement, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import {
	clamp,
	ease,
	useKelsierScrollAnimation,
} from "./useKelsierScrollAnimation";

it("schedules again after replacing a callback with a frame pending", () => {
	const frames = new Map<number, FrameRequestCallback>();
	let nextId = 0;
	vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
		frames.set(++nextId, callback);
		return nextId;
	});
	vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
		frames.delete(id);
	});
	try {
		const first = vi.fn();
		const second = vi.fn();
		const hook = renderHook(
			({ callback }) => useKelsierScrollAnimation(callback),
			{
				initialProps: { callback: first },
			},
		);
		act(() => window.dispatchEvent(new Event("scroll")));
		expect(frames.size).toBe(1);
		hook.rerender({ callback: second });
		expect(frames.size).toBe(0);
		act(() => {
			window.dispatchEvent(new Event("scroll"));
			window.dispatchEvent(new Event("resize"));
		});
		expect(frames.size).toBe(1);
		hook.unmount();
		expect(frames.size).toBe(0);
	} finally {
		vi.restoreAllMocks();
	}
});

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

it("resets scheduling after a throwing frame in Strict Mode", () => {
	const callbacks: FrameRequestCallback[] = [];
	vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
		callbacks.push(callback);
		return callbacks.length;
	});
	vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
	const callback = vi.fn();
	const hook = renderHook(() => useKelsierScrollAnimation(callback), {
		wrapper: ({ children }) => createElement(StrictMode, null, children),
	});
	try {
		callback.mockImplementationOnce(() => {
			throw new Error("frame failure");
		});
		act(() => window.dispatchEvent(new Event("scroll")));
		expect(() => callbacks[0]?.(0)).toThrow("frame failure");
		act(() => window.dispatchEvent(new Event("scroll")));
		expect(callbacks).toHaveLength(2);
		act(() => callbacks[1]?.(0));
		hook.unmount();
		window.dispatchEvent(new Event("scroll"));
		expect(callbacks).toHaveLength(2);
	} finally {
		hook.unmount();
		vi.restoreAllMocks();
	}
});
