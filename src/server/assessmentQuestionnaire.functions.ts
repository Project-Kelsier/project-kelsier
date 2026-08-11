import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "#/db/client.worker";
import { ACTIVE_ASSESSMENT_SLUG } from "#/lib/assessmentQuestionnaire";
import { getActiveAssessmentQuestionnaireBySlug } from "#/services/assessments";

export const getActiveAssessmentQuestionnaire = createServerFn({
	method: "GET",
}).handler(async () => {
	const questionnaire = await getActiveAssessmentQuestionnaireBySlug(
		getDb(env),
		ACTIVE_ASSESSMENT_SLUG,
	);

	if (!questionnaire || questionnaire.questions.length === 0) {
		throw new Error("The active assessment questionnaire is unavailable.");
	}

	return questionnaire;
});
