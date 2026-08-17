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
		<LegalPage title="Privacy Policy" updatedAt="August 17, 2026">
			<section className="border-[rgba(49,31,76,0.12)] border-t py-6">
				<h2 className="mt-0 mb-3 text-base">Prototype Notice</h2>
				<p className="m-0 max-w-[64ch] text-[#584a72] leading-[1.8]">
					This development notice exists so contributors and reviewers can
					validate the guest assessment flow while the final launch policy and
					contact details are being reviewed. The writable flow is not approved
					for public launch yet.
				</p>
			</section>
			<section className="border-[rgba(49,31,76,0.12)] border-t py-6">
				<h2 className="mt-0 mb-3 text-base">Data Collection</h2>
				<p className="m-0 max-w-[64ch] text-[#584a72] leading-[1.8]">
					Starting the assessment creates a pseudonymous guest attempt that
					expires seven days after creation in development. The service stores a
					cryptographic hash of an opaque guest credential; the raw credential
					is kept in an HttpOnly browser cookie. Names, email addresses,
					analytics identifiers, raw IP addresses, and user-agent strings are
					not attached to the attempt. Selected answers and the resulting
					demonstration dimension scores are stored under the attempt until it
					is deleted or expires.
				</p>
			</section>
			<section className="border-[rgba(49,31,76,0.12)] border-t py-6">
				<h2 className="mt-0 mb-3 text-base">Access And Deletion</h2>
				<p className="m-0 max-w-[64ch] text-[#584a72] leading-[1.8]">
					The guest cookie authorizes this browser to access or delete its own
					attempt. If the cookie is lost, Kelsier cannot identify or delete that
					attempt directly; automatic expiry is the remaining deletion
					mechanism.
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
