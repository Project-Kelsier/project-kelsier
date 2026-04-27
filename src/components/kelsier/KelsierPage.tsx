import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	clamp,
	ease,
	useKelsierScrollAnimation,
	usePrefersReducedMotion,
} from "./useKelsierScrollAnimation";
import { InsightBarsVisual, RadarVisual, TeamMapVisual } from "./Visuals";

type QuestionOption = {
	id: string;
	label: string;
};

type Question = {
	id: string;
	prompt: string;
	options: QuestionOption[];
};

const WORDS = [
	{ id: "the", text: "The", ember: false },
	{ id: "mist", text: "mist", ember: true },
	{ id: "does", text: "does", ember: false },
	{ id: "not", text: "not", ember: false },
	{ id: "hide", text: "hide", ember: true },
	{ id: "what-1", text: "what", ember: false },
	{ id: "is", text: "is", ember: false },
	{ id: "there-1", text: "there.", ember: false },
	{ id: "line-break", text: "\n", ember: false },
	{ id: "it", text: "It", ember: false },
	{ id: "reveals", text: "reveals", ember: false },
	{ id: "what-2", text: "what", ember: false },
	{ id: "was", text: "was", ember: false },
	{ id: "always", text: "always", ember: true },
	{ id: "there-2", text: "there.", ember: false },
] as const;

const FEATURES = [
	{
		eyebrow: "Layer one",
		title: (
			<>
				Individual <em>personality</em> profile
			</>
		),
		body: "12 behavioural dimensions mapped from a 340-point cold start. No self-reported bias. Scenario framing forces revealed preference.",
		visual: <RadarVisual />,
		reverse: false,
	},
	{
		eyebrow: "Layer two",
		title: (
			<>
				Team <em>dynamic</em> mapping
			</>
		),
		body: "How individual profiles interact. Tension surfaces, complementary pairs, and communication gaps made legible before they become problems.",
		visual: <TeamMapVisual />,
		reverse: true,
	},
	{
		eyebrow: "Layer three",
		title: (
			<>
				Predictive <em>insight</em> engine
			</>
		),
		body: "AI analysis turns static profiles into live intelligence. Flags emerging friction. Surfaces collaboration opportunities before the next sprint.",
		visual: <InsightBarsVisual />,
		reverse: false,
	},
] as const;

const QUESTIONS: Question[] = [
	{
		id: "deadline-response",
		prompt: "When a deadline moves unexpectedly, you tend to…",
		options: [
			{ id: "restructure", label: "Restructure immediately" },
			{ id: "flag-team", label: "Flag it to the team" },
			{ id: "absorb", label: "Absorb and adapt" },
		],
	},
	{
		id: "conflict-style",
		prompt: "Your preferred way to resolve conflict is…",
		options: [
			{ id: "direct", label: "Direct conversation" },
			{ id: "common-ground", label: "Find common ground first" },
			{ id: "space", label: "Give space, then talk" },
		],
	},
	{
		id: "new-joiner",
		prompt: "A new team member joins mid-sprint. You…",
		options: [
			{ id: "brief", label: "Brief them fully on day one" },
			{ id: "shadow", label: "Let them shadow first" },
			{ id: "pair", label: "Pair them with the strongest collaborator" },
		],
	},
];

function getStarValue(seed: number) {
	const value = Math.sin(seed) * 10000;
	return value - Math.floor(value);
}

function StarField() {
	const stars = useMemo(
		() =>
			Array.from({ length: 60 }, (_, index) => {
				const seed = index + 1;

				return {
					id: index,
					size: `${(getStarValue(seed * 11) * 1.4 + 0.4).toFixed(4)}px`,
					top: `${(getStarValue(seed * 17) * 100).toFixed(4)}%`,
					left: `${(getStarValue(seed * 23) * 100).toFixed(4)}%`,
					opacity: (getStarValue(seed * 31) * 0.35 + 0.05).toFixed(4),
				};
			}),
		[],
	);

	return (
		<div className="k-hero-stars" aria-hidden="true">
			{stars.map((star) => (
				<div
					key={star.id}
					className="k-star"
					style={{
						width: star.size,
						height: star.size,
						top: star.top,
						left: star.left,
						opacity: star.opacity,
					}}
				/>
			))}
		</div>
	);
}

function AstroRing({ size = 320 }: { size?: number }) {
	const radius = size / 2;

	return (
		<svg
			width={size}
			height={size}
			viewBox={`0 0 ${size} ${size}`}
			className="k-ring-svg"
			aria-hidden="true"
		>
			<circle
				cx={radius}
				cy={radius}
				r={radius - 4}
				fill="none"
				stroke="#BF9248"
				strokeWidth="0.4"
				strokeDasharray="2 10"
				opacity="0.35"
			/>
			<circle
				cx={radius}
				cy={radius}
				r={radius * 0.68}
				fill="none"
				stroke="#BF9248"
				strokeWidth="0.3"
				strokeDasharray="1 14"
				opacity="0.2"
			/>
			<circle
				cx={radius}
				cy={radius}
				r={radius * 0.38}
				fill="none"
				stroke="#BF9248"
				strokeWidth="0.5"
				opacity="0.15"
			/>
			<circle cx={radius} cy={4} r="3" fill="#BF9248" opacity="0.7" />
			<circle cx={size - 4} cy={radius} r="3" fill="#BF9248" opacity="0.7" />
			<circle cx={radius} cy={size - 4} r="3" fill="#BF9248" opacity="0.3" />
			<circle cx={4} cy={radius} r="3" fill="#BF9248" opacity="0.3" />
			<line
				x1={radius}
				y1={4}
				x2={radius}
				y2={size - 4}
				stroke="#BF9248"
				strokeWidth="0.2"
				opacity="0.1"
			/>
			<line
				x1={4}
				y1={radius}
				x2={size - 4}
				y2={radius}
				stroke="#BF9248"
				strokeWidth="0.2"
				opacity="0.1"
			/>
		</svg>
	);
}

export function KelsierPage() {
	const [isHydrated, setIsHydrated] = useState(false);
	const [isAssessmentStarted, setIsAssessmentStarted] = useState(false);
	const [isAssessmentComplete, setIsAssessmentComplete] = useState(false);
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
	const [answers, setAnswers] = useState<Record<string, string>>({});

	const navRef = useRef<HTMLElement>(null);
	const starsRef = useRef<HTMLDivElement>(null);
	const heroSectionRef = useRef<HTMLElement>(null);
	const heroRingRef = useRef<HTMLDivElement>(null);
	const heroContentRef = useRef<HTMLDivElement>(null);
	const portalSectionRef = useRef<HTMLElement>(null);
	const portalContentRef = useRef<HTMLDivElement>(null);
	const portalSvgRef = useRef<SVGSVGElement>(null);
	const featureSectionRef = useRef<HTMLElement>(null);
	const featureRowRefs = useRef<(HTMLDivElement | null)[]>([]);
	const wordSectionRef = useRef<HTMLElement>(null);
	const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
	const ctaSectionRef = useRef<HTMLElement>(null);
	const ctaEyebrowRef = useRef<HTMLParagraphElement>(null);
	const ctaHeadingRef = useRef<HTMLHeadingElement>(null);
	const ctaSubRef = useRef<HTMLParagraphElement>(null);
	const ctaCardRef = useRef<HTMLDivElement>(null);
	const ctaActionRef = useRef<HTMLDivElement>(null);
	const questionHeadingRef = useRef<HTMLHeadingElement>(null);

	const prefersReducedMotion = usePrefersReducedMotion();
	const currentQuestion = QUESTIONS[currentQuestionIndex];
	const selectedOptionId = answers[currentQuestion.id];
	const answeredCount = Object.keys(answers).length;
	const progressPercent = Math.round((answeredCount / QUESTIONS.length) * 100);

	const scrollToAssessment = useCallback(() => {
		ctaSectionRef.current?.scrollIntoView({
			behavior: "smooth",
			block: "start",
		});
	}, []);

	const startAssessment = useCallback(() => {
		setIsAssessmentStarted(true);
		setIsAssessmentComplete(false);
		scrollToAssessment();
	}, [scrollToAssessment]);

	const resetAssessment = useCallback(() => {
		setAnswers({});
		setCurrentQuestionIndex(0);
		setIsAssessmentStarted(false);
		setIsAssessmentComplete(false);
		scrollToAssessment();
	}, [scrollToAssessment]);

	const onScroll = useCallback(
		(scrollY: number) => {
			if (navRef.current) {
				navRef.current.classList.toggle(
					"scrolled",
					scrollY > (prefersReducedMotion ? 16 : 40),
				);
			}

			if (prefersReducedMotion) {
				return;
			}

			const heroHeight =
				heroSectionRef.current?.offsetHeight ?? window.innerHeight;

			if (starsRef.current) {
				starsRef.current.style.transform = `translateY(${scrollY * 0.38}px)`;
			}

			if (heroContentRef.current) {
				const progress = clamp(scrollY / heroHeight, 0, 1);
				const eased = ease(progress);
				heroContentRef.current.style.opacity = String(
					clamp(1 - eased * 1.6, 0, 1),
				);
				heroContentRef.current.style.transform = `translateY(${-progress * 44}px)`;
			}

			if (heroRingRef.current) {
				const progress = clamp(scrollY / heroHeight, 0, 1);
				heroRingRef.current.style.transform = `translate(-50%, -50%) scale(${1 + progress * 2})`;
				heroRingRef.current.style.opacity = String(
					clamp(1 - progress * 1.8, 0, 1),
				);
			}

			if (
				portalSectionRef.current &&
				portalSvgRef.current &&
				portalContentRef.current
			) {
				const top = portalSectionRef.current.offsetTop;
				const height = portalSectionRef.current.offsetHeight;
				const progress = clamp((scrollY - top * 0.72) / (height * 0.7), 0, 1);
				const eased = ease(progress);
				portalSvgRef.current.style.opacity = String(eased * 0.6);
				portalSvgRef.current.style.transform = `scale(${1 + eased * 0.28})`;
				portalContentRef.current.style.opacity = String(eased);
				portalContentRef.current.style.transform = `translateY(${(1 - eased) * 22}px)`;
			}

			if (featureSectionRef.current) {
				const featureTop = featureSectionRef.current.offsetTop;
				featureRowRefs.current.forEach((row, index) => {
					if (!row) {
						return;
					}

					const rowTop = featureTop + index * 200;
					const progress = clamp((scrollY - rowTop + 340) / 240, 0, 1);
					const eased = ease(progress);
					const direction = index % 2 === 0 ? -1 : 1;
					const children = row.querySelectorAll<HTMLElement>(
						".k-feat-text, .k-feat-visual",
					);
					children.forEach((child, childIndex) => {
						child.style.opacity = String(eased);
						child.style.transform = `translateX(${(1 - eased) * direction * (childIndex === 0 ? -30 : 30)}px)`;
					});
				});
			}

			if (wordSectionRef.current && wordRefs.current.length > 0) {
				const top = wordSectionRef.current.offsetTop;
				const height = wordSectionRef.current.offsetHeight;
				const progress = clamp(
					(scrollY - top + height * 0.55) / (height * 0.85),
					0,
					1,
				);
				const total = wordRefs.current.filter(Boolean).length;
				wordRefs.current.forEach((word, index) => {
					if (!word) {
						return;
					}

					word.classList.toggle("lit", progress > index / total);
				});
			}

			if (ctaSectionRef.current) {
				const top = ctaSectionRef.current.offsetTop;
				const viewportBottom = scrollY + window.innerHeight;

				const reveal = (
					element: HTMLElement | null,
					offset: number,
					range = 280,
				) => {
					if (!element) {
						return;
					}

					const progress = clamp((viewportBottom - top - offset) / range, 0, 1);
					const eased = ease(progress);
					element.style.opacity = String(eased);
					element.style.transform = `translateY(${(1 - eased) * 14}px)`;
				};

				reveal(ctaEyebrowRef.current, 140);
				reveal(ctaHeadingRef.current, 180);
				reveal(ctaSubRef.current, 220);
				reveal(ctaCardRef.current, 320);
				reveal(ctaActionRef.current, 420);
			}
		},
		[prefersReducedMotion],
	);

	useKelsierScrollAnimation(onScroll, prefersReducedMotion);

	useEffect(() => {
		setIsHydrated(true);
	}, []);

	useEffect(() => {
		if (isAssessmentStarted && !isAssessmentComplete) {
			questionHeadingRef.current?.focus();
		}
	});

	const handleAnswer = useCallback(
		(optionId: string) => {
			setAnswers((currentAnswers) => ({
				...currentAnswers,
				[currentQuestion.id]: optionId,
			}));
		},
		[currentQuestion.id],
	);

	const handleNext = useCallback(() => {
		if (!selectedOptionId) {
			return;
		}

		if (currentQuestionIndex === QUESTIONS.length - 1) {
			setIsAssessmentComplete(true);
			return;
		}

		setCurrentQuestionIndex((index) => index + 1);
	}, [currentQuestionIndex, selectedOptionId]);

	const handleBack = useCallback(() => {
		setCurrentQuestionIndex((index) => Math.max(0, index - 1));
	}, []);

	return (
		<div className="kelsier-page" data-hydrated={isHydrated || undefined}>
			<nav
				className="k-nav"
				ref={navRef}
				aria-label="Kelsier section navigation"
			>
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

			<main>
				<section className="k-hero" ref={heroSectionRef} id="hero">
					<div ref={starsRef}>
						<StarField />
					</div>
					<div className="k-hero-ring" ref={heroRingRef}>
						<AstroRing size={340} />
					</div>
					<div className="k-hero-content" ref={heroContentRef}>
						<p className="k-eyebrow">
							<span className="k-eyebrow-line" aria-hidden="true" />
							Behavioural team intelligence
							<span className="k-eyebrow-line" aria-hidden="true" />
						</p>
						<h1 className="k-hero-h1">
							What drives your team
							<br />
							lies <em>beneath</em> the surface
						</h1>
						<p className="k-hero-h2">Kelsier reveals it</p>
						<p className="k-hero-body">
							Deep behavioural psychology applied to how teams actually work.
							Understand the hidden dynamics shaping every decision, conflict,
							and breakthrough.
						</p>
						<div className="k-hero-actions">
							<button
								type="button"
								className="k-btn-primary"
								onClick={startAssessment}
							>
								Discover your team
							</button>
							<a href="#method" className="k-btn-ghost">
								How it works <span aria-hidden="true">↓</span>
							</a>
						</div>
					</div>
					<div className="k-scroll-hint" aria-hidden="true">
						<span className="k-scroll-hint-text">Scroll</span>
						<div className="k-scroll-track">
							<div className="k-scroll-nub" />
						</div>
					</div>
				</section>

				<section className="k-portal" ref={portalSectionRef}>
					<div className="k-portal-ring">
						<svg
							ref={portalSvgRef}
							width="280"
							height="280"
							viewBox="0 0 280 280"
							className="k-portal-svg"
							aria-hidden="true"
						>
							<circle
								cx="140"
								cy="140"
								r="136"
								fill="none"
								stroke="#BF9248"
								strokeWidth="0.5"
								opacity="0.4"
							/>
							<circle
								cx="140"
								cy="140"
								r="96"
								fill="none"
								stroke="#BF9248"
								strokeWidth="0.3"
								opacity="0.25"
							/>
							<circle
								cx="140"
								cy="140"
								r="56"
								fill="none"
								stroke="#BF9248"
								strokeWidth="0.2"
								opacity="0.15"
							/>
						</svg>
					</div>
					<div className="k-portal-content" ref={portalContentRef}>
						<p className="k-portal-kicker">Three dimensions</p>
						<h2 className="k-portal-heading">
							The hidden geometry
							<br />
							of <em>every team</em>
						</h2>
					</div>
				</section>

				<section className="k-features" ref={featureSectionRef} id="method">
					{FEATURES.map((feature, index) => (
						<div
							key={feature.eyebrow}
							className={`k-feature-row${feature.reverse ? " reverse" : ""}`}
							ref={(element) => {
								featureRowRefs.current[index] = element;
							}}
						>
							<div className="k-feat-text">
								<p className="k-feat-eyebrow">{feature.eyebrow}</p>
								<h3 className="k-feat-title">{feature.title}</h3>
								<p className="k-feat-body">{feature.body}</p>
							</div>
							<div className="k-feat-visual">{feature.visual}</div>
						</div>
					))}
				</section>

				<section
					className="k-stats"
					id="teams"
					aria-label="Kelsier profile metrics"
				>
					{[
						{ num: "12", label: "Dimensions" },
						{ num: "340", label: "Data points" },
						{ num: "94%", label: "Accuracy" },
						{ num: "18 min", label: "Cold start" },
					].map(({ label, num }) => (
						<div key={label} className="k-stat">
							<span className="k-stat-num">{num}</span>
							<span className="k-stat-label">{label}</span>
						</div>
					))}
				</section>

				<section className="k-wordreveal" ref={wordSectionRef} id="science">
					<h2 className="k-wordreveal-heading">
						Behavioural insight in motion
					</h2>
					<p className="k-wordreveal-text">
						{WORDS.map((word, index) => {
							if (word.text === "\n") {
								return <br key={word.id} />;
							}

							return (
								<span key={word.id}>
									<span
										className={`k-word${word.ember ? " ember" : ""}`}
										ref={(element) => {
											wordRefs.current[index] = element;
										}}
									>
										{word.text}
									</span>{" "}
								</span>
							);
						})}
					</p>
				</section>

				<section className="k-cta" ref={ctaSectionRef} id="begin">
					<p className="k-cta-eyebrow" ref={ctaEyebrowRef}>
						Begin your cold start
					</p>
					<h2 className="k-cta-heading" ref={ctaHeadingRef}>
						18 minutes to <em>know your team</em>
					</h2>
					<p className="k-cta-sub" ref={ctaSubRef}>
						One scenario-based questionnaire. Zero self-report bias. Your
						team&apos;s hidden profile, surfaced.
					</p>

					<div className="k-q-progress" aria-live="polite">
						<span>
							{isAssessmentComplete
								? "Prototype complete"
								: "Assessment prototype"}
						</span>
						<span>{progressPercent}% answered</span>
					</div>

					{!isAssessmentStarted ? (
						<div className="k-q-card k-q-card--intro" ref={ctaCardRef}>
							<h3 className="k-q-title">Start the behavioural cold start</h3>
							<p className="k-q-text">
								Answer three scenario-based questions to preview how the Kelsier
								flow will feel. This prototype does not save data or generate
								live results yet.
							</p>
							<div className="k-cta-action" ref={ctaActionRef}>
								<button
									type="button"
									className="k-btn-primary"
									onClick={startAssessment}
								>
									Start assessment
								</button>
							</div>
						</div>
					) : isAssessmentComplete ? (
						<div className="k-q-card k-q-card--complete" ref={ctaCardRef}>
							<h3 className="k-q-title" tabIndex={-1} ref={questionHeadingRef}>
								Prototype complete
							</h3>
							<p className="k-q-text">
								You&apos;ve completed the front-end prototype flow. Next we can
								turn this into a full assessment experience with saved answers,
								team invites, and generated insight output.
							</p>
							<ul
								className="k-q-summary"
								aria-label="Answered prototype questions"
							>
								{QUESTIONS.map((question) => {
									const selectedOption = question.options.find(
										(option) => option.id === answers[question.id],
									);
									return (
										<li key={question.id}>
											<span>{question.prompt}</span>
											<strong>{selectedOption?.label ?? "Not answered"}</strong>
										</li>
									);
								})}
							</ul>
							<div className="k-q-actions" ref={ctaActionRef}>
								<button
									type="button"
									className="k-btn-primary"
									onClick={resetAssessment}
								>
									Restart prototype
								</button>
							</div>
						</div>
					) : (
						<div className="k-q-card" ref={ctaCardRef}>
							<div className="k-q-step">
								<span>
									Question {currentQuestionIndex + 1} of {QUESTIONS.length}
								</span>
								<span>{answeredCount} answered</span>
							</div>
							<h3 className="k-q-title" tabIndex={-1} ref={questionHeadingRef}>
								{currentQuestion.prompt}
							</h3>
							<fieldset
								className="k-q-opts"
								aria-label={currentQuestion.prompt}
							>
								{currentQuestion.options.map((option) => {
									const isSelected = selectedOptionId === option.id;
									return (
										<button
											key={option.id}
											type="button"
											className={`k-q-opt${isSelected ? " selected" : ""}`}
											aria-pressed={isSelected}
											onClick={() => {
												handleAnswer(option.id);
											}}
										>
											{option.label}
										</button>
									);
								})}
							</fieldset>
							<div className="k-q-actions" ref={ctaActionRef}>
								<button
									type="button"
									className="k-btn-secondary"
									onClick={handleBack}
									disabled={currentQuestionIndex === 0}
								>
									Back
								</button>
								<button
									type="button"
									className="k-btn-primary"
									onClick={handleNext}
									disabled={!selectedOptionId}
								>
									{currentQuestionIndex === QUESTIONS.length - 1
										? "Complete prototype"
										: "Next question"}
								</button>
							</div>
						</div>
					)}
				</section>
			</main>
		</div>
	);
}
