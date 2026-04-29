import type { ReactNode } from "react";

type LegalPageProps = {
	title: string;
	updatedAt: string;
	children: ReactNode;
};

export function LegalPage({ children, title, updatedAt }: LegalPageProps) {
	return (
		<main className="legal-page">
			<a className="legal-page__home" href="/">
				Kelsier
			</a>
			<article className="legal-page__content">
				<p className="legal-page__eyebrow">Legal</p>
				<h1>{title}</h1>
				<p className="legal-page__updated">Last updated: {updatedAt}</p>
				{children}
			</article>
		</main>
	);
}
