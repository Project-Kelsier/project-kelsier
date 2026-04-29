import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "../components/LegalPage";

export const Route = createFileRoute("/privacy")({
	head: () => ({
		meta: [
			{
				title: "Privacy Policy | Kelsier",
			},
			{
				name: "description",
				content:
					"Placeholder privacy policy for the Kelsier behavioural team intelligence prototype.",
			},
		],
	}),
	component: PrivacyRoute,
});

function PrivacyRoute() {
	return (
		<LegalPage title="Privacy Policy" updatedAt="April 29, 2026">
			<section>
				<h2>Prototype Notice</h2>
				<p>
					This placeholder policy exists so contributors and reviewers can
					validate the legal navigation while the full policy is being prepared.
				</p>
			</section>
			<section>
				<h2>Data Collection</h2>
				<p>
					The current prototype does not save questionnaire answers, create user
					accounts, or send assessment responses to a production service.
				</p>
			</section>
			<section>
				<h2>Contact</h2>
				<p>
					Questions about this placeholder policy can be sent to{" "}
					<a href="mailto:hello@kelsier.example">hello@kelsier.example</a>.
				</p>
			</section>
		</LegalPage>
	);
}
