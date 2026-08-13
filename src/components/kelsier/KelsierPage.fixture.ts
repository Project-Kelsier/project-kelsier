import type {
	AssessmentPersistenceActions,
	AssessmentQuestionnaire,
} from "#/lib/assessmentQuestionnaire";

export const assessmentPersistenceActionsFixture: AssessmentPersistenceActions =
	{
		startAttempt: async () => ({
			attemptId: "10000000-0000-4000-8000-000000000001",
			expiresAt: "2026-08-18T00:00:00.000Z",
			continuationToken: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
		}),
		resumeAttempt: async (_attemptId, continuationToken) => ({
			attemptId: "10000000-0000-4000-8000-000000000001",
			expiresAt: "2026-08-18T00:00:00.000Z",
			continuationToken,
			currentQuestionIndex: 1,
			answers: { "deadline-response": "restructure" },
		}),
		startFreshAttempt: async (_attemptId, continuationToken) => ({
			attemptId: "10000000-0000-4000-8000-000000000002",
			expiresAt: "2026-08-18T00:00:00.000Z",
			continuationToken,
		}),
		saveAnswer: async () => ({ currentQuestionIndex: 1 }),
		deleteAttempt: async () => ({ deleted: true }),
	};

export const assessmentQuestionnaireFixture: AssessmentQuestionnaire = {
	id: "questionnaire-fixture",
	slug: "questionnaire-fixture",
	title: "Questionnaire fixture",
	description: "Stable component and Storybook fixture.",
	questions: [
		{
			id: "deadline-response",
			prompt: "When a deadline moves unexpectedly, you tend to…",
			required: true,
			options: [
				{ id: "restructure", label: "Restructure immediately" },
				{ id: "flag-team", label: "Flag it to the team" },
				{ id: "absorb", label: "Absorb and adapt" },
			],
		},
		{
			id: "conflict-style",
			prompt: "Your preferred way to resolve conflict is…",
			required: true,
			options: [
				{ id: "direct", label: "Direct conversation" },
				{ id: "common-ground", label: "Find common ground first" },
				{ id: "space", label: "Give space, then talk" },
			],
		},
		{
			id: "new-joiner",
			prompt: "A new team member joins mid-sprint. You…",
			required: true,
			options: [
				{ id: "brief", label: "Brief them fully on day one" },
				{ id: "shadow", label: "Let them shadow first" },
				{ id: "pair", label: "Pair them with the strongest collaborator" },
			],
		},
	],
};
