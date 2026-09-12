import { inArray, lte, sql } from "drizzle-orm";
import type { DbClient } from "#/db/client";
import { guestSessions } from "#/db/schema";

export const CLEANUP_BATCH_SIZE = 100;

export async function deleteExpiredGuestSessions(db: DbClient, now: Date) {
	return db.transaction(async (transaction) => {
		// Bound contention with live attempts and the work caused by cascades.
		await transaction.execute(
			sql`select set_config('lock_timeout', '2s', true), set_config('statement_timeout', '10s', true)`,
		);
		const expired = transaction
			.select({ id: guestSessions.id })
			.from(guestSessions)
			.where(lte(guestSessions.expiresAt, now))
			.orderBy(guestSessions.expiresAt, guestSessions.id)
			.limit(CLEANUP_BATCH_SIZE);
		const deleted = await transaction
			.delete(guestSessions)
			.where(inArray(guestSessions.id, expired));
		return deleted.count;
	});
}
