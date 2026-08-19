export const DIMENSION_MEAN_SCORING_VERSION = "dimension-mean-v1";

const MINIMUM_SCORE = 1;
const MAXIMUM_SCORE = 5;
const STORED_DECIMAL_PLACES = 4;

export type AssessmentScoringQuestion = {
	id: string;
	dimension: string;
};

export type AssessmentScoringAnswer = {
	questionId: string;
	scoreWeights: unknown;
};

export type AssessmentScore = {
	traitScores: Record<string, number>;
	contributingQuestionCounts: Record<string, number>;
	scoringAlgorithmVersion: typeof DIMENSION_MEAN_SCORING_VERSION;
};

function assertScoreWeights(
	value: unknown,
	questionId: string,
): asserts value is Record<string, number> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`Question ${questionId} has invalid score weights.`);
	}

	for (const [dimension, score] of Object.entries(value)) {
		if (
			!dimension ||
			typeof score !== "number" ||
			!Number.isFinite(score) ||
			score < MINIMUM_SCORE ||
			score > MAXIMUM_SCORE
		) {
			throw new Error(`Question ${questionId} has invalid score weights.`);
		}
	}
}

export function scoreDimensionMeanAssessment(
	questions: AssessmentScoringQuestion[],
	answers: AssessmentScoringAnswer[],
): AssessmentScore {
	const questionIds = new Set(questions.map((question) => question.id));
	const dimensions = [
		...new Set(questions.map((question) => question.dimension)),
	];
	const scoreTotals = Object.fromEntries(
		dimensions.map((dimension) => [dimension, 0]),
	);
	const contributingQuestionCounts = Object.fromEntries(
		dimensions.map((dimension) => [dimension, 0]),
	);
	const answeredQuestionIds = new Set<string>();

	for (const answer of answers) {
		if (
			!questionIds.has(answer.questionId) ||
			answeredQuestionIds.has(answer.questionId)
		) {
			throw new Error(`Question ${answer.questionId} has an invalid answer.`);
		}

		answeredQuestionIds.add(answer.questionId);
		assertScoreWeights(answer.scoreWeights, answer.questionId);

		for (const [dimension, score] of Object.entries(answer.scoreWeights)) {
			if (!(dimension in contributingQuestionCounts)) {
				throw new Error(
					`Question ${answer.questionId} references an unknown dimension.`,
				);
			}

			scoreTotals[dimension] = (scoreTotals[dimension] ?? 0) + score;
			contributingQuestionCounts[dimension] =
				(contributingQuestionCounts[dimension] ?? 0) + 1;
		}
	}

	const traitScores: Record<string, number> = {};

	for (const dimension of dimensions) {
		const count = contributingQuestionCounts[dimension] ?? 0;

		if (count > 0) {
			traitScores[dimension] = Number(
				((scoreTotals[dimension] ?? 0) / count).toFixed(STORED_DECIMAL_PLACES),
			);
		}
	}

	return {
		traitScores,
		contributingQuestionCounts,
		scoringAlgorithmVersion: DIMENSION_MEAN_SCORING_VERSION,
	};
}

export function formatAssessmentDimension(dimension: string) {
	const words = dimension.replaceAll("_", " ").trim();

	return words ? `${words[0]?.toUpperCase()}${words.slice(1)}` : dimension;
}
