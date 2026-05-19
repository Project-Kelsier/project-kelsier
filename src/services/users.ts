import { eq } from "drizzle-orm";
import { db } from "#/db/client";
import { users } from "#/db/schema";
import type { AuthenticatedUserContext } from "./context";

export async function ensureDomainUser(
	context: AuthenticatedUserContext,
	authUserId: string,
) {
	const [user] = await db
		.insert(users)
		.values({ authUserId })
		.onConflictDoUpdate({
			target: users.authUserId,
			set: { updatedAt: new Date() },
		})
		.returning();

	return user ?? getUserByAuthUserId(context, authUserId);
}

export async function getUserByAuthUserId(
	_context: AuthenticatedUserContext,
	authUserId: string,
) {
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.authUserId, authUserId))
		.limit(1);

	return user ?? null;
}
