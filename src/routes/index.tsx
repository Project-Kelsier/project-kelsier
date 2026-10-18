import { createFileRoute, useRouter } from "@tanstack/react-router";
import { KelsierAssessmentUnavailablePage } from "../components/kelsier/KelsierAssessmentUnavailablePage";
import { KelsierPage } from "../components/kelsier/KelsierPage";
import { getActiveAssessmentQuestionnaire } from "../server/assessmentQuestionnaire.functions";
import {
	completeGuestAssessment,
	deleteGuestAttempt,
	getGuestAssessmentEntry,
	getGuestAssessmentResult,
	resumeGuestAssessment,
	saveGuestAnswer,
	startFreshGuestAssessment,
	startGuestAssessment,
} from "../server/guestAssessment.functions";

export const Route = createFileRoute("/")({
	loader: async () => {
		const questionnaire = await getActiveAssessmentQuestionnaire();
		const guestAssessmentEntry = await getGuestAssessmentEntry({
			data: { assessmentVersionId: questionnaire.id },
		});
		const guestAssessmentResult = guestAssessmentEntry
			? null
			: await getGuestAssessmentResult({
					data: { assessmentVersionId: questionnaire.id },
				});

		return { questionnaire, guestAssessmentEntry, guestAssessmentResult };
	},
	head: () => ({
		meta: [
			{
				title: "Kelsier | Behavioural team intelligence",
			},
			{
				name: "description",
				content:
					"Kelsier reveals the hidden behavioural dynamics shaping every team decision, conflict, and breakthrough.",
			},
		],
	}),
	component: HomeRoute,
	errorComponent: HomeError,
});

function HomeError() {
	const router = useRouter();
	return (
		<KelsierAssessmentUnavailablePage
			onRetry={() => {
				// A loader failure needs a reload as well as an error-boundary reset.
				void router.invalidate();
			}}
		/>
	);
}

function HomeRoute() {
	const { questionnaire, guestAssessmentEntry, guestAssessmentResult } =
		Route.useLoaderData();

	return (
		<KelsierPage
			questionnaire={questionnaire}
			initialGuestAssessmentEntry={guestAssessmentEntry}
			initialGuestAssessmentResult={guestAssessmentResult}
			persistenceActions={{
				startAttempt: () => startGuestAssessment(),
				resumeAttempt: (attemptId, continuationToken) =>
					resumeGuestAssessment({
						data: { attemptId, continuationToken },
					}),
				startFreshAttempt: (attemptId, continuationToken) =>
					startFreshGuestAssessment({
						data: { attemptId, continuationToken },
					}),
				saveAnswer: (input) => saveGuestAnswer({ data: input }),
				completeAttempt: (input) => completeGuestAssessment({ data: input }),
				deleteAttempt: (attemptId) =>
					deleteGuestAttempt({ data: { attemptId } }),
			}}
		/>
	);
}
