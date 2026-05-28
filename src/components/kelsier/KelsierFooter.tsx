import { Link } from "@tanstack/react-router";
import { GITHUB_REPOSITORY_URL } from "#/lib/projectLinks";
import { APP_VERSION } from "#/lib/version";

type FooterRouteHref = "/privacy" | "/terms";
type FooterLink =
	| {
			label: string;
			href: FooterRouteHref;
			type: "route";
	  }
	| {
			label: string;
			href: string;
			type: "anchor";
			isExternal?: boolean;
	  };

const FOOTER_LINK_GROUPS: Array<{
	title: string;
	links: FooterLink[];
}> = [
	{
		title: "Product",
		links: [
			{ label: "Method", href: "#method", type: "anchor" },
			{ label: "Teams", href: "#teams", type: "anchor" },
			{ label: "Science", href: "#science", type: "anchor" },
			{ label: "Begin", href: "#begin", type: "anchor" },
		],
	},
	{
		title: "Company",
		links: [
			{ label: "About", href: "#hero", type: "anchor" },
			{
				label: "GitHub",
				href: GITHUB_REPOSITORY_URL,
				type: "anchor",
				isExternal: true,
			},
			{
				label: "Contact",
				href: "mailto:hello@kelsier.example",
				type: "anchor",
			},
		],
	},
	{
		title: "Legal",
		links: [
			{ label: "Privacy", href: "/privacy", type: "route" },
			{ label: "Terms", href: "/terms", type: "route" },
		],
	},
];

type KelsierFooterProps = {
	sectionHrefPrefix?: "" | "/";
};

export function KelsierFooter({
	sectionHrefPrefix = "",
}: KelsierFooterProps = {}) {
	const copyrightYear = new Date().getFullYear();
	const sectionHref = (href: string) =>
		href.startsWith("#") ? `${sectionHrefPrefix}${href}` : href;

	return (
		<footer className="k-footer mx-auto grid max-w-[1000px] grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] gap-12 border-[var(--k-border)] border-t px-[60px] pt-14 pb-12 text-[var(--k-text-muted)] max-md:grid-cols-1 max-md:gap-8 max-md:px-6 max-md:pt-11 max-md:pb-10">
			<div className="max-w-[340px]">
				<a
					href={sectionHref("#hero")}
					className="k-footer-logo mb-[18px] inline-flex text-[var(--k-text)] text-2xl tracking-[0.04em] no-underline hover:text-[rgba(220,200,160,0.88)] focus-visible:text-[rgba(220,200,160,0.88)]"
				>
					Kel<span>sier</span>
				</a>
				<p className="m-0 text-[13px] leading-[1.7]">
					Behavioural team intelligence for clearer decisions, healthier
					conflict, and better collaboration.
				</p>
			</div>
			<nav
				className="grid grid-cols-3 gap-7 max-md:grid-cols-1 max-md:gap-6"
				aria-label="Footer navigation"
			>
				{FOOTER_LINK_GROUPS.map((group) => (
					<div key={group.title} className="k-footer-group">
						<h2 className="mt-0 mb-3.5 font-[var(--font-mono-k)] font-normal text-[10px] text-[var(--k-ember)] tracking-[0.12em] uppercase">
							{group.title}
						</h2>
						<ul className="m-0 flex list-none flex-col gap-2.5 p-0">
							{group.links.map((link) => (
								<li key={link.label}>
									{link.type === "route" ? (
										<Link
											className="text-[13px] text-[var(--k-text-soft)] no-underline transition-colors duration-200 hover:text-[rgba(220,200,160,0.88)] focus-visible:text-[rgba(220,200,160,0.88)]"
											to={link.href}
										>
											{link.label}
										</Link>
									) : (
										<a
											className="text-[13px] text-[var(--k-text-soft)] no-underline transition-colors duration-200 hover:text-[rgba(220,200,160,0.88)] focus-visible:text-[rgba(220,200,160,0.88)]"
											href={sectionHref(link.href)}
											rel={link.isExternal ? "noreferrer" : undefined}
											target={link.isExternal ? "_blank" : undefined}
										>
											{link.label}
										</a>
									)}
								</li>
							))}
						</ul>
					</div>
				))}
			</nav>
			<p className="col-span-full m-0 pt-2 text-[13px] text-[var(--k-text-soft)] leading-[1.7]">
				&copy; <span suppressHydrationWarning>{copyrightYear}</span> Kelsier.
				All rights reserved. v{APP_VERSION}. Open source on{" "}
				<a
					className="text-[var(--k-text-soft)] underline decoration-[rgba(191,146,72,0.45)] underline-offset-4 transition-colors duration-200 hover:text-[rgba(220,200,160,0.88)] focus-visible:text-[rgba(220,200,160,0.88)]"
					href={GITHUB_REPOSITORY_URL}
					rel="noreferrer"
					target="_blank"
				>
					GitHub
				</a>
				.
			</p>
		</footer>
	);
}
