import { Link } from "@tanstack/react-router";

export default function Header() {
	return (
		<header className="site-header px-4">
			<nav className="page-wrap flex items-center justify-between py-5">
				<Link to="/" className="brand-mark">
					<span className="brand-mark__orb" aria-hidden="true" />
					Nova Atelier
				</Link>

				<div className="flex items-center gap-3">
					<a href="#capabilities" className="top-link">
						Capabilities
					</a>
					<a href="#process" className="top-link">
						Process
					</a>
					<a href="#contact" className="cta-pill">
						Start a Project
					</a>
				</div>
			</nav>
		</header>
	);
}
