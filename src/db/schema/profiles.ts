import { sql } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { users } from "./users";

export const personalityProfiles = pgTable(
	"personality_profiles",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		organisationId: uuid("organisation_id")
			.notNull()
			.references(() => organisations.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		traitScores: jsonb("trait_scores").notNull().default({}),
		metadata: jsonb("metadata").notNull().default({}),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("personality_profiles_organisation_id_user_id_unique").on(
			table.organisationId,
			table.userId,
		),
		index("personality_profiles_organisation_id_idx").on(table.organisationId),
		index("personality_profiles_user_id_idx").on(table.userId),
		index("personality_profiles_created_at_idx").on(table.createdAt),
	],
);

export type PersonalityProfile = typeof personalityProfiles.$inferSelect;
export type NewPersonalityProfile = typeof personalityProfiles.$inferInsert;
