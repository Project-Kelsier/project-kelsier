import { describe, expect, it } from "vitest";
import {
	type AssessmentScoringAnswer,
	DIMENSION_MEAN_SCORING_VERSION,
	formatAssessmentDimension,
	scoreDimensionMeanAssessment,
} from "./assessmentScoring";

const questions = [
	{ id: "q1", dimension: "decision_making" },
	{ id: "q2", dimension: "decision_making" },
	{ id: "q3", dimension: "adaptability" },
];

describe("scoreDimensionMeanAssessment", () => {
	it("averages contributions, rounds stored values, and preserves empty dimensions", () => {
		expect(
			scoreDimensionMeanAssessment(questions, [
				{ questionId: "q1", scoreWeights: { decision_making: 2 } },
				{ questionId: "q2", scoreWeights: { decision_making: 3.33333 } },
			]),
		).toEqual({
			traitScores: { decision_making: 2.6667 },
			contributingQuestionCounts: {
				decision_making: 2,
				adaptability: 0,
			},
			scoringAlgorithmVersion: DIMENSION_MEAN_SCORING_VERSION,
		});
	});

	const invalidAnswers: AssessmentScoringAnswer[][] = [
		[{ questionId: "unknown", scoreWeights: { decision_making: 3 } }],
		[
			{ questionId: "q1", scoreWeights: { decision_making: 3 } },
			{ questionId: "q1", scoreWeights: { decision_making: 4 } },
		],
		[{ questionId: "q1", scoreWeights: { unknown: 3 } }],
		[{ questionId: "q1", scoreWeights: { decision_making: 6 } }],
		[{ questionId: "q1", scoreWeights: null }],
	];

	for (const answers of invalidAnswers) {
		it("rejects invalid scoring input", () => {
			expect(() => scoreDimensionMeanAssessment(questions, answers)).toThrow();
		});
	}
});

it("formats stored dimension keys for people", () => {
	expect(formatAssessmentDimension("decision_making")).toBe("Decision making");
});
