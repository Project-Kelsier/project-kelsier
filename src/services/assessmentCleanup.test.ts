import { inArray, lte } from "drizzle-orm";
import { expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import { guestSessions } from "#/db/schema";
import {
	CLEANUP_BATCH_SIZE,
	deleteExpiredGuestSessions,
} from "./assessmentCleanup";

vi.mock("drizzle-orm", async (importOriginal) => {
	const actual = await importOriginal<typeof import("drizzle-orm")>();
	return {
		...actual,
		lte: vi.fn((left, right) => ({ left, right })),
		inArray: vi.fn((left, right) => ({ left, right })),
	};
});

it("deletes a bounded expiry-ordered batch and returns the database count", async () => {
	const now = new Date("2026-08-17T03:17:00Z");
	const expired = {};
	const limit = vi.fn(() => expired);
	const orderBy = vi.fn(() => ({ limit }));
	const where = vi.fn(() => ({ orderBy }));
	const deleteWhere = vi.fn().mockResolvedValue({ count: 2 });
	const transaction = {
		execute: vi.fn(),
		select: vi.fn(() => ({ from: vi.fn(() => ({ where })) })),
		delete: vi.fn(() => ({ where: deleteWhere })),
	};
	const db = {
		transaction: vi.fn((callback) => callback(transaction)),
	} as unknown as DbClient;
	expect(await deleteExpiredGuestSessions(db, now)).toBe(2);
	expect(lte).toHaveBeenCalledWith(guestSessions.expiresAt, now);
	expect(orderBy).toHaveBeenCalledWith(
		guestSessions.expiresAt,
		guestSessions.id,
	);
	expect(limit).toHaveBeenCalledWith(CLEANUP_BATCH_SIZE);
	expect(inArray).toHaveBeenCalledWith(guestSessions.id, expired);
	expect(transaction.delete).toHaveBeenCalledWith(guestSessions);
});
