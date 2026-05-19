import { sql } from "drizzle-orm";
import {
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";

export const teamStatus = pgEnum("team_status", [
	"active",
	"archived",
	"deleted",
]);

export const teams = pgTable(
	"teams",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		organisationId: uuid("organisation_id")
			.notNull()
			.references(() => organisations.id, { onDelete: "cascade" }),
		slug: text("slug").notNull(),
		name: text("name").notNull(),
		status: teamStatus("status").notNull().default("active"),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
	},
	(table) => [
		uniqueIndex("teams_organisation_id_slug_unique").on(
			table.organisationId,
			table.slug,
		),
		index("teams_organisation_id_idx").on(table.organisationId),
		index("teams_status_idx").on(table.status),
	],
);

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
