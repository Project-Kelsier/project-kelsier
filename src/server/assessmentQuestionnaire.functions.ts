import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import { getDb } from "#/db/client.worker";
import { ACTIVE_ASSESSMENT_SLUG } from "#/lib/assessmentQuestionnaire";
import { getActiveAssessmentQuestionnaireBySlug } from "#/services/assessments";

export const getActiveAssessmentQuestionnaire = createServerFn({
	method: "GET",
}).handler(async () => {
	let questionnaire: Awaited<
		ReturnType<typeof getActiveAssessmentQuestionnaireBySlug>
	>;

	try {
		questionnaire = await getActiveAssessmentQuestionnaireBySlug(
			getDb(env),
			ACTIVE_ASSESSMENT_SLUG,
		);
	} catch (error) {
		console.error("Failed to load the active assessment questionnaire.", error);
		throw new Error("The assessment questionnaire is temporarily unavailable.");
	}

	if (!questionnaire || questionnaire.questions.length === 0) {
		throw new Error("The active assessment questionnaire is unavailable.");
	}

	return questionnaire;
});
