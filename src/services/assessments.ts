import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import type { DbClient } from "#/db/client";
import {
	assessmentAnswers,
	assessmentAttempts,
	assessmentOptions,
	assessmentQuestions,
	assessmentResults,
	assessmentVersions,
	guestSessions,
} from "#/db/schema";
import type {
	AssessmentQuestionnaire,
	GuestAssessmentResult,
} from "#/lib/assessmentQuestionnaire";
import {
	formatAssessmentDimension,
	scoreDimensionMeanAssessment,
} from "#/lib/assessmentScoring";

const assessmentAttemptColumns = {
	id: assessmentAttempts.id,
	guestSessionId: assessmentAttempts.guestSessionId,
	userId: assessmentAttempts.userId,
	assessmentVersionId: assessmentAttempts.assessmentVersionId,
	startedAt: assessmentAttempts.startedAt,
	completedAt: assessmentAttempts.completedAt,
	resumedAt: assessmentAttempts.resumedAt,
	currentQuestionIndex: assessmentAttempts.currentQuestionIndex,
	createdAt: assessmentAttempts.createdAt,
	updatedAt: assessmentAttempts.updatedAt,
};

const assessmentResultColumns = {
	id: assessmentResults.id,
	attemptId: assessmentResults.attemptId,
	assessmentVersionId: assessmentResults.assessmentVersionId,
	traitScores: assessmentResults.traitScores,
	contributingQuestionCounts: assessmentResults.contributingQuestionCounts,
	scoringAlgorithmVersion: assessmentResults.scoringAlgorithmVersion,
	confidence: assessmentResults.confidence,
	createdAt: assessmentResults.createdAt,
	updatedAt: assessmentResults.updatedAt,
};

function requireNumberRecord(value: unknown, fieldName: string) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`The stored assessment ${fieldName} is invalid.`);
	}

	const entries = Object.entries(value);

	if (
		entries.some(
			([key, item]) =>
				!key || typeof item !== "number" || !Number.isFinite(item),
		)
	) {
		throw new Error(`The stored assessment ${fieldName} is invalid.`);
	}

	return Object.fromEntries(entries) as Record<string, number>;
}

function toGuestAssessmentResult(
	result: {
		attemptId: string;
		traitScores: unknown;
		contributingQuestionCounts: unknown;
		scoringAlgorithmVersion: string;
		confidence: number | null;
	},
	completedAt: Date,
	dimensions: string[],
): GuestAssessmentResult {
	const traitScores = requireNumberRecord(result.traitScores, "trait scores");
	const counts = requireNumberRecord(
		result.contributingQuestionCounts,
		"contributing question counts",
	);

	return {
		attemptId: result.attemptId,
		completedAt: completedAt.toISOString(),
		scoringAlgorithmVersion: result.scoringAlgorithmVersion,
		confidence: result.confidence,
		rows: dimensions.map((dimension) => ({
			dimension,
			label: formatAssessmentDimension(dimension),
			score: traitScores[dimension] ?? null,
			contributingQuestionCount: counts[dimension] ?? 0,
		})),
	};
}

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

export async function getGuestIncompleteAssessmentEntry(
	db: DbClient,
	input: {
		tokenHash: string;
		assessmentVersionId: string;
		now: Date;
	},
) {
	const [attempt] = await db
		.select({
			id: assessmentAttempts.id,
			startedAt: assessmentAttempts.startedAt,
			resumedAt: assessmentAttempts.resumedAt,
			currentQuestionIndex: assessmentAttempts.currentQuestionIndex,
			expiresAt: guestSessions.expiresAt,
		})
		.from(assessmentAttempts)
		.innerJoin(
			guestSessions,
			eq(guestSessions.id, assessmentAttempts.guestSessionId),
		)
		.where(
			and(
				eq(guestSessions.tokenHash, input.tokenHash),
				gt(guestSessions.expiresAt, input.now),
				eq(assessmentAttempts.assessmentVersionId, input.assessmentVersionId),
				isNull(assessmentAttempts.completedAt),
			),
		)
		.orderBy(desc(assessmentAttempts.startedAt))
		.limit(1);

	if (!attempt) {
		return null;
	}

	const [questions, answers] = await Promise.all([
		db
			.select({
				id: assessmentQuestions.id,
				required: assessmentQuestions.required,
			})
			.from(assessmentQuestions)
			.where(eq(assessmentQuestions.versionId, input.assessmentVersionId)),
		db
			.select({
				questionId: assessmentAnswers.questionId,
				optionId: assessmentAnswers.optionId,
			})
			.from(assessmentAnswers)
			.where(eq(assessmentAnswers.attemptId, attempt.id)),
	]);
	const answeredQuestionIds = new Set(
		answers.map((answer) => answer.questionId),
	);
	const answersComplete =
		questions.length > 0 &&
		attempt.currentQuestionIndex >= questions.length &&
		questions.every(
			(question) => !question.required || answeredQuestionIds.has(question.id),
		);

	return {
		...attempt,
		answeredCount: answers.length,
		answersComplete,
		answers,
	};
}

export async function getGuestAssessmentProgress(
	db: DbClient,
	input: {
		attemptId: string;
		tokenHash: string;
		continuationTokenHash: string;
		now: Date;
	},
) {
	const [attempt] = await db
		.select({
			id: assessmentAttempts.id,
			currentQuestionIndex: assessmentAttempts.currentQuestionIndex,
			expiresAt: guestSessions.expiresAt,
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
				eq(
					assessmentAttempts.continuationTokenHash,
					input.continuationTokenHash,
				),
				gt(guestSessions.expiresAt, input.now),
				isNull(assessmentAttempts.completedAt),
			),
		)
		.limit(1);

	if (!attempt) {
		return null;
	}

	const answers = await db
		.select({
			questionId: assessmentAnswers.questionId,
			optionId: assessmentAnswers.optionId,
		})
		.from(assessmentAnswers)
		.where(eq(assessmentAnswers.attemptId, attempt.id));

	return { ...attempt, answers };
}

export async function resumeGuestAssessmentAttempt(
	db: DbClient,
	input: {
		attemptId: string;
		tokenHash: string;
		continuationTokenHash: string;
		now: Date;
	},
) {
	return db.transaction(async (transaction) => {
		const [ownedAttempt] = await transaction
			.select({
				id: assessmentAttempts.id,
				guestSessionId: assessmentAttempts.guestSessionId,
				assessmentVersionId: assessmentAttempts.assessmentVersionId,
				currentQuestionIndex: assessmentAttempts.currentQuestionIndex,
				resumedAt: assessmentAttempts.resumedAt,
				continuationTokenHash: assessmentAttempts.continuationTokenHash,
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
					isNull(assessmentAttempts.completedAt),
				),
			)
			.limit(1);

		if (!ownedAttempt?.guestSessionId) {
			return "not-found" as const;
		}

		const questions = await transaction
			.select({ id: assessmentQuestions.id })
			.from(assessmentQuestions)
			.where(
				eq(assessmentQuestions.versionId, ownedAttempt.assessmentVersionId),
			);

		if (ownedAttempt.currentQuestionIndex >= questions.length) {
			return "response-complete" as const;
		}

		if (ownedAttempt.resumedAt) {
			return ownedAttempt.continuationTokenHash === input.continuationTokenHash
				? ("resumed" as const)
				: ("resume-unavailable" as const);
		}

		const resumed = await transaction
			.update(assessmentAttempts)
			.set({
				resumedAt: input.now,
				continuationTokenHash: input.continuationTokenHash,
			})
			.where(
				and(
					eq(assessmentAttempts.id, ownedAttempt.id),
					eq(assessmentAttempts.guestSessionId, ownedAttempt.guestSessionId),
					isNull(assessmentAttempts.resumedAt),
					isNull(assessmentAttempts.completedAt),
				),
			)
			.returning({ id: assessmentAttempts.id });

		if (resumed.length === 1) {
			return "resumed" as const;
		}

		const [retry] = await transaction
			.select({ id: assessmentAttempts.id })
			.from(assessmentAttempts)
			.where(
				and(
					eq(assessmentAttempts.id, ownedAttempt.id),
					eq(
						assessmentAttempts.continuationTokenHash,
						input.continuationTokenHash,
					),
				),
			)
			.limit(1);

		return retry ? ("resumed" as const) : ("resume-unavailable" as const);
	});
}

export async function createGuestAssessmentAttempt(
	db: DbClient,
	input: {
		assessmentVersionId: string;
		continuationTokenHash: string;
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
				continuationTokenHash: input.continuationTokenHash,
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

export async function replaceGuestAssessmentAttempt(
	db: DbClient,
	input: {
		attemptId: string;
		tokenHash: string;
		assessmentVersionId: string;
		continuationTokenHash: string;
		now: Date;
	},
) {
	return db.transaction(async (transaction) => {
		const [ownedAttempt] = await transaction
			.select({
				id: assessmentAttempts.id,
				guestSessionId: assessmentAttempts.guestSessionId,
				expiresAt: guestSessions.expiresAt,
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
					isNull(assessmentAttempts.completedAt),
				),
			)
			.limit(1);

		if (!ownedAttempt?.guestSessionId) {
			return null;
		}

		const deleted = await transaction
			.delete(assessmentAttempts)
			.where(
				and(
					eq(assessmentAttempts.id, ownedAttempt.id),
					eq(assessmentAttempts.guestSessionId, ownedAttempt.guestSessionId),
				),
			)
			.returning({ id: assessmentAttempts.id });

		if (deleted.length !== 1) {
			return null;
		}

		const [attempt] = await transaction
			.insert(assessmentAttempts)
			.values({
				guestSessionId: ownedAttempt.guestSessionId,
				assessmentVersionId: input.assessmentVersionId,
				continuationTokenHash: input.continuationTokenHash,
			})
			.returning({
				id: assessmentAttempts.id,
				startedAt: assessmentAttempts.startedAt,
			});

		return attempt ? { ...attempt, expiresAt: ownedAttempt.expiresAt } : null;
	});
}

export async function saveGuestAssessmentAnswer(
	db: DbClient,
	input: {
		attemptId: string;
		tokenHash: string;
		continuationTokenHash: string;
		questionId: string;
		optionId: string | null;
		now: Date;
	},
) {
	return db.transaction(async (transaction) => {
		const [attempt] = await transaction
			.select({
				id: assessmentAttempts.id,
				guestSessionId: assessmentAttempts.guestSessionId,
				assessmentVersionId: assessmentAttempts.assessmentVersionId,
				currentQuestionIndex: assessmentAttempts.currentQuestionIndex,
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
					eq(
						assessmentAttempts.continuationTokenHash,
						input.continuationTokenHash,
					),
					gt(guestSessions.expiresAt, input.now),
					isNull(assessmentAttempts.completedAt),
				),
			)
			.limit(1);

		if (!attempt?.guestSessionId) {
			return { status: "not-found" as const };
		}

		const questions = await transaction
			.select({
				id: assessmentQuestions.id,
				required: assessmentQuestions.required,
			})
			.from(assessmentQuestions)
			.where(eq(assessmentQuestions.versionId, attempt.assessmentVersionId))
			.orderBy(assessmentQuestions.sortOrder);
		const questionIndex = questions.findIndex(
			(question) => question.id === input.questionId,
		);
		const question = questions[questionIndex];

		if (attempt.currentQuestionIndex >= questions.length) {
			return { status: "response-complete" as const };
		}

		if (!question || (question.required && !input.optionId)) {
			return { status: "invalid-answer" as const };
		}

		if (input.optionId) {
			const [option] = await transaction
				.select({ id: assessmentOptions.id })
				.from(assessmentOptions)
				.where(
					and(
						eq(assessmentOptions.id, input.optionId),
						eq(assessmentOptions.questionId, question.id),
					),
				)
				.limit(1);

			if (!option) {
				return { status: "invalid-answer" as const };
			}
		}

		if (questionIndex === questions.length - 1) {
			return { status: "completion-required" as const };
		}

		const currentQuestionIndex = questionIndex + 1;
		const advanced = await transaction
			.update(assessmentAttempts)
			.set({
				currentQuestionIndex: sql`greatest(${assessmentAttempts.currentQuestionIndex}, ${currentQuestionIndex})`,
			})
			.where(
				and(
					eq(assessmentAttempts.id, attempt.id),
					eq(assessmentAttempts.guestSessionId, attempt.guestSessionId),
					eq(
						assessmentAttempts.continuationTokenHash,
						input.continuationTokenHash,
					),
					isNull(assessmentAttempts.completedAt),
				),
			)
			.returning({
				id: assessmentAttempts.id,
				currentQuestionIndex: assessmentAttempts.currentQuestionIndex,
			});

		if (advanced.length !== 1) {
			return { status: "not-found" as const };
		}

		if (input.optionId) {
			await transaction
				.insert(assessmentAnswers)
				.values({
					attemptId: attempt.id,
					questionId: question.id,
					optionId: input.optionId,
				})
				.onConflictDoUpdate({
					target: [assessmentAnswers.attemptId, assessmentAnswers.questionId],
					set: { optionId: input.optionId },
				});
		} else {
			await transaction
				.delete(assessmentAnswers)
				.where(
					and(
						eq(assessmentAnswers.attemptId, attempt.id),
						eq(assessmentAnswers.questionId, question.id),
					),
				);
		}

		return {
			status: "saved" as const,
			currentQuestionIndex:
				advanced[0]?.currentQuestionIndex ?? currentQuestionIndex,
		};
	});
}

export async function completeGuestAssessmentAttempt(
	db: DbClient,
	input: {
		attemptId: string;
		tokenHash: string;
		continuationTokenHash: string;
		questionId: string;
		optionId: string | null;
		now: Date;
	},
) {
	return db.transaction(async (transaction) => {
		const [attempt] = await transaction
			.select({
				id: assessmentAttempts.id,
				guestSessionId: assessmentAttempts.guestSessionId,
				assessmentVersionId: assessmentAttempts.assessmentVersionId,
				completedAt: assessmentAttempts.completedAt,
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
					eq(
						assessmentAttempts.continuationTokenHash,
						input.continuationTokenHash,
					),
					gt(guestSessions.expiresAt, input.now),
				),
			)
			.limit(1);

		if (!attempt?.guestSessionId) {
			return { status: "not-found" as const };
		}

		const questions = await transaction
			.select({
				id: assessmentQuestions.id,
				dimension: assessmentQuestions.dimension,
				required: assessmentQuestions.required,
			})
			.from(assessmentQuestions)
			.where(eq(assessmentQuestions.versionId, attempt.assessmentVersionId))
			.orderBy(assessmentQuestions.sortOrder);
		const dimensions = [
			...new Set(questions.map((question) => question.dimension)),
		];

		if (attempt.completedAt) {
			const [storedResult] = await transaction
				.select(assessmentResultColumns)
				.from(assessmentResults)
				.where(eq(assessmentResults.attemptId, attempt.id))
				.limit(1);

			return storedResult
				? {
						status: "completed" as const,
						result: toGuestAssessmentResult(
							storedResult,
							attempt.completedAt,
							dimensions,
						),
					}
				: { status: "not-found" as const };
		}

		const finalQuestion = questions.at(-1);

		if (
			!finalQuestion ||
			finalQuestion.id !== input.questionId ||
			(finalQuestion.required && !input.optionId)
		) {
			return { status: "invalid-answer" as const };
		}

		let finalScoreWeights: unknown = null;

		if (input.optionId) {
			const [option] = await transaction
				.select({ scoreWeights: assessmentOptions.scoreWeights })
				.from(assessmentOptions)
				.where(
					and(
						eq(assessmentOptions.id, input.optionId),
						eq(assessmentOptions.questionId, finalQuestion.id),
					),
				)
				.limit(1);

			if (!option) {
				return { status: "invalid-answer" as const };
			}

			finalScoreWeights = option.scoreWeights;
		}

		const existingAnswers = await transaction
			.select({
				questionId: assessmentAnswers.questionId,
				scoreWeights: assessmentOptions.scoreWeights,
			})
			.from(assessmentAnswers)
			.innerJoin(
				assessmentOptions,
				eq(assessmentOptions.id, assessmentAnswers.optionId),
			)
			.where(eq(assessmentAnswers.attemptId, attempt.id));
		const answeredQuestionIds = new Set(
			existingAnswers.map((answer) => answer.questionId),
		);

		if (
			questions.some(
				(question) =>
					question.id !== finalQuestion.id &&
					question.required &&
					!answeredQuestionIds.has(question.id),
			)
		) {
			return { status: "missing-required" as const };
		}

		const completed = await transaction
			.update(assessmentAttempts)
			.set({
				completedAt: input.now,
				currentQuestionIndex: questions.length,
			})
			.where(
				and(
					eq(assessmentAttempts.id, attempt.id),
					eq(assessmentAttempts.guestSessionId, attempt.guestSessionId),
					eq(
						assessmentAttempts.continuationTokenHash,
						input.continuationTokenHash,
					),
					isNull(assessmentAttempts.completedAt),
				),
			)
			.returning({ id: assessmentAttempts.id });

		if (completed.length !== 1) {
			const [concurrentResult] = await transaction
				.select({
					...assessmentResultColumns,
					completedAt: assessmentAttempts.completedAt,
				})
				.from(assessmentResults)
				.innerJoin(
					assessmentAttempts,
					eq(assessmentAttempts.id, assessmentResults.attemptId),
				)
				.where(eq(assessmentResults.attemptId, attempt.id))
				.limit(1);

			return concurrentResult?.completedAt
				? {
						status: "completed" as const,
						result: toGuestAssessmentResult(
							concurrentResult,
							concurrentResult.completedAt,
							dimensions,
						),
					}
				: { status: "not-found" as const };
		}

		if (input.optionId) {
			await transaction
				.insert(assessmentAnswers)
				.values({
					attemptId: attempt.id,
					questionId: finalQuestion.id,
					optionId: input.optionId,
				})
				.onConflictDoUpdate({
					target: [assessmentAnswers.attemptId, assessmentAnswers.questionId],
					set: { optionId: input.optionId },
				});
		} else {
			await transaction
				.delete(assessmentAnswers)
				.where(
					and(
						eq(assessmentAnswers.attemptId, attempt.id),
						eq(assessmentAnswers.questionId, finalQuestion.id),
					),
				);
		}

		const score = scoreDimensionMeanAssessment(questions, [
			...existingAnswers.filter(
				(answer) => answer.questionId !== finalQuestion.id,
			),
			...(input.optionId
				? [{ questionId: finalQuestion.id, scoreWeights: finalScoreWeights }]
				: []),
		]);
		const [storedResult] = await transaction
			.insert(assessmentResults)
			.values({
				attemptId: attempt.id,
				assessmentVersionId: attempt.assessmentVersionId,
				traitScores: score.traitScores,
				contributingQuestionCounts: score.contributingQuestionCounts,
				scoringAlgorithmVersion: score.scoringAlgorithmVersion,
				confidence: null,
			})
			.returning(assessmentResultColumns);

		if (!storedResult) {
			throw new Error("The assessment result could not be created.");
		}

		return {
			status: "completed" as const,
			result: toGuestAssessmentResult(storedResult, input.now, dimensions),
		};
	});
}

export async function getLatestGuestAssessmentResult(
	db: DbClient,
	input: {
		tokenHash: string;
		assessmentVersionId: string;
		now: Date;
	},
) {
	const [result] = await db
		.select({
			...assessmentResultColumns,
			completedAt: assessmentAttempts.completedAt,
		})
		.from(assessmentResults)
		.innerJoin(
			assessmentAttempts,
			eq(assessmentAttempts.id, assessmentResults.attemptId),
		)
		.innerJoin(
			guestSessions,
			eq(guestSessions.id, assessmentAttempts.guestSessionId),
		)
		.where(
			and(
				eq(guestSessions.tokenHash, input.tokenHash),
				gt(guestSessions.expiresAt, input.now),
				eq(assessmentResults.assessmentVersionId, input.assessmentVersionId),
				isNotNull(assessmentAttempts.completedAt),
			),
		)
		.orderBy(desc(assessmentAttempts.completedAt))
		.limit(1);

	if (!result?.completedAt) {
		return null;
	}

	const questions = await db
		.select({ dimension: assessmentQuestions.dimension })
		.from(assessmentQuestions)
		.where(eq(assessmentQuestions.versionId, input.assessmentVersionId))
		.orderBy(assessmentQuestions.sortOrder);
	const dimensions = [
		...new Set(questions.map((question) => question.dimension)),
	];

	return toGuestAssessmentResult(result, result.completedAt, dimensions);
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
