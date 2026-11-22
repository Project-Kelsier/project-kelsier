import { expect, it } from "vitest";

it("uses browser-owned storage isolated from the other file", () => {
	expect(globalThis.localStorage).toBe(window.localStorage);
	expect(localStorage).toBeInstanceOf(window.Storage);
	expect(sessionStorage).toBeInstanceOf(window.Storage);
	expect(localStorage.getItem("probe-b")).toBeNull();
	expect(sessionStorage.getItem("probe-b")).toBeNull();
	localStorage.setItem("probe-a", "a");
	sessionStorage.setItem("probe-a", "a");
});
