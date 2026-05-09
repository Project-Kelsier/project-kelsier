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
			<section className="border-[rgba(49,31,76,0.12)] border-t py-6">
				<h2 className="mt-0 mb-3 text-base">Prototype Notice</h2>
				<p className="m-0 max-w-[64ch] text-[#584a72] leading-[1.8]">
					This placeholder policy exists so contributors and reviewers can
					validate the legal navigation while the full policy is being prepared.
				</p>
			</section>
			<section className="border-[rgba(49,31,76,0.12)] border-t py-6">
				<h2 className="mt-0 mb-3 text-base">Data Collection</h2>
				<p className="m-0 max-w-[64ch] text-[#584a72] leading-[1.8]">
					The current prototype does not save questionnaire answers, create user
					accounts, or send assessment responses to a production service.
				</p>
			</section>
			<section className="border-[rgba(49,31,76,0.12)] border-t py-6">
				<h2 className="mt-0 mb-3 text-base">Contact</h2>
				<p className="m-0 max-w-[64ch] text-[#584a72] leading-[1.8]">
					Questions about this placeholder policy can be sent to{" "}
					<a
						className="font-bold text-[#1f1632]"
						href="mailto:hello@kelsier.example"
					>
						hello@kelsier.example
					</a>
					.
				</p>
			</section>
		</LegalPage>
	);
}
