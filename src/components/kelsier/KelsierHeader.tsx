import type { RefObject } from "react";

type KelsierHeaderProps = {
	navRef: RefObject<HTMLElement | null>;
};

export function KelsierHeader({ navRef }: KelsierHeaderProps) {
	return (
		<nav className="k-nav" ref={navRef} aria-label="Kelsier section navigation">
			<div className="k-nav-logo">
				Kel<span>sier</span>
			</div>
			<ul className="k-nav-links">
				<li>
					<a href="#method">Method</a>
				</li>
				<li>
					<a href="#teams">Teams</a>
				</li>
				<li>
					<a href="#science">Science</a>
				</li>
			</ul>
			<a href="#begin" className="k-nav-cta">
				Begin
			</a>
		</nav>
	);
}
