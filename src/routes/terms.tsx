import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "../components/LegalPage";

export const Route = createFileRoute("/terms")({
	head: () => ({
		meta: [
			{
				title: "Terms of Use | Kelsier",
			},
			{
				name: "description",
				content:
					"Placeholder terms of use for the Kelsier behavioural team intelligence prototype.",
			},
		],
	}),
	component: TermsRoute,
});

function TermsRoute() {
	return (
		<LegalPage title="Terms of Use" updatedAt="April 29, 2026">
			<section>
				<h2>Prototype Notice</h2>
				<p>
					These placeholder terms exist so contributors and reviewers can
					validate legal navigation while the full terms are being prepared.
				</p>
			</section>
			<section>
				<h2>Use Of The Prototype</h2>
				<p>
					Kelsier is currently a front-end prototype. The assessment flow is for
					demonstration and does not provide production advice or persisted
					results.
				</p>
			</section>
			<section>
				<h2>Contact</h2>
				<p>
					Questions about these placeholder terms can be sent to{" "}
					<a href="mailto:hello@kelsier.example">hello@kelsier.example</a>.
				</p>
			</section>
		</LegalPage>
	);
}
