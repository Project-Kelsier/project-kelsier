import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import { deleteExpiredGuestSessions } from "#/services/assessmentCleanup";
import { runAssessmentCleanup } from "./assessmentCleanup";

vi.mock("#/services/assessmentCleanup", () => ({
	deleteExpiredGuestSessions: vi.fn(),
}));

const scheduledAt = new Date("2026-08-17T03:17:00.000Z");
const now = new Date("2026-08-17T03:17:02.000Z");
const db = {} as DbClient;

describe("runAssessmentCleanup", () => {
	it("logs a structured completion outcome", async () => {
		vi.mocked(deleteExpiredGuestSessions).mockResolvedValue(3);
		const logger = { log: vi.fn(), error: vi.fn() };
		const clock = vi
			.fn<() => number>()
			.mockReturnValueOnce(100)
			.mockReturnValueOnce(125);

		expect(
			await runAssessmentCleanup(db, {
				now,
				scheduledAt,
				cron: "17 3 * * *",
				logger,
				clock,
			}),
		).toEqual({
			event: "assessment_cleanup_completed",
			cron: "17 3 * * *",
			scheduledAt: scheduledAt.toISOString(),
			cutoff: now.toISOString(),
			deletedGuestSessions: 3,
			durationMs: 25,
		});
		expect(logger.log).toHaveBeenCalledWith(
			JSON.stringify({
				event: "assessment_cleanup_completed",
				cron: "17 3 * * *",
				scheduledAt: scheduledAt.toISOString(),
				cutoff: now.toISOString(),
				deletedGuestSessions: 3,
				durationMs: 25,
			}),
		);
		expect(logger.error).not.toHaveBeenCalled();
	});

	it("logs and rethrows failures so the scheduled invocation fails visibly", async () => {
		const failure = new Error("database unavailable");
		vi.mocked(deleteExpiredGuestSessions).mockRejectedValue(failure);
		const logger = { log: vi.fn(), error: vi.fn() };

		await expect(
			runAssessmentCleanup(db, {
				now,
				scheduledAt,
				cron: "17 3 * * *",
				logger,
				clock: () => 100,
			}),
		).rejects.toBe(failure);
		expect(logger.error).toHaveBeenCalledWith(
			JSON.stringify({
				event: "assessment_cleanup_failed",
				cron: "17 3 * * *",
				scheduledAt: scheduledAt.toISOString(),
				cutoff: now.toISOString(),
				durationMs: 0,
				error: { name: "Error", message: "database unavailable" },
			}),
		);
		expect(logger.log).not.toHaveBeenCalled();
	});
});
