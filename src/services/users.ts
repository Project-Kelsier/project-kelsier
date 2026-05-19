import { eq } from "drizzle-orm";
import { db } from "#/db/client";
import { type User, users } from "#/db/schema";

export async function ensureDomainUser(authUserId: string): Promise<User> {
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

	const existingUser = await getUserByAuthUserId(authUserId);

	if (!existingUser) {
		throw new Error("Failed to ensure domain user.");
	}

	return existingUser;
}

export async function getUserByAuthUserId(authUserId: string) {
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.authUserId, authUserId))
		.limit(1);

	return user ?? null;
}
