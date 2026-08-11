import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import {
	assessmentAttempts,
	assessmentOptions,
	assessmentQuestions,
	assessmentVersions,
} from "#/db/schema";
import {
	getActiveAssessmentQuestionnaireBySlug,
	getAssessmentResultForUserAttempt,
	listAssessmentAttemptsForUser,
} from "./assessments";

vi.mock("drizzle-orm", async (importOriginal) => {
	const actual = await importOriginal<typeof import("drizzle-orm")>();

	return {
		...actual,
		and: vi.fn((...conditions: unknown[]) => ({ conditions })),
		eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
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
