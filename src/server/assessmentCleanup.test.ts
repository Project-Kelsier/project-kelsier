import { beforeEach, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import { deleteExpiredGuestSessions } from "#/services/assessmentCleanup";
import { runAssessmentCleanup } from "./assessmentCleanup";

vi.mock("#/services/assessmentCleanup", () => ({
	deleteExpiredGuestSessions: vi.fn(),
}));
beforeEach(() => vi.resetAllMocks());
const now = new Date("2026-08-17T03:17:02Z");
const db = {} as DbClient;
const input = { now, scheduledAt: now, cron: "17 3 * * *", clock: () => 100 };

it("drains batches using one cutoff and logs the total", async () => {
	vi.mocked(deleteExpiredGuestSessions)
		.mockResolvedValueOnce(100)
		.mockResolvedValueOnce(3)
		.mockResolvedValueOnce(0);
	const logger = { log: vi.fn(), error: vi.fn() };
	const outcome = await runAssessmentCleanup(db, { ...input, logger });
	expect(outcome).toMatchObject({
		event: "assessment_cleanup_completed",
		deletedGuestSessions: 103,
		durationMs: 0,
	});
	expect(deleteExpiredGuestSessions).toHaveBeenCalledTimes(3);
	expect(
		vi
			.mocked(deleteExpiredGuestSessions)
			.mock.calls.every((call) => call[1] === now),
	).toBe(true);
	expect(logger.error).not.toHaveBeenCalled();
});

it("logs partial progress and throws a sanitized error on failure", async () => {
	vi.mocked(deleteExpiredGuestSessions)
		.mockResolvedValueOnce(100)
		.mockRejectedValueOnce(
			new Error("postgres://sensitive:password@private/db"),
		);
	const logger = { log: vi.fn(), error: vi.fn() };
	await expect(runAssessmentCleanup(db, { ...input, logger })).rejects.toThrow(
		"Assessment cleanup failed; retry required.",
	);
	expect(JSON.parse(logger.error.mock.calls[0][0])).toMatchObject({
		event: "assessment_cleanup_failed",
		deletedGuestSessions: 100,
		batches: 1,
	});
	expect(logger.error.mock.calls[0][0]).not.toContain("sensitive");
	expect(logger.log).not.toHaveBeenCalled();
});

it("fails visibly instead of running an unbounded number of batches", async () => {
	vi.mocked(deleteExpiredGuestSessions).mockResolvedValue(100);
	const logger = { log: vi.fn(), error: vi.fn() };
	await expect(runAssessmentCleanup(db, { ...input, logger })).rejects.toThrow(
		"retry required",
	);
	expect(deleteExpiredGuestSessions).toHaveBeenCalledTimes(100);
	expect(JSON.parse(logger.error.mock.calls[0][0])).toMatchObject({
		deletedGuestSessions: 10000,
		batches: 100,
	});
});

it("stops after its elapsed-time budget", async () => {
	vi.mocked(deleteExpiredGuestSessions).mockResolvedValue(100);
	const logger = { log: vi.fn(), error: vi.fn() };
	const clock = vi.fn().mockReturnValueOnce(0).mockReturnValue(60000);
	await expect(
		runAssessmentCleanup(db, { ...input, logger, clock }),
	).rejects.toThrow("retry required");
	expect(deleteExpiredGuestSessions).toHaveBeenCalledOnce();
});
