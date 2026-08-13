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
	continuationToken: string;
};

export type GuestAssessmentEntry = {
	attemptId: string;
	startedAt: string;
	expiresAt: string;
	answeredCount: number;
	answersComplete: boolean;
	answers?: Record<string, string>;
	resumeAvailable: boolean;
};

export type GuestAssessmentProgress = GuestAssessmentAttempt & {
	currentQuestionIndex: number;
	answers: Record<string, string>;
};

export type SaveGuestAssessmentAnswerInput = {
	attemptId: string;
	continuationToken: string;
	questionId: string;
	optionId: string | null;
};

export type AssessmentPersistenceActions = {
	startAttempt: () => Promise<GuestAssessmentAttempt>;
	resumeAttempt: (
		attemptId: string,
		continuationToken: string,
	) => Promise<GuestAssessmentProgress>;
	startFreshAttempt: (
		attemptId: string,
		continuationToken: string,
	) => Promise<GuestAssessmentAttempt>;
	saveAnswer: (
		input: SaveGuestAssessmentAnswerInput,
	) => Promise<{ currentQuestionIndex: number }>;
	deleteAttempt: (attemptId: string) => Promise<{ deleted: boolean }>;
};

export function generateAssessmentContinuationToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	let binary = "";

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replace(/=+$/, "");
}
