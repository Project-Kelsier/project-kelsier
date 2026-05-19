import { sql } from "drizzle-orm";
import {
	doublePrecision,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { teams } from "./teams";
import { users } from "./users";

export const aiInsights = pgTable(
	"ai_insights",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		organisationId: uuid("organisation_id")
			.notNull()
			.references(() => organisations.id, { onDelete: "cascade" }),
		teamId: uuid("team_id").references(() => teams.id, {
			onDelete: "set null",
		}),
		userId: uuid("user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		sourceEntityId: uuid("source_entity_id").notNull(),
		sourceEntityType: text("source_entity_type").notNull(),
		model: text("model").notNull(),
		promptVersion: text("prompt_version").notNull(),
		generatedAt: timestamp("generated_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		confidence: doublePrecision("confidence"),
		title: text("title").notNull(),
		summary: text("summary").notNull(),
		r2ObjectKey: text("r2_object_key"),
		metadata: jsonb("metadata").notNull().default({}),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		index("ai_insights_organisation_id_idx").on(table.organisationId),
		index("ai_insights_organisation_id_source_entity_idx").on(
			table.organisationId,
			table.sourceEntityType,
			table.sourceEntityId,
		),
		index("ai_insights_team_id_idx").on(table.teamId),
		index("ai_insights_user_id_idx").on(table.userId),
		index("ai_insights_source_entity_id_idx").on(table.sourceEntityId),
		index("ai_insights_generated_at_idx").on(table.generatedAt),
	],
);

// Future embedding/vector search support belongs near AI insight retrieval.
// Add pgvector in a later migration when product search semantics are concrete.
// Cloudflare Queues/Workflows will enqueue insight generation from service code.

export type AiInsight = typeof aiInsights.$inferSelect;
export type NewAiInsight = typeof aiInsights.$inferInsert;
