import { and, eq } from "drizzle-orm";
import type { DbClient } from "#/db/client";
import {
	assessmentAttempts,
	assessmentOptions,
	assessmentQuestions,
	assessmentResults,
	assessmentVersions,
} from "#/db/schema";
import type { AssessmentQuestionnaire } from "#/lib/assessmentQuestionnaire";

const assessmentAttemptColumns = {
	id: assessmentAttempts.id,
	guestSessionId: assessmentAttempts.guestSessionId,
	userId: assessmentAttempts.userId,
	assessmentVersionId: assessmentAttempts.assessmentVersionId,
	startedAt: assessmentAttempts.startedAt,
	completedAt: assessmentAttempts.completedAt,
	createdAt: assessmentAttempts.createdAt,
	updatedAt: assessmentAttempts.updatedAt,
};

const assessmentResultColumns = {
	id: assessmentResults.id,
	attemptId: assessmentResults.attemptId,
	assessmentVersionId: assessmentResults.assessmentVersionId,
	traitScores: assessmentResults.traitScores,
	confidence: assessmentResults.confidence,
	createdAt: assessmentResults.createdAt,
	updatedAt: assessmentResults.updatedAt,
};

export async function getAssessmentVersionBySlug(db: DbClient, slug: string) {
	const [version] = await db
		.select()
		.from(assessmentVersions)
		.where(eq(assessmentVersions.slug, slug))
		.limit(1);

	return version ?? null;
}

export async function listAssessmentQuestionsForVersion(
	db: DbClient,
	assessmentVersionId: string,
) {
	return db
		.select()
		.from(assessmentQuestions)
		.where(eq(assessmentQuestions.versionId, assessmentVersionId))
		.orderBy(assessmentQuestions.sortOrder);
}

export async function getActiveAssessmentQuestionnaireBySlug(
	db: DbClient,
	slug: string,
): Promise<AssessmentQuestionnaire | null> {
	const [version] = await db
		.select({
			id: assessmentVersions.id,
			slug: assessmentVersions.slug,
			title: assessmentVersions.title,
			description: assessmentVersions.description,
		})
		.from(assessmentVersions)
		.where(
			and(
				eq(assessmentVersions.slug, slug),
				eq(assessmentVersions.status, "active"),
			),
		)
		.limit(1);

	if (!version) {
		return null;
	}

	const rows = await db
		.select({
			questionId: assessmentQuestions.id,
			prompt: assessmentQuestions.prompt,
			required: assessmentQuestions.required,
			optionId: assessmentOptions.id,
			optionLabel: assessmentOptions.label,
		})
		.from(assessmentQuestions)
		.innerJoin(
			assessmentOptions,
			eq(assessmentOptions.questionId, assessmentQuestions.id),
		)
		.where(eq(assessmentQuestions.versionId, version.id))
		.orderBy(assessmentQuestions.sortOrder, assessmentOptions.sortOrder);

	const questions: AssessmentQuestionnaire["questions"] = [];
	const questionsById = new Map<
		string,
		AssessmentQuestionnaire["questions"][number]
	>();

	for (const row of rows) {
		let question = questionsById.get(row.questionId);

		if (!question) {
			question = {
				id: row.questionId,
				prompt: row.prompt,
				required: row.required,
				options: [],
			};
			questionsById.set(row.questionId, question);
			questions.push(question);
		}

		question.options.push({
			id: row.optionId,
			label: row.optionLabel,
		});
	}

	return {
		...version,
		questions,
	};
}

export async function listAssessmentAttemptsForUser(
	db: DbClient,
	userId: string,
) {
	return db
		.select(assessmentAttemptColumns)
		.from(assessmentAttempts)
		.where(eq(assessmentAttempts.userId, userId));
}

export async function getAssessmentResultForUserAttempt(
	db: DbClient,
	userId: string,
	attemptId: string,
) {
	const [result] = await db
		.select(assessmentResultColumns)
		.from(assessmentResults)
		.innerJoin(
			assessmentAttempts,
			eq(assessmentAttempts.id, assessmentResults.attemptId),
		)
		.where(
			and(
				eq(assessmentAttempts.id, attemptId),
				eq(assessmentAttempts.userId, userId),
			),
		)
		.limit(1);

	return result ?? null;
}
