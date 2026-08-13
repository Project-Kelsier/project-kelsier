import { eq, gt, isNotNull, isNull } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import {
	assessmentAttempts,
	assessmentOptions,
	assessmentQuestions,
	assessmentResults,
	assessmentVersions,
	guestSessions,
} from "#/db/schema";
import {
	completeGuestAssessmentAttempt,
	createGuestAssessmentAttempt,
	deleteGuestAssessmentAttempt,
	getActiveAssessmentQuestionnaireBySlug,
	getActiveGuestSessionByTokenHash,
	getAssessmentResultForUserAttempt,
	getGuestIncompleteAssessmentEntry,
	getLatestGuestAssessmentResult,
	listAssessmentAttemptsForUser,
	resumeGuestAssessmentAttempt,
	saveGuestAssessmentAnswer,
} from "./assessments";

vi.mock("drizzle-orm", async (importOriginal) => {
	const actual = await importOriginal<typeof import("drizzle-orm")>();

	return {
		...actual,
		and: vi.fn((...conditions: unknown[]) => ({ conditions })),
		eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
		gt: vi.fn((left: unknown, right: unknown) => ({ left, right })),
		isNotNull: vi.fn((column: unknown) => ({ column })),
		isNull: vi.fn((column: unknown) => ({ column })),
	};
});

describe("assessment service owner visibility", () => {
	it("lists attempts by their personal user owner without organisation scope", async () => {
		const where = vi.fn().mockResolvedValue([]);
		const db = {
			select: vi.fn(() => ({
				from: vi.fn(() => ({ where })),
			})),
		} as unknown as DbClient;
		const userId = "00000000-0000-4000-8000-000000000002";

		await listAssessmentAttemptsForUser(db, userId);

		expect(eq).toHaveBeenCalledWith(assessmentAttempts.userId, userId);
	});

	it("loads a result only through an attempt owned by the requested user", async () => {
		const limit = vi.fn().mockResolvedValue([]);
		const where = vi.fn(() => ({ limit }));
		const innerJoin = vi.fn(() => ({ where }));
		const db = {
			select: vi.fn(() => ({
				from: vi.fn(() => ({ innerJoin })),
			})),
		} as unknown as DbClient;
		const userId = "00000000-0000-4000-8000-000000000002";
		const attemptId = "00000000-0000-4000-8000-000000000003";

		await getAssessmentResultForUserAttempt(db, userId, attemptId);

		expect(innerJoin.mock.calls.at(-1)?.at(0)).toBe(assessmentAttempts);
		expect(eq).toHaveBeenCalledWith(assessmentAttempts.id, attemptId);
		expect(eq).toHaveBeenCalledWith(assessmentAttempts.userId, userId);
	});

	it("loads a guest result only through its unexpired guest credential", async () => {
		const limit = vi.fn().mockResolvedValue([]);
		const orderBy = vi.fn(() => ({ limit }));
		const where = vi.fn(() => ({ orderBy }));
		const secondInnerJoin = vi.fn(() => ({ where }));
		const firstInnerJoin = vi.fn(() => ({ innerJoin: secondInnerJoin }));
		const from = vi.fn(() => ({ innerJoin: firstInnerJoin }));
		const db = { select: vi.fn(() => ({ from })) } as unknown as DbClient;
		const now = new Date("2026-08-13T12:00:00.000Z");

		expect(
			await getLatestGuestAssessmentResult(db, {
				tokenHash: "guest-token-hash",
				assessmentVersionId: "version-1",
				now,
			}),
		).toBeNull();
		expect(eq).toHaveBeenCalledWith(
			guestSessions.tokenHash,
			"guest-token-hash",
		);
		expect(gt).toHaveBeenCalledWith(guestSessions.expiresAt, now);
		expect(eq).toHaveBeenCalledWith(
			assessmentResults.assessmentVersionId,
			"version-1",
		);
		expect(isNotNull).toHaveBeenCalledWith(assessmentAttempts.completedAt);
	});
});

describe("active assessment questionnaire", () => {
	it("returns only an active version with questions and options in query order", async () => {
		const versionLimit = vi.fn().mockResolvedValue([
			{
				id: "version-1",
				slug: "kelsier-core-v1",
				title: "Kelsier Core V1",
				description: "Demonstration questionnaire",
			},
		]);
		const versionWhere = vi.fn(() => ({ limit: versionLimit }));
		const versionFrom = vi.fn(() => ({ where: versionWhere }));
		const questionOrderBy = vi.fn().mockResolvedValue([
			{
				questionId: "question-1",
				prompt: "First question",
				required: true,
				optionId: "option-1",
				optionLabel: "Disagree",
			},
			{
				questionId: "question-1",
				prompt: "First question",
				required: true,
				optionId: "option-2",
				optionLabel: "Agree",
			},
			{
				questionId: "question-2",
				prompt: "Optional question",
				required: false,
				optionId: "option-3",
				optionLabel: "Neutral",
			},
		]);
		const questionWhere = vi.fn(() => ({ orderBy: questionOrderBy }));
		const questionInnerJoin = vi.fn(() => ({ where: questionWhere }));
		const questionFrom = vi.fn(() => ({ innerJoin: questionInnerJoin }));
		const db = {
			select: vi
				.fn()
				.mockReturnValueOnce({ from: versionFrom })
				.mockReturnValueOnce({ from: questionFrom }),
		} as unknown as DbClient;

		const questionnaire = await getActiveAssessmentQuestionnaireBySlug(
			db,
			"kelsier-core-v1",
		);

		expect(eq).toHaveBeenCalledWith(assessmentVersions.slug, "kelsier-core-v1");
		expect(eq).toHaveBeenCalledWith(assessmentVersions.status, "active");
		expect(questionInnerJoin).toHaveBeenCalledWith(
			assessmentOptions,
			expect.anything(),
		);
		expect(eq).toHaveBeenCalledWith(assessmentQuestions.versionId, "version-1");
		expect(questionOrderBy).toHaveBeenCalledWith(
			assessmentQuestions.sortOrder,
			assessmentOptions.sortOrder,
		);
		expect(questionnaire).toEqual({
			id: "version-1",
			slug: "kelsier-core-v1",
			title: "Kelsier Core V1",
			description: "Demonstration questionnaire",
			questions: [
				{
					id: "question-1",
					prompt: "First question",
					required: true,
					options: [
						{ id: "option-1", label: "Disagree" },
						{ id: "option-2", label: "Agree" },
					],
				},
				{
					id: "question-2",
					prompt: "Optional question",
					required: false,
					options: [{ id: "option-3", label: "Neutral" }],
				},
			],
		});
	});

	it("returns null without querying questions when the active version is absent", async () => {
		const limit = vi.fn().mockResolvedValue([]);
		const where = vi.fn(() => ({ limit }));
		const from = vi.fn(() => ({ where }));
		const db = {
			select: vi.fn(() => ({ from })),
		} as unknown as DbClient;

		expect(
			await getActiveAssessmentQuestionnaireBySlug(db, "missing-version"),
		).toBeNull();
		expect(db.select).toHaveBeenCalledOnce();
	});
});

describe("guest assessment ownership", () => {
	it("does not complete an attempt owned by another guest credential", async () => {
		const limit = vi.fn().mockResolvedValue([]);
		const where = vi.fn(() => ({ limit }));
		const innerJoin = vi.fn(() => ({ where }));
		const from = vi.fn(() => ({ innerJoin }));
		const transaction = {
			select: vi.fn(() => ({ from })),
			update: vi.fn(),
			insert: vi.fn(),
		};
		const db = {
			transaction: vi.fn((callback) => callback(transaction)),
		} as unknown as DbClient;

		expect(
			await completeGuestAssessmentAttempt(db, {
				attemptId: "attempt-1",
				tokenHash: "guest-token-hash",
				continuationTokenHash: "continuation-token-hash",
				questionId: "question-10",
				optionId: "option-1",
				now: new Date("2026-08-13T12:00:00.000Z"),
			}),
		).toEqual({ status: "not-found" });
		expect(eq).toHaveBeenCalledWith(assessmentAttempts.id, "attempt-1");
		expect(eq).toHaveBeenCalledWith(
			guestSessions.tokenHash,
			"guest-token-hash",
		);
		expect(eq).toHaveBeenCalledWith(
			assessmentAttempts.continuationTokenHash,
			"continuation-token-hash",
		);
		expect(transaction.update).not.toHaveBeenCalled();
		expect(transaction.insert).not.toHaveBeenCalled();
	});

	it("loads a guest session only by its token hash and unexpired lifetime", async () => {
		const now = new Date("2026-08-11T12:00:00.000Z");
		const limit = vi.fn().mockResolvedValue([
			{
				id: "session-1",
				expiresAt: new Date("2026-08-18T12:00:00.000Z"),
			},
		]);
		const where = vi.fn(() => ({ limit }));
		const from = vi.fn(() => ({ where }));
		const db = { select: vi.fn(() => ({ from })) } as unknown as DbClient;

		await getActiveGuestSessionByTokenHash(db, "token-hash", now);

		expect(eq).toHaveBeenCalledWith(guestSessions.tokenHash, "token-hash");
		expect(gt).toHaveBeenCalledWith(guestSessions.expiresAt, now);
	});

	it("creates a new session and its attempt in one transaction", async () => {
		const expiresAt = new Date("2026-08-18T12:00:00.000Z");
		const sessionReturning = vi.fn().mockResolvedValue([{ id: "session-1" }]);
		const attemptReturning = vi.fn().mockResolvedValue([
			{
				id: "attempt-1",
				startedAt: new Date("2026-08-11T12:00:00.000Z"),
			},
		]);
		const sessionValues = vi.fn(() => ({ returning: sessionReturning }));
		const attemptValues = vi.fn(() => ({ returning: attemptReturning }));
		const transaction = {
			insert: vi
				.fn()
				.mockReturnValueOnce({ values: sessionValues })
				.mockReturnValueOnce({ values: attemptValues }),
		};
		const db = {
			transaction: vi.fn((callback) => callback(transaction)),
		} as unknown as DbClient;

		const attempt = await createGuestAssessmentAttempt(db, {
			assessmentVersionId: "version-1",
			continuationTokenHash: "continuation-token-hash",
			tokenHash: "token-hash",
			expiresAt,
		});

		expect(transaction.insert).toHaveBeenNthCalledWith(1, guestSessions);
		expect(transaction.insert).toHaveBeenNthCalledWith(2, assessmentAttempts);
		expect(sessionValues).toHaveBeenCalledWith({
			tokenHash: "token-hash",
			expiresAt,
		});
		expect(attemptValues).toHaveBeenCalledWith({
			guestSessionId: "session-1",
			assessmentVersionId: "version-1",
			continuationTokenHash: "continuation-token-hash",
		});
		expect(attempt).toMatchObject({ id: "attempt-1", expiresAt });
	});

	it("recognizes final-step submission when every required answer is saved", async () => {
		const attemptLimit = vi.fn().mockResolvedValue([
			{
				id: "attempt-1",
				startedAt: new Date("2026-08-11T11:00:00.000Z"),
				resumedAt: null,
				currentQuestionIndex: 2,
				expiresAt: new Date("2026-08-18T11:00:00.000Z"),
			},
		]);
		const attemptOrderBy = vi.fn(() => ({ limit: attemptLimit }));
		const attemptWhere = vi.fn(() => ({ orderBy: attemptOrderBy }));
		const attemptInnerJoin = vi.fn(() => ({ where: attemptWhere }));
		const attemptFrom = vi.fn(() => ({ innerJoin: attemptInnerJoin }));
		const questionWhere = vi.fn().mockResolvedValue([
			{ id: "question-required", required: true },
			{ id: "question-optional", required: false },
		]);
		const questionFrom = vi.fn(() => ({ where: questionWhere }));
		const answerWhere = vi
			.fn()
			.mockResolvedValue([
				{ questionId: "question-required", optionId: "option-1" },
			]);
		const answerFrom = vi.fn(() => ({ where: answerWhere }));
		const db = {
			select: vi
				.fn()
				.mockReturnValueOnce({ from: attemptFrom })
				.mockReturnValueOnce({ from: questionFrom })
				.mockReturnValueOnce({ from: answerFrom }),
		} as unknown as DbClient;

		const entry = await getGuestIncompleteAssessmentEntry(db, {
			tokenHash: "guest-token-hash",
			assessmentVersionId: "version-1",
			now: new Date("2026-08-11T12:00:00.000Z"),
		});

		expect(entry).toMatchObject({
			id: "attempt-1",
			answeredCount: 1,
			answersComplete: true,
			answers: [{ questionId: "question-required", optionId: "option-1" }],
		});
	});

	it("consumes the resume with ownership and completion checks repeated on the write", async () => {
		const now = new Date("2026-08-11T12:00:00.000Z");
		const limit = vi.fn().mockResolvedValue([
			{
				id: "attempt-1",
				guestSessionId: "session-1",
				assessmentVersionId: "version-1",
				currentQuestionIndex: 1,
				resumedAt: null,
				continuationTokenHash: "old-continuation-hash",
			},
		]);
		const selectWhere = vi.fn(() => ({ limit }));
		const innerJoin = vi.fn(() => ({ where: selectWhere }));
		const from = vi.fn(() => ({ innerJoin }));
		const questionWhere = vi
			.fn()
			.mockResolvedValue([{ id: "question-1" }, { id: "question-2" }]);
		const questionFrom = vi.fn(() => ({ where: questionWhere }));
		const returning = vi.fn().mockResolvedValue([{ id: "attempt-1" }]);
		const updateWhere = vi.fn(() => ({ returning }));
		const set = vi.fn(() => ({ where: updateWhere }));
		const transaction = {
			select: vi
				.fn()
				.mockReturnValueOnce({ from })
				.mockReturnValueOnce({ from: questionFrom }),
			update: vi.fn(() => ({ set })),
		};
		const db = {
			transaction: vi.fn((callback) => callback(transaction)),
		} as unknown as DbClient;

		expect(
			await resumeGuestAssessmentAttempt(db, {
				attemptId: "attempt-1",
				tokenHash: "guest-token-hash",
				continuationTokenHash: "new-continuation-hash",
				now,
			}),
		).toBe("resumed");
		expect(set).toHaveBeenCalledWith({
			resumedAt: now,
			continuationTokenHash: "new-continuation-hash",
		});
		expect(eq).toHaveBeenCalledWith(
			guestSessions.tokenHash,
			"guest-token-hash",
		);
		expect(eq).toHaveBeenCalledWith(assessmentAttempts.id, "attempt-1");
		expect(eq).toHaveBeenCalledWith(
			assessmentAttempts.guestSessionId,
			"session-1",
		);
		expect(isNull).toHaveBeenCalledWith(assessmentAttempts.resumedAt);
		expect(isNull).toHaveBeenCalledWith(assessmentAttempts.completedAt);
	});

	it("rejects a second resume without writing a new continuation token", async () => {
		const limit = vi.fn().mockResolvedValue([
			{
				id: "attempt-1",
				guestSessionId: "session-1",
				assessmentVersionId: "version-1",
				currentQuestionIndex: 1,
				resumedAt: new Date("2026-08-11T11:00:00.000Z"),
				continuationTokenHash: "first-resume-hash",
			},
		]);
		const where = vi.fn(() => ({ limit }));
		const innerJoin = vi.fn(() => ({ where }));
		const from = vi.fn(() => ({ innerJoin }));
		const questionWhere = vi
			.fn()
			.mockResolvedValue([{ id: "question-1" }, { id: "question-2" }]);
		const questionFrom = vi.fn(() => ({ where: questionWhere }));
		const transaction = {
			select: vi
				.fn()
				.mockReturnValueOnce({ from })
				.mockReturnValueOnce({ from: questionFrom }),
			update: vi.fn(),
		};
		const db = {
			transaction: vi.fn((callback) => callback(transaction)),
		} as unknown as DbClient;

		expect(
			await resumeGuestAssessmentAttempt(db, {
				attemptId: "attempt-1",
				tokenHash: "guest-token-hash",
				continuationTokenHash: "second-resume-hash",
				now: new Date("2026-08-11T12:00:00.000Z"),
			}),
		).toBe("resume-unavailable");
		expect(transaction.update).not.toHaveBeenCalled();
	});

	it("rejects an option from another question before any answer write", async () => {
		const attemptLimit = vi.fn().mockResolvedValue([
			{
				id: "attempt-1",
				guestSessionId: "session-1",
				assessmentVersionId: "version-1",
			},
		]);
		const attemptWhere = vi.fn(() => ({ limit: attemptLimit }));
		const attemptInnerJoin = vi.fn(() => ({ where: attemptWhere }));
		const attemptFrom = vi.fn(() => ({ innerJoin: attemptInnerJoin }));
		const questionOrderBy = vi
			.fn()
			.mockResolvedValue([{ id: "question-1", required: true }]);
		const questionWhere = vi.fn(() => ({ orderBy: questionOrderBy }));
		const questionFrom = vi.fn(() => ({ where: questionWhere }));
		const optionLimit = vi.fn().mockResolvedValue([]);
		const optionWhere = vi.fn(() => ({ limit: optionLimit }));
		const optionFrom = vi.fn(() => ({ where: optionWhere }));
		const transaction = {
			select: vi
				.fn()
				.mockReturnValueOnce({ from: attemptFrom })
				.mockReturnValueOnce({ from: questionFrom })
				.mockReturnValueOnce({ from: optionFrom }),
			update: vi.fn(),
			insert: vi.fn(),
		};
		const db = {
			transaction: vi.fn((callback) => callback(transaction)),
		} as unknown as DbClient;

		expect(
			await saveGuestAssessmentAnswer(db, {
				attemptId: "attempt-1",
				tokenHash: "guest-token-hash",
				continuationTokenHash: "continuation-token-hash",
				questionId: "question-1",
				optionId: "option-from-another-question",
				now: new Date("2026-08-11T12:00:00.000Z"),
			}),
		).toEqual({ status: "invalid-answer" });
		expect(eq).toHaveBeenCalledWith(assessmentAttempts.id, "attempt-1");
		expect(eq).toHaveBeenCalledWith(
			guestSessions.tokenHash,
			"guest-token-hash",
		);
		expect(eq).toHaveBeenCalledWith(
			assessmentAttempts.continuationTokenHash,
			"continuation-token-hash",
		);
		expect(eq).toHaveBeenCalledWith(assessmentOptions.questionId, "question-1");
		expect(transaction.update).not.toHaveBeenCalled();
		expect(transaction.insert).not.toHaveBeenCalled();
	});

	it("does not delete an attempt that the guest credential does not own", async () => {
		const limit = vi.fn().mockResolvedValue([]);
		const where = vi.fn(() => ({ limit }));
		const innerJoin = vi.fn(() => ({ where }));
		const from = vi.fn(() => ({ innerJoin }));
		const db = {
			select: vi.fn(() => ({ from })),
			delete: vi.fn(),
		} as unknown as DbClient;
		const now = new Date("2026-08-11T12:00:00.000Z");

		const deleted = await deleteGuestAssessmentAttempt(db, {
			attemptId: "attempt-owned-by-another-session",
			tokenHash: "requesting-session-hash",
			now,
		});

		expect(deleted).toBe(false);
		expect(innerJoin).toHaveBeenCalledWith(guestSessions, expect.anything());
		expect(eq).toHaveBeenCalledWith(
			assessmentAttempts.id,
			"attempt-owned-by-another-session",
		);
		expect(eq).toHaveBeenCalledWith(
			guestSessions.tokenHash,
			"requesting-session-hash",
		);
		expect(gt).toHaveBeenCalledWith(guestSessions.expiresAt, now);
		expect(db.delete).not.toHaveBeenCalled();
	});

	it("deletes an owned attempt with the owner predicate repeated on the write", async () => {
		const limit = vi
			.fn()
			.mockResolvedValue([{ id: "attempt-1", guestSessionId: "session-1" }]);
		const selectWhere = vi.fn(() => ({ limit }));
		const innerJoin = vi.fn(() => ({ where: selectWhere }));
		const from = vi.fn(() => ({ innerJoin }));
		const returning = vi.fn().mockResolvedValue([{ id: "attempt-1" }]);
		const deleteWhere = vi.fn(() => ({ returning }));
		const db = {
			select: vi.fn(() => ({ from })),
			delete: vi.fn(() => ({ where: deleteWhere })),
		} as unknown as DbClient;

		expect(
			await deleteGuestAssessmentAttempt(db, {
				attemptId: "attempt-1",
				tokenHash: "token-hash",
				now: new Date("2026-08-11T12:00:00.000Z"),
			}),
		).toBe(true);
		expect(db.delete).toHaveBeenCalledWith(assessmentAttempts);
		expect(eq).toHaveBeenCalledWith(
			assessmentAttempts.guestSessionId,
			"session-1",
		);
	});
});
