import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import { assessmentAttempts } from "#/db/schema";
import {
	getAssessmentResultForUserAttempt,
	listAssessmentAttemptsForUser,
} from "./assessments";

vi.mock("drizzle-orm", async (importOriginal) => {
	const actual = await importOriginal<typeof import("drizzle-orm")>();

	return {
		...actual,
		and: vi.fn((...conditions: unknown[]) => ({ conditions })),
		eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
	};
});

describe("assessment service owner visibility", () => {
	it("lists attempts by their personal user owner without organisation scope", async () => {
		const where = vi.fn().mockResolvedValue([]);
		const db = {
			select: vi.fn(() => ({
				from: vi.fn(() => ({ where })),
			})),
		} as unknown as DbClient;
		const userId = "00000000-0000-4000-8000-000000000002";

		await listAssessmentAttemptsForUser(db, userId);

		expect(eq).toHaveBeenCalledWith(assessmentAttempts.userId, userId);
	});

	it("loads a result only through an attempt owned by the requested user", async () => {
		const limit = vi.fn().mockResolvedValue([]);
		const where = vi.fn(() => ({ limit }));
		const innerJoin = vi.fn(() => ({ where }));
		const db = {
			select: vi.fn(() => ({
				from: vi.fn(() => ({ innerJoin })),
			})),
		} as unknown as DbClient;
		const userId = "00000000-0000-4000-8000-000000000002";
		const attemptId = "00000000-0000-4000-8000-000000000003";

		await getAssessmentResultForUserAttempt(db, userId, attemptId);

		expect(innerJoin.mock.calls.at(-1)?.at(0)).toBe(assessmentAttempts);
		expect(eq).toHaveBeenCalledWith(assessmentAttempts.id, attemptId);
		expect(eq).toHaveBeenCalledWith(assessmentAttempts.userId, userId);
	});
});
