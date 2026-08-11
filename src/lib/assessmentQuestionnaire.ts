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

export type GuestAssessmentAttempt = {
	attemptId: string;
	expiresAt: string;
};

export type AssessmentPersistenceActions = {
	startAttempt: () => Promise<GuestAssessmentAttempt>;
	deleteAttempt: (attemptId: string) => Promise<{ deleted: boolean }>;
};
