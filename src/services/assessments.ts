import { and, eq, gt } from "drizzle-orm";
import type { DbClient } from "#/db/client";
import {
	assessmentAttempts,
	assessmentOptions,
	assessmentQuestions,
	assessmentResults,
	assessmentVersions,
	guestSessions,
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

export async function getActiveGuestSessionByTokenHash(
	db: DbClient,
	tokenHash: string,
	now: Date,
) {
	const [session] = await db
		.select({
			id: guestSessions.id,
			expiresAt: guestSessions.expiresAt,
		})
		.from(guestSessions)
		.where(
			and(
				eq(guestSessions.tokenHash, tokenHash),
				gt(guestSessions.expiresAt, now),
			),
		)
		.limit(1);

	return session ?? null;
}

export async function createGuestAssessmentAttempt(
	db: DbClient,
	input: {
		assessmentVersionId: string;
		guestSessionId?: string;
		tokenHash?: string;
		expiresAt?: Date;
	},
) {
	return db.transaction(async (transaction) => {
		let guestSessionId = input.guestSessionId;
		const expiresAt = input.expiresAt;

		if (!guestSessionId) {
			if (!input.tokenHash || !expiresAt) {
				throw new Error(
					"A new guest session requires a token hash and expiry.",
				);
			}

			const [session] = await transaction
				.insert(guestSessions)
				.values({ tokenHash: input.tokenHash, expiresAt })
				.returning({ id: guestSessions.id });

			if (!session) {
				throw new Error("The guest session could not be created.");
			}

			guestSessionId = session.id;
		}

		const [attempt] = await transaction
			.insert(assessmentAttempts)
			.values({
				guestSessionId,
				assessmentVersionId: input.assessmentVersionId,
			})
			.returning({
				id: assessmentAttempts.id,
				startedAt: assessmentAttempts.startedAt,
			});

		if (!attempt || !expiresAt) {
			throw new Error("The assessment attempt could not be created.");
		}

		return { ...attempt, expiresAt };
	});
}

export async function deleteGuestAssessmentAttempt(
	db: DbClient,
	input: { attemptId: string; tokenHash: string; now: Date },
) {
	const [ownedAttempt] = await db
		.select({
			id: assessmentAttempts.id,
			guestSessionId: assessmentAttempts.guestSessionId,
		})
		.from(assessmentAttempts)
		.innerJoin(
			guestSessions,
			eq(guestSessions.id, assessmentAttempts.guestSessionId),
		)
		.where(
			and(
				eq(assessmentAttempts.id, input.attemptId),
				eq(guestSessions.tokenHash, input.tokenHash),
				gt(guestSessions.expiresAt, input.now),
			),
		)
		.limit(1);

	if (!ownedAttempt?.guestSessionId) {
		return false;
	}

	const deleted = await db
		.delete(assessmentAttempts)
		.where(
			and(
				eq(assessmentAttempts.id, ownedAttempt.id),
				eq(assessmentAttempts.guestSessionId, ownedAttempt.guestSessionId),
			),
		)
		.returning({ id: assessmentAttempts.id });

	return deleted.length === 1;
}
