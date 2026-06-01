import { sql } from "drizzle-orm";
import {
	foreignKey,
	index,
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { teams } from "./teams";
import { users } from "./users";

export const organisationRole = pgEnum("organisation_role", [
	"owner",
	"admin",
	"member",
]);

export const teamRole = pgEnum("team_role", ["lead", "member"]);

export const organisationMembers = pgTable(
	"organisation_members",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		organisationId: uuid("organisation_id")
			.notNull()
			.references(() => organisations.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: organisationRole("role").notNull().default("member"),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
	},
	(table) => [
		uniqueIndex("organisation_members_organisation_id_user_id_unique").on(
			table.organisationId,
			table.userId,
		),
		index("organisation_members_organisation_id_idx").on(table.organisationId),
		index("organisation_members_user_id_idx").on(table.userId),
	],
);

export const teamMembers = pgTable(
	"team_members",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		organisationId: uuid("organisation_id")
			.notNull()
			.references(() => organisations.id, { onDelete: "cascade" }),
		teamId: uuid("team_id").notNull(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		role: teamRole("role").notNull().default("member"),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
	},
	(table) => [
		uniqueIndex("team_members_team_id_user_id_unique").on(
			table.teamId,
			table.userId,
		),
		index("team_members_organisation_id_idx").on(table.organisationId),
		index("team_members_organisation_id_team_id_idx").on(
			table.organisationId,
			table.teamId,
		),
		index("team_members_organisation_id_user_id_idx").on(
			table.organisationId,
			table.userId,
		),
		index("team_members_team_id_idx").on(table.teamId),
		index("team_members_user_id_idx").on(table.userId),
		foreignKey({
			columns: [table.teamId, table.organisationId],
			foreignColumns: [teams.id, teams.organisationId],
			name: "team_members_team_organisation_fk",
		}).onDelete("cascade"),
	],
);

export type OrganisationMember = typeof organisationMembers.$inferSelect;
export type NewOrganisationMember = typeof organisationMembers.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
