import { createFileRoute } from "@tanstack/react-router";
import { KelsierAssessmentUnavailablePage } from "../components/kelsier/KelsierAssessmentUnavailablePage";
import { KelsierPage } from "../components/kelsier/KelsierPage";
import { getActiveAssessmentQuestionnaire } from "../server/assessmentQuestionnaire.functions";
import {
	deleteGuestAttempt,
	getGuestAssessmentEntry,
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

		return { questionnaire, guestAssessmentEntry };
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
	errorComponent: ({ reset }) => (
		<KelsierAssessmentUnavailablePage onRetry={reset} />
	),
});

function HomeRoute() {
	const { questionnaire, guestAssessmentEntry } = Route.useLoaderData();

	return (
		<KelsierPage
			questionnaire={questionnaire}
			initialGuestAssessmentEntry={guestAssessmentEntry}
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
				deleteAttempt: (attemptId) =>
					deleteGuestAttempt({ data: { attemptId } }),
			}}
		/>
	);
}
