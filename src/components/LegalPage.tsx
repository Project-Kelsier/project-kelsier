import type { ReactNode } from "react";

type LegalPageProps = {
	title: string;
	updatedAt: string;
	children: ReactNode;
};

export function LegalPage({ children, title, updatedAt }: LegalPageProps) {
	return (
		<main className="min-h-screen bg-[radial-gradient(circle_at_10%_0%,rgba(255,107,74,0.16),transparent_32rem),linear-gradient(180deg,#fffaf6_0%,#fff5ed_100%)] p-8 text-[#1f1632]">
			<a
				className="mb-16 inline-flex font-extrabold text-[#584a72] no-underline tracking-[0.08em] uppercase"
				href="/"
			>
				Kelsier
			</a>
			<article className="mx-auto w-[min(100%,760px)]">
				<p className="mb-3 font-bold text-[#584a72] text-[0.82rem] tracking-[0.16em] uppercase">
					Legal
				</p>
				<h1 className="m-0 text-[clamp(2.5rem,7vw,5rem)] leading-[0.95]">
					{title}
				</h1>
				<p className="mt-4 mb-12 font-bold text-[#584a72] text-[0.82rem]">
					Last updated: {updatedAt}
				</p>
				{children}
			</article>
		</main>
	);
}
