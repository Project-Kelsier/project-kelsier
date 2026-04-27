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
			{ label: "Privacy", href: "#privacy" },
			{ label: "Terms", href: "#terms" },
		],
	},
] as const;

export function KelsierFooter() {
	return (
		<footer className="k-footer">
			<div className="k-footer-brand">
				<a href="#hero" className="k-footer-logo">
					Kel<span>sier</span>
				</a>
				<p>
					Behavioural team intelligence for clearer decisions, healthier
					conflict, and better collaboration.
				</p>
			</div>
			<nav className="k-footer-links" aria-label="Footer navigation">
				{FOOTER_LINK_GROUPS.map((group) => (
					<div key={group.title} className="k-footer-group">
						<h2>{group.title}</h2>
						<ul>
							{group.links.map((link) => (
								<li key={link.label}>
									<a href={link.href}>{link.label}</a>
								</li>
							))}
						</ul>
					</div>
				))}
			</nav>
			<p className="k-footer-fineprint">
				&copy; 2026 Kelsier. All rights reserved.
			</p>
		</footer>
	);
}
