import { and, eq } from "drizzle-orm";
import type { DbClient } from "#/db/client";
import {
	assessmentAttempts,
	assessmentQuestions,
	assessmentResults,
	assessmentVersions,
} from "#/db/schema";
import type { OrganisationUserContext } from "./context";

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
	context: OrganisationUserContext,
	userId: string,
) {
	return context.db
		.select()
		.from(assessmentAttempts)
		.where(
			and(
				eq(assessmentAttempts.organisationId, context.organisationId),
				eq(assessmentAttempts.userId, userId),
			),
		);
}

export async function getAssessmentResultForAttempt(
	context: OrganisationUserContext,
	attemptId: string,
) {
	const [result] = await context.db
		.select()
		.from(assessmentResults)
		.where(
			and(
				eq(assessmentResults.organisationId, context.organisationId),
				eq(assessmentResults.attemptId, attemptId),
			),
		)
		.limit(1);

	return result ?? null;
}
