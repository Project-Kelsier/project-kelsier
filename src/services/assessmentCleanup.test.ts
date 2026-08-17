import { lte } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import { guestSessions } from "#/db/schema";
import { deleteExpiredGuestSessions } from "./assessmentCleanup";

vi.mock("drizzle-orm", async (importOriginal) => {
	const actual = await importOriginal<typeof import("drizzle-orm")>();

	return {
		...actual,
		lte: vi.fn((left: unknown, right: unknown) => ({ left, right })),
	};
});

describe("deleteExpiredGuestSessions", () => {
	it("deletes sessions whose fixed expiry has passed and returns the count", async () => {
		const now = new Date("2026-08-17T03:17:00.000Z");
		const returning = vi
			.fn()
			.mockResolvedValue([{ id: "session-1" }, { id: "session-2" }]);
		const where = vi.fn(() => ({ returning }));
		const deleteFrom = vi.fn(() => ({ where }));
		const db = { delete: deleteFrom } as unknown as DbClient;

		expect(await deleteExpiredGuestSessions(db, now)).toBe(2);
		expect(deleteFrom).toHaveBeenCalledWith(guestSessions);
		expect(lte).toHaveBeenCalledWith(guestSessions.expiresAt, now);
	});
});
