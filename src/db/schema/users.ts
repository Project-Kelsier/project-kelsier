import { sql } from "drizzle-orm";
import {
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

// This is Kelsier's domain user anchor, not an auth table. Do not duplicate
// Neon Auth identity fields such as email, display name, avatar, or sessions.
export const users = pgTable(
	"users",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		authUserId: text("auth_user_id").notNull(),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("users_auth_user_id_unique").on(table.authUserId),
		index("users_auth_user_id_idx").on(table.authUserId),
	],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
