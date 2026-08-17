import { lte } from "drizzle-orm";
import type { DbClient } from "#/db/client";
import { guestSessions } from "#/db/schema";

export async function deleteExpiredGuestSessions(db: DbClient, now: Date) {
	const deletedSessions = await db
		.delete(guestSessions)
		.where(lte(guestSessions.expiresAt, now))
		.returning({ id: guestSessions.id });

	return deletedSessions.length;
}
