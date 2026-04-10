import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: App });

function App() {
	return (
		<main>
			<section className="hero-shell px-4 pb-16 pt-10 sm:pb-24 sm:pt-14">
				<div className="page-wrap hero-grid">
					<div className="hero-copy rise-in">
						<p className="eyebrow">Launch concept</p>
						<h1 className="hero-title">
							Design-led digital launches with a sharper point of view.
						</h1>
						<p className="hero-text">
							Nova Atelier is a placeholder studio brand for first-release work:
							bold messaging, conversion-focused landing pages, and polished
							presentation systems that help new products feel ready on day one.
						</p>
						<div className="hero-actions">
							<a href="#contact" className="cta-pill">
								Book Discovery
							</a>
							<a href="#process" className="secondary-link">
								See how we build
							</a>
						</div>
						<ul className="hero-facts" aria-label="Studio highlights">
							<li>Landing page strategy</li>
							<li>Brand-forward motion direction</li>
							<li>Launch-ready UI systems</li>
						</ul>
					</div>

					<div className="hero-card rise-in" style={{ animationDelay: "120ms" }}>
						<div className="hero-card__panel">
							<p className="eyebrow">Current focus</p>
							<h2>Hero-first experiences that do the hard selling above the fold.</h2>
							<p>
								This first feature pass sets up a premium landing canvas with clear
								CTAs, reusable section patterns, and space for your real product
								story once it is ready.
							</p>
						</div>
						<div className="hero-metrics">
							<div>
								<span>01</span>
								<p>Sharper positioning and visual hierarchy for a memorable first impression.</p>
							</div>
							<div>
								<span>02</span>
								<p>Flexible content blocks that can expand into a full marketing site later.</p>
							</div>
							<div>
								<span>03</span>
								<p>Clean route structure with the starter scaffold removed from the experience.</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section id="capabilities" className="px-4 pb-6">
				<div className="page-wrap">
					<div className="section-heading">
						<p className="eyebrow">Capabilities</p>
						<h2>Three building blocks for a confident launch page.</h2>
					</div>

					<div className="feature-grid">
						{[
							[
								"Message architecture",
								"Clarify the headline, supporting story, and CTA path before design gets precious.",
							],
							[
								"Visual atmosphere",
								"Create a branded look with typography, gradients, texture, and motion that feels deliberate.",
							],
							[
								"Flexible sections",
								"Build reusable feature, proof, and CTA modules so the page can grow without rework.",
							],
						].map(([title, description], index) => (
							<article
								key={title}
								className="feature-panel rise-in"
								style={{ animationDelay: `${index * 90 + 180}ms` }}
							>
								<h3>{title}</h3>
								<p>{description}</p>
							</article>
						))}
					</div>
				</div>
			</section>

			<section id="process" className="px-4 py-12 sm:py-16">
				<div className="page-wrap process-shell rise-in" style={{ animationDelay: "240ms" }}>
					<div className="section-heading">
						<p className="eyebrow">Process</p>
						<h2>A simple first-feature path with room to scale.</h2>
					</div>

					<div className="process-steps">
						<div>
							<span>Discover</span>
							<p>Define the narrative and the one action the page should drive.</p>
						</div>
						<div>
							<span>Compose</span>
							<p>Shape the hero, proof sections, and CTA rhythm into a cohesive story.</p>
						</div>
						<div>
							<span>Refine</span>
							<p>Swap in your real copy, imagery, and links without rebuilding the layout.</p>
						</div>
					</div>
				</div>
			</section>

			<section id="contact" className="px-4 pb-20 sm:pb-24">
				<div className="page-wrap contact-panel rise-in" style={{ animationDelay: "320ms" }}>
					<div>
						<p className="eyebrow">Next step</p>
						<h2>Ready to turn placeholder structure into your actual launch story?</h2>
					</div>
					<a href="mailto:hello@novaatelier.example" className="cta-pill">
						hello@novaatelier.example
					</a>
				</div>
			</section>
		</main>
	);
}
