import { useEffect, useRef } from "react";
import { KelsierFooter } from "./KelsierFooter";
import { KelsierHeader } from "./KelsierHeader";

export function KelsierAssessmentUnavailablePage({
	onRetry,
}: {
	onRetry: () => void;
}) {
	const navRef = useRef<HTMLElement>(null);

	useEffect(() => {
		navRef.current?.classList.add("scrolled");
	}, []);

	return (
		<div className="kelsier-page k-not-found-page">
			<KelsierHeader navRef={navRef} sectionHrefPrefix="/" />
			<main className="k-not-found" aria-labelledby="assessment-error-title">
				<div className="k-not-found__orbit" aria-hidden="true">
					<span />
					<span />
					<span />
				</div>
				<p className="k-not-found__eyebrow">Signal interrupted</p>
				<h1 id="assessment-error-title" className="k-not-found__title">
					The assessment is temporarily unavailable.
				</h1>
				<p className="k-not-found__body">
					Kelsier could not load the questionnaire data. Try the request again
					in a moment.
				</p>
				<div className="k-not-found__actions">
					<button
						type="button"
						className="k-not-found__primary"
						onClick={onRetry}
					>
						Retry assessment
					</button>
					<a className="k-not-found__secondary" href="/privacy">
						Privacy notice
					</a>
				</div>
			</main>
			<KelsierFooter sectionHrefPrefix="/" />
		</div>
	);
}
