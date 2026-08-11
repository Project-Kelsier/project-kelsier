import { and, eq } from "drizzle-orm";
import type { DbClient } from "#/db/client";
import {
	assessmentAttempts,
	assessmentQuestions,
	assessmentResults,
	assessmentVersions,
} from "#/db/schema";

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
