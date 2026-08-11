import { createFileRoute } from "@tanstack/react-router";
import { KelsierPage } from "../components/kelsier/KelsierPage";
import { getActiveAssessmentQuestionnaire } from "../server/assessmentQuestionnaire.functions";
import {
	deleteGuestAttempt,
	startGuestAssessment,
} from "../server/guestAssessment.functions";

export const Route = createFileRoute("/")({
	loader: () => getActiveAssessmentQuestionnaire(),
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
});

function HomeRoute() {
	const questionnaire = Route.useLoaderData();

	return (
		<KelsierPage
			questionnaire={questionnaire}
			persistenceActions={{
				startAttempt: () => startGuestAssessment(),
				deleteAttempt: (attemptId) =>
					deleteGuestAttempt({ data: { attemptId } }),
			}}
		/>
	);
}
