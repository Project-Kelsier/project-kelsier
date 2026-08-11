import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	doublePrecision,
	foreignKey,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
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
		required: boolean("required").notNull().default(true),
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

export const guestSessions = pgTable(
	"guest_sessions",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		tokenHash: text("token_hash").notNull(),
		expiresAt: timestamp("expires_at", {
			mode: "date",
			withTimezone: true,
		}).notNull(),
		createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex("guest_sessions_token_hash_unique").on(table.tokenHash),
		index("guest_sessions_expires_at_idx").on(table.expiresAt),
	],
);

export const assessmentAttempts = pgTable(
	"assessment_attempts",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
		guestSessionId: uuid("guest_session_id").references(
			() => guestSessions.id,
			{ onDelete: "cascade" },
		),
		userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
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
		index("assessment_attempts_guest_session_id_idx").on(table.guestSessionId),
		index("assessment_attempts_user_id_idx").on(table.userId),
		index("assessment_attempts_assessment_version_id_idx").on(
			table.assessmentVersionId,
		),
		unique("assessment_attempts_id_assessment_version_id_unique").on(
			table.id,
			table.assessmentVersionId,
		),
		check(
			"assessment_attempts_exactly_one_owner_check",
			sql`(${table.guestSessionId} is null) <> (${table.userId} is null)`,
		),
	],
);

export const assessmentAnswers = pgTable(
	"assessment_answers",
	{
		id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
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
		index("assessment_answers_attempt_id_idx").on(table.attemptId),
		index("assessment_answers_question_id_idx").on(table.questionId),
		index("assessment_answers_option_id_idx").on(table.optionId),
		index("assessment_answers_option_id_question_id_idx").on(
			table.optionId,
			table.questionId,
		),
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
		attemptId: uuid("attempt_id").notNull(),
		assessmentVersionId: uuid("assessment_version_id")
			.notNull()
			.references(() => assessmentVersions.id, { onDelete: "restrict" }),
		traitScores: jsonb("trait_scores").notNull().default({}),
		contributingQuestionCounts: jsonb("contributing_question_counts")
			.notNull()
			.default({}),
		scoringAlgorithmVersion: text("scoring_algorithm_version")
			.notNull()
			.default("weighted-average-v1"),
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
		index("assessment_results_assessment_version_id_idx").on(
			table.assessmentVersionId,
		),
		foreignKey({
			columns: [table.attemptId, table.assessmentVersionId],
			foreignColumns: [
				assessmentAttempts.id,
				assessmentAttempts.assessmentVersionId,
			],
			name: "assessment_results_attempt_version_fk",
		}).onDelete("cascade"),
	],
);

export type AssessmentVersion = typeof assessmentVersions.$inferSelect;
export type NewAssessmentVersion = typeof assessmentVersions.$inferInsert;
export type AssessmentQuestion = typeof assessmentQuestions.$inferSelect;
export type NewAssessmentQuestion = typeof assessmentQuestions.$inferInsert;
export type AssessmentOption = typeof assessmentOptions.$inferSelect;
export type NewAssessmentOption = typeof assessmentOptions.$inferInsert;
export type GuestSession = typeof guestSessions.$inferSelect;
export type NewGuestSession = typeof guestSessions.$inferInsert;
export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect;
export type NewAssessmentAttempt = typeof assessmentAttempts.$inferInsert;
export type AssessmentAnswer = typeof assessmentAnswers.$inferSelect;
export type NewAssessmentAnswer = typeof assessmentAnswers.$inferInsert;
export type AssessmentResult = typeof assessmentResults.$inferSelect;
export type NewAssessmentResult = typeof assessmentResults.$inferInsert;
