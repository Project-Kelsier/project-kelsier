import type { DbClient } from "#/db/client";
import { deleteExpiredGuestSessions } from "#/services/assessmentCleanup";

type CleanupLogger = Pick<Console, "error" | "log">;

export async function runAssessmentCleanup(
	db: DbClient,
	input: {
		now: Date;
		scheduledAt: Date;
		cron: string;
		logger?: CleanupLogger;
		clock?: () => number;
	},
) {
	const logger = input.logger ?? console;
	const clock = input.clock ?? Date.now;
	const startedAt = clock();
	let deletedGuestSessions = 0;
	let batches = 0;

	try {
		while (true) {
			const deleted = await deleteExpiredGuestSessions(db, input.now);
			deletedGuestSessions += deleted;
			batches += 1;
			if (deleted === 0) break;
			if (batches >= 100 || clock() - startedAt >= 60_000) {
				throw new Error("Cleanup work limit reached.");
			}
		}
		const outcome = {
			event: "assessment_cleanup_completed",
			cron: input.cron,
			scheduledAt: input.scheduledAt.toISOString(),
			cutoff: input.now.toISOString(),
			deletedGuestSessions,
			durationMs: Math.max(0, clock() - startedAt),
		};

		logger.log(JSON.stringify(outcome));
		return outcome;
	} catch {
		logger.error(
			JSON.stringify({
				event: "assessment_cleanup_failed",
				cron: input.cron,
				scheduledAt: input.scheduledAt.toISOString(),
				cutoff: input.now.toISOString(),
				durationMs: Math.max(0, clock() - startedAt),
				deletedGuestSessions,
				batches,
				error: {
					name: "AssessmentCleanupError",
					message: "Cleanup did not finish; retry required.",
				},
			}),
		);
		// Platform exception logs must not expose SQL, parameters, or credentials.
		throw new Error("Assessment cleanup failed; retry required.");
	}
}
