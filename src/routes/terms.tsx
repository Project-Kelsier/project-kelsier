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
			<section className="border-[rgba(49,31,76,0.12)] border-t py-6">
				<h2 className="mt-0 mb-3 text-base">Prototype Notice</h2>
				<p className="m-0 max-w-[64ch] text-[#584a72] leading-[1.8]">
					These placeholder terms exist so contributors and reviewers can
					validate legal navigation while the full terms are being prepared.
				</p>
			</section>
			<section className="border-[rgba(49,31,76,0.12)] border-t py-6">
				<h2 className="mt-0 mb-3 text-base">Use Of The Prototype</h2>
				<p className="m-0 max-w-[64ch] text-[#584a72] leading-[1.8]">
					Kelsier is currently a front-end prototype. The assessment flow is for
					demonstration and does not provide production advice or persisted
					results.
				</p>
			</section>
			<section className="border-[rgba(49,31,76,0.12)] border-t py-6">
				<h2 className="mt-0 mb-3 text-base">Contact</h2>
				<p className="m-0 max-w-[64ch] text-[#584a72] leading-[1.8]">
					Questions about these placeholder terms can be sent to{" "}
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
