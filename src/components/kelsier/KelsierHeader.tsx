import type { Ref } from "react";
import { GITHUB_REPOSITORY_URL } from "#/lib/projectLinks";

type KelsierHeaderProps = {
	navRef: Ref<HTMLElement>;
};

export function KelsierHeader({ navRef }: KelsierHeaderProps) {
	return (
		<nav
			className="k-nav fixed inset-x-0 top-0 z-[100] flex items-center justify-between border-transparent border-b px-10 py-5 transition-[background,border-color,box-shadow] duration-[400ms] ease-in-out max-md:px-5 max-md:py-4"
			ref={navRef}
			aria-label="Kelsier section navigation"
		>
			<div className="k-nav-logo font-normal text-xl tracking-[0.04em]">
				Kel<span>sier</span>
			</div>
			<ul className="k-nav-links m-0 flex list-none gap-8 p-0 max-md:hidden">
				<li>
					<a
						className="text-[11px] text-[var(--k-text-soft)] no-underline tracking-[0.08em] uppercase hover:text-[rgba(220,200,160,0.85)] focus-visible:text-[rgba(220,200,160,0.85)]"
						href="#method"
					>
						Method
					</a>
				</li>
				<li>
					<a
						className="text-[11px] text-[var(--k-text-soft)] no-underline tracking-[0.08em] uppercase hover:text-[rgba(220,200,160,0.85)] focus-visible:text-[rgba(220,200,160,0.85)]"
						href="#teams"
					>
						Teams
					</a>
				</li>
				<li>
					<a
						className="text-[11px] text-[var(--k-text-soft)] no-underline tracking-[0.08em] uppercase hover:text-[rgba(220,200,160,0.85)] focus-visible:text-[rgba(220,200,160,0.85)]"
						href="#science"
					>
						Science
					</a>
				</li>
			</ul>
			<div className="flex items-center gap-3 max-[380px]:gap-2">
				<a
					href={GITHUB_REPOSITORY_URL}
					className="inline-flex min-h-8 items-center justify-center px-1 text-[11px] text-[var(--k-text-soft)] tracking-[0.08em] uppercase no-underline hover:text-[rgba(220,200,160,0.85)] focus-visible:text-[rgba(220,200,160,0.85)]"
					rel="noreferrer"
					target="_blank"
				>
					GitHub
				</a>
				<a
					href="#begin"
					className="k-nav-cta inline-flex items-center justify-center rounded-3xl border border-[var(--k-ember-dim)] px-[18px] py-[7px] text-xs text-[var(--k-ember)] tracking-[0.05em] no-underline hover:border-[rgba(191,146,72,0.6)] hover:bg-[var(--k-ember-glow)] focus-visible:border-[rgba(191,146,72,0.6)] focus-visible:bg-[var(--k-ember-glow)] max-[380px]:px-3"
				>
					Begin
				</a>
			</div>
		</nav>
	);
}
