import { expect, it } from "vitest";

it("uses browser-owned storage isolated from the other file", () => {
	expect(globalThis.localStorage).toBe(window.localStorage);
	expect(localStorage).toBeInstanceOf(window.Storage);
	expect(sessionStorage).toBeInstanceOf(window.Storage);
	expect(localStorage.getItem("probe-a")).toBeNull();
	expect(sessionStorage.getItem("probe-a")).toBeNull();
	localStorage.setItem("probe-b", "a");
	sessionStorage.setItem("probe-b", "a");
});
