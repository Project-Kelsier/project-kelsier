export const ACTIVE_ASSESSMENT_SLUG = "kelsier-core-v1";

export type AssessmentQuestionnaireOption = {
	id: string;
	label: string;
};

export type AssessmentQuestionnaireQuestion = {
	id: string;
	prompt: string;
	required: boolean;
	options: AssessmentQuestionnaireOption[];
};

export type AssessmentQuestionnaire = {
	id: string;
	slug: string;
	title: string;
	description: string | null;
	questions: AssessmentQuestionnaireQuestion[];
};
