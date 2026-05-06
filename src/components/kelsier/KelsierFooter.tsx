const FOOTER_LINK_GROUPS = [
	{
		title: "Product",
		links: [
			{ label: "Method", href: "#method" },
			{ label: "Teams", href: "#teams" },
			{ label: "Science", href: "#science" },
			{ label: "Begin", href: "#begin" },
		],
	},
	{
		title: "Company",
		links: [
			{ label: "About", href: "#hero" },
			{ label: "Contact", href: "mailto:hello@kelsier.example" },
		],
	},
	{
		title: "Legal",
		links: [
			{ label: "Privacy", href: "/privacy" },
			{ label: "Terms", href: "/terms" },
		],
	},
] as const;

export function KelsierFooter() {
	const copyrightYear = new Date().getFullYear();

	return (
		<footer className="k-footer mx-auto grid max-w-[1000px] grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)] gap-12 border-[var(--k-border)] border-t px-[60px] pt-14 pb-12 text-[var(--k-text-muted)] max-md:grid-cols-1 max-md:gap-8 max-md:px-6 max-md:pt-11 max-md:pb-10">
			<div className="max-w-[340px]">
				<a
					href="#hero"
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
									<a
										className="text-[13px] text-[var(--k-text-soft)] no-underline transition-colors duration-200 hover:text-[rgba(220,200,160,0.88)] focus-visible:text-[rgba(220,200,160,0.88)]"
										href={link.href}
									>
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</div>
				))}
			</nav>
			<p className="col-span-full m-0 pt-2 text-[13px] text-[var(--k-text-soft)] leading-[1.7]">
				&copy; <span suppressHydrationWarning>{copyrightYear}</span> Kelsier.
				All rights reserved.
			</p>
		</footer>
	);
}
