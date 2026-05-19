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

export const organisationStatus = pgEnum("organisation_status", [
	"active",
	"suspended",
	"deleted",
]);

export const pilotRequestStatus = pgEnum("pilot_request_status", [
	"pending",
	"contacted",
	"closed",
]);

export const organisations = pgTable(
	"organisations",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		slug: text("slug").notNull(),
		name: text("name").notNull(),
		status: organisationStatus("status").notNull().default("active"),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("organisations_slug_unique").on(table.slug),
		index("organisations_slug_idx").on(table.slug),
		index("organisations_status_idx").on(table.status),
		index("organisations_created_at_idx").on(table.createdAt),
	],
);

export const pilotRequests = pgTable(
	"pilot_requests",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		organisationId: uuid("organisation_id").references(() => organisations.id, {
			onDelete: "set null",
		}),
		contactName: text("contact_name").notNull(),
		contactEmail: text("contact_email").notNull(),
		companyName: text("company_name").notNull(),
		status: pilotRequestStatus("status").notNull().default("pending"),
		notes: text("notes"),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("pilot_requests_organisation_id_idx").on(table.organisationId),
		index("pilot_requests_status_idx").on(table.status),
		index("pilot_requests_created_at_idx").on(table.createdAt),
	],
);

export type Organisation = typeof organisations.$inferSelect;
export type NewOrganisation = typeof organisations.$inferInsert;
export type PilotRequest = typeof pilotRequests.$inferSelect;
export type NewPilotRequest = typeof pilotRequests.$inferInsert;
