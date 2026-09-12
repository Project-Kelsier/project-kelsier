import { describe, expect, it } from "vitest";
import {
	generateGuestToken,
	getGuestSessionExpiry,
	hashGuestCredential,
	isLocalRequest,
} from "./guestCredential";

describe("guest credential helpers", () => {
	it("generates opaque 256-bit base64url tokens", () => {
		const first = generateGuestToken();
		const second = generateGuestToken();

		expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(first).not.toBe(second);
	});

	it("hashes credentials deterministically without returning the raw value", async () => {
		const first = await hashGuestCredential("private-guest-token");
		const second = await hashGuestCredential("private-guest-token");

		expect(first).toBe(second);
		expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
		expect(first).not.toContain("private-guest-token");
	});

	it("fixes expiry at seven days from creation", () => {
		const createdAt = new Date("2026-08-11T12:00:00.000Z");

		expect(getGuestSessionExpiry(createdAt).toISOString()).toBe(
			"2026-08-18T12:00:00.000Z",
		);
	});

	it("permits insecure cookies only for explicit local hostnames", () => {
		expect(isLocalRequest(new URL("http://localhost:3000"))).toBe(true);
		expect(isLocalRequest(new URL("http://127.0.0.1:3000"))).toBe(true);
		expect(isLocalRequest(new URL("https://preview.kelsier.example"))).toBe(
			false,
		);
	});
});
