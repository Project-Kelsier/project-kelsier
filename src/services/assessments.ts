import { and, eq, isNull } from "drizzle-orm";
import type { DbClient } from "#/db/client";
import {
	assessmentAttempts,
	assessmentQuestions,
	assessmentResults,
	assessmentVersions,
	organisations,
	teams,
} from "#/db/schema";
import type { OrganisationUserContext } from "./context";

const assessmentAttemptColumns = {
	id: assessmentAttempts.id,
	organisationId: assessmentAttempts.organisationId,
	teamId: assessmentAttempts.teamId,
	userId: assessmentAttempts.userId,
	assessmentVersionId: assessmentAttempts.assessmentVersionId,
	startedAt: assessmentAttempts.startedAt,
	completedAt: assessmentAttempts.completedAt,
	createdAt: assessmentAttempts.createdAt,
	updatedAt: assessmentAttempts.updatedAt,
};

const assessmentResultColumns = {
	id: assessmentResults.id,
	organisationId: assessmentResults.organisationId,
	attemptId: assessmentResults.attemptId,
	userId: assessmentResults.userId,
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
	context: OrganisationUserContext,
	userId: string,
) {
	return context.db
		.select(assessmentAttemptColumns)
		.from(assessmentAttempts)
		.innerJoin(
			organisations,
			eq(organisations.id, assessmentAttempts.organisationId),
		)
		.where(
			and(
				eq(assessmentAttempts.organisationId, context.organisationId),
				eq(assessmentAttempts.userId, userId),
				isNull(organisations.deletedAt),
			),
		);
}

export async function assertAssessmentAttemptTeamScope(
	context: OrganisationUserContext,
	teamId: string,
) {
	const [team] = await context.db
		.select({ id: teams.id })
		.from(teams)
		.innerJoin(organisations, eq(organisations.id, teams.organisationId))
		.where(
			and(
				eq(teams.id, teamId),
				eq(teams.organisationId, context.organisationId),
				isNull(teams.deletedAt),
				isNull(organisations.deletedAt),
			),
		)
		.limit(1);

	if (!team) {
		throw new Error("Assessment attempt team must belong to the organisation.");
	}
}

export async function getAssessmentResultForAttempt(
	context: OrganisationUserContext,
	attemptId: string,
) {
	const [result] = await context.db
		.select(assessmentResultColumns)
		.from(assessmentResults)
		.innerJoin(
			organisations,
			eq(organisations.id, assessmentResults.organisationId),
		)
		.where(
			and(
				eq(assessmentResults.organisationId, context.organisationId),
				eq(assessmentResults.attemptId, attemptId),
				isNull(organisations.deletedAt),
			),
		)
		.limit(1);

	return result ?? null;
}
