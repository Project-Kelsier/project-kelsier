import { eq } from "drizzle-orm";
import { db } from "#/db/client";
import { type User, users } from "#/db/schema";
import type { AuthenticatedUserContext } from "./context";

export async function ensureDomainUser(
	context: AuthenticatedUserContext,
	authUserId: string,
): Promise<User> {
	const [user] = await db
		.insert(users)
		.values({ authUserId })
		.onConflictDoUpdate({
			target: users.authUserId,
			set: { updatedAt: new Date() },
		})
		.returning();

	if (user) {
		return user;
	}

	const existingUser = await getUserByAuthUserId(context, authUserId);

	if (!existingUser) {
		throw new Error("Failed to ensure domain user.");
	}

	return existingUser;
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
