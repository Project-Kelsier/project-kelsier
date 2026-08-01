import type { Ref } from "react";
import { GITHUB_REPOSITORY_URL } from "#/lib/projectLinks";
import { KelsierThemePicker } from "./KelsierThemePicker";

type KelsierHeaderProps = {
	navRef: Ref<HTMLElement>;
	sectionHrefPrefix?: "" | "/";
};

export function KelsierHeader({
	navRef,
	sectionHrefPrefix = "",
}: KelsierHeaderProps) {
	const sectionHref = (id: string) => `${sectionHrefPrefix}#${id}`;

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
						className="text-[11px] text-[var(--k-text-soft)] no-underline tracking-[0.08em] uppercase hover:text-[var(--k-text-hover)] focus-visible:text-[var(--k-text-hover)]"
						href={sectionHref("method")}
					>
						Method
					</a>
				</li>
				<li>
					<a
						className="text-[11px] text-[var(--k-text-soft)] no-underline tracking-[0.08em] uppercase hover:text-[var(--k-text-hover)] focus-visible:text-[var(--k-text-hover)]"
						href={sectionHref("teams")}
					>
						Teams
					</a>
				</li>
				<li>
					<a
						className="text-[11px] text-[var(--k-text-soft)] no-underline tracking-[0.08em] uppercase hover:text-[var(--k-text-hover)] focus-visible:text-[var(--k-text-hover)]"
						href={sectionHref("science")}
					>
						Science
					</a>
				</li>
			</ul>
			<div className="flex items-center gap-3 max-[380px]:gap-2">
				<KelsierThemePicker />
				<a
					href={GITHUB_REPOSITORY_URL}
					className="inline-flex min-h-8 items-center justify-center px-1 text-[11px] text-[var(--k-text-soft)] tracking-[0.08em] uppercase no-underline hover:text-[var(--k-text-hover)] focus-visible:text-[var(--k-text-hover)] max-lg:hidden"
					rel="noreferrer"
					target="_blank"
				>
					GitHub
				</a>
				<a
					href={sectionHref("begin")}
					className="k-nav-cta inline-flex items-center justify-center rounded-3xl border border-[var(--k-accent-dim)] px-[18px] py-[7px] text-xs text-[var(--k-accent)] tracking-[0.05em] no-underline hover:border-[var(--k-accent-medium)] hover:bg-[var(--k-accent-glow)] focus-visible:border-[var(--k-accent-medium)] focus-visible:bg-[var(--k-accent-glow)] max-[420px]:hidden"
				>
					Begin
				</a>
			</div>
		</nav>
	);
}
