import type { AssessmentQuestionnaire } from "#/lib/assessmentQuestionnaire";

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
