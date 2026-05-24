import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { KelsierFooter } from "./KelsierFooter";
import { KelsierHeader } from "./KelsierHeader";

export function KelsierNotFoundPage() {
	const navRef = useRef<HTMLElement>(null);

	useEffect(() => {
		navRef.current?.classList.add("scrolled");
	}, []);

	return (
		<div className="kelsier-page k-not-found-page">
			<KelsierHeader navRef={navRef} sectionHrefPrefix="/" />
			<main className="k-not-found" aria-labelledby="not-found-title">
				<div className="k-not-found__orbit" aria-hidden="true">
					<span />
					<span />
					<span />
				</div>
				<p className="k-not-found__eyebrow">Signal lost</p>
				<h1 id="not-found-title" className="k-not-found__title">
					This route sits beyond the mapped team dynamic.
				</h1>
				<p className="k-not-found__body">
					The page you requested does not exist. Return to the Kelsier home
					surface or restart from the assessment entry point.
				</p>
				<div className="k-not-found__actions">
					<Link className="k-not-found__primary" to="/">
						Return home
					</Link>
					<a className="k-not-found__secondary" href="/#begin">
						Begin assessment
					</a>
				</div>
			</main>
			<KelsierFooter sectionHrefPrefix="/" />
		</div>
	);
}
