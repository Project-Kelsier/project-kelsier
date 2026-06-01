import { sql } from "drizzle-orm";
import {
	doublePrecision,
	foreignKey,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { teams } from "./teams";
import { users } from "./users";

export const assessmentVersionStatus = pgEnum("assessment_version_status", [
	"draft",
	"active",
	"retired",
]);

export const assessmentVersions = pgTable(
	"assessment_versions",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		slug: text("slug").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		status: assessmentVersionStatus("status").notNull().default("draft"),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("assessment_versions_slug_unique").on(table.slug),
		index("assessment_versions_status_idx").on(table.status),
	],
);

export const assessmentQuestions = pgTable(
	"assessment_questions",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		versionId: uuid("version_id")
			.notNull()
			.references(() => assessmentVersions.id, { onDelete: "cascade" }),
		dimension: text("dimension").notNull(),
		sortOrder: integer("sort_order").notNull(),
		prompt: text("prompt").notNull(),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("assessment_questions_version_id_sort_order_unique").on(
			table.versionId,
			table.sortOrder,
		),
		index("assessment_questions_version_id_idx").on(table.versionId),
	],
);

export const assessmentOptions = pgTable(
	"assessment_options",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		questionId: uuid("question_id")
			.notNull()
			.references(() => assessmentQuestions.id, { onDelete: "cascade" }),
		sortOrder: integer("sort_order").notNull(),
		label: text("label").notNull(),
		value: text("value").notNull(),
		scoreWeights: jsonb("score_weights").notNull().default({}),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("assessment_options_question_id_sort_order_unique").on(
			table.questionId,
			table.sortOrder,
		),
		uniqueIndex("assessment_options_id_question_id_unique").on(
			table.id,
			table.questionId,
		),
		index("assessment_options_question_id_idx").on(table.questionId),
	],
);

export const assessmentAttempts = pgTable(
	"assessment_attempts",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		organisationId: uuid("organisation_id")
			.notNull()
			.references(() => organisations.id, { onDelete: "cascade" }),
		teamId: uuid("team_id"),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		assessmentVersionId: uuid("assessment_version_id")
			.notNull()
			.references(() => assessmentVersions.id, { onDelete: "restrict" }),
		startedAt: timestamp("started_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		completedAt: timestamp("completed_at", {
			mode: "date",
			withTimezone: true,
		}),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("assessment_attempts_id_organisation_id_unique").on(
			table.id,
			table.organisationId,
		),
		index("assessment_attempts_organisation_id_idx").on(table.organisationId),
		index("assessment_attempts_organisation_id_user_id_idx").on(
			table.organisationId,
			table.userId,
		),
		index("assessment_attempts_organisation_id_team_id_idx").on(
			table.organisationId,
			table.teamId,
		),
		index("assessment_attempts_team_id_idx").on(table.teamId),
		index("assessment_attempts_user_id_idx").on(table.userId),
		index("assessment_attempts_assessment_version_id_idx").on(
			table.assessmentVersionId,
		),
		foreignKey({
			columns: [table.teamId, table.organisationId],
			foreignColumns: [teams.id, teams.organisationId],
			name: "assessment_attempts_team_organisation_fk",
		}).onDelete("restrict"),
	],
);

export const assessmentAnswers = pgTable(
	"assessment_answers",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		organisationId: uuid("organisation_id")
			.notNull()
			.references(() => organisations.id, { onDelete: "cascade" }),
		attemptId: uuid("attempt_id")
			.notNull()
			.references(() => assessmentAttempts.id, { onDelete: "cascade" }),
		questionId: uuid("question_id")
			.notNull()
			.references(() => assessmentQuestions.id, { onDelete: "restrict" }),
		optionId: uuid("option_id")
			.notNull()
			.references(() => assessmentOptions.id, { onDelete: "restrict" }),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("assessment_answers_attempt_id_question_id_unique").on(
			table.attemptId,
			table.questionId,
		),
		index("assessment_answers_organisation_id_idx").on(table.organisationId),
		index("assessment_answers_attempt_id_idx").on(table.attemptId),
		index("assessment_answers_question_id_idx").on(table.questionId),
		index("assessment_answers_option_id_idx").on(table.optionId),
		foreignKey({
			columns: [table.attemptId, table.organisationId],
			foreignColumns: [
				assessmentAttempts.id,
				assessmentAttempts.organisationId,
			],
			name: "assessment_answers_attempt_organisation_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.optionId, table.questionId],
			foreignColumns: [assessmentOptions.id, assessmentOptions.questionId],
			name: "assessment_answers_option_question_fk",
		}).onDelete("restrict"),
	],
);

export const assessmentResults = pgTable(
	"assessment_results",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		organisationId: uuid("organisation_id")
			.notNull()
			.references(() => organisations.id, { onDelete: "cascade" }),
		attemptId: uuid("attempt_id")
			.notNull()
			.references(() => assessmentAttempts.id, { onDelete: "cascade" }),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		assessmentVersionId: uuid("assessment_version_id")
			.notNull()
			.references(() => assessmentVersions.id, { onDelete: "restrict" }),
		traitScores: jsonb("trait_scores").notNull().default({}),
		confidence: doublePrecision("confidence"),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("assessment_results_attempt_id_unique").on(table.attemptId),
		index("assessment_results_organisation_id_idx").on(table.organisationId),
		index("assessment_results_organisation_id_attempt_id_idx").on(
			table.organisationId,
			table.attemptId,
		),
		index("assessment_results_user_id_idx").on(table.userId),
		index("assessment_results_assessment_version_id_idx").on(
			table.assessmentVersionId,
		),
		foreignKey({
			columns: [table.attemptId, table.organisationId],
			foreignColumns: [
				assessmentAttempts.id,
				assessmentAttempts.organisationId,
			],
			name: "assessment_results_attempt_organisation_fk",
		}).onDelete("cascade"),
	],
);

export type AssessmentVersion = typeof assessmentVersions.$inferSelect;
export type NewAssessmentVersion = typeof assessmentVersions.$inferInsert;
export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;
export type NewAssessmentQuestion = typeof assessmentQuestions.$inferInsert;
export type AssessmentOption = typeof assessmentOptions.$inferSelect;
export type NewAssessmentOption = typeof assessmentOptions.$inferInsert;
export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect;
export type NewAssessmentAttempt = typeof assessmentAttempts.$inferInsert;
export type AssessmentAnswer = typeof assessmentAnswers.$inferSelect;
export type NewAssessmentAnswer = typeof assessmentAnswers.$inferInsert;
export type AssessmentResult = typeof assessmentResults.$inferSelect;
export type NewAssessmentResult = typeof assessmentResults.$inferInsert;
