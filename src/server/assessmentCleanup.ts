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

	try {
		const deletedGuestSessions = await deleteExpiredGuestSessions(
			db,
			input.now,
		);
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
	} catch (error) {
		logger.error(
			JSON.stringify({
				event: "assessment_cleanup_failed",
				cron: input.cron,
				scheduledAt: input.scheduledAt.toISOString(),
				cutoff: input.now.toISOString(),
				durationMs: Math.max(0, clock() - startedAt),
				error:
					error instanceof Error
						? { name: error.name, message: error.message }
						: { name: "UnknownError", message: String(error) },
			}),
		);
		throw error;
	}
}
