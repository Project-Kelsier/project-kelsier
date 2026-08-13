import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GITHUB_REPOSITORY_URL } from "#/lib/projectLinks";
import { KelsierPage as KelsierPageComponent } from "./KelsierPage";
import {
	assessmentPersistenceActionsFixture,
	assessmentQuestionnaireFixture,
} from "./KelsierPage.fixture";

function KelsierPage() {
	return (
		<KelsierPageComponent
			questionnaire={assessmentQuestionnaireFixture}
			persistenceActions={assessmentPersistenceActionsFixture}
		/>
	);
}

vi.mock("@tanstack/react-router", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("@tanstack/react-router")>();

	return {
		...actual,
		Link: ({
			children,
			to,
			...props
		}: AnchorHTMLAttributes<HTMLAnchorElement> & {
			children: ReactNode;
			to: string;
		}) => (
			<a href={to} {...props}>
				{children}
			</a>
		),
	};
});

describe("KelsierPage", () => {
	const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
	const originalRequestAnimationFrame = window.requestAnimationFrame;
	const originalCancelAnimationFrame = window.cancelAnimationFrame;
	const originalMatchMedia = window.matchMedia;
	const originalScrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
	const originalInnerHeight = Object.getOwnPropertyDescriptor(
		window,
		"innerHeight",
	);

	beforeEach(() => {
		window.localStorage.clear();
		delete document.documentElement.dataset.kelsierTheme;
		HTMLElement.prototype.scrollIntoView = vi.fn();
		window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
			callback(0);
			return 1;
		});
		window.cancelAnimationFrame = vi.fn();
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));
	});

	afterEach(() => {
		HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
		window.requestAnimationFrame = originalRequestAnimationFrame;
		window.cancelAnimationFrame = originalCancelAnimationFrame;
		window.matchMedia = originalMatchMedia;

		if (originalScrollY) {
			Object.defineProperty(window, "scrollY", originalScrollY);
		}

		if (originalInnerHeight) {
			Object.defineProperty(window, "innerHeight", originalInnerHeight);
		}

		vi.restoreAllMocks();
	});

	it("renders the Kelsier hero content", () => {
		render(<KelsierPage />);

		expect(
			screen.getByRole("heading", {
				name: /What drives your team.*beneath the surface/,
			}),
		).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Discover your team" }),
		).toBeTruthy();
		const githubLinks = screen.getAllByRole("link", { name: "GitHub" });
		expect(githubLinks[0]?.getAttribute("href")).toBe(GITHUB_REPOSITORY_URL);
		expect(githubLinks[0]?.getAttribute("target")).toBe("_blank");
	});

	it("switches and remembers the selected color theme", () => {
		const { unmount } = render(<KelsierPage />);
		const themePicker = screen.getByRole("combobox", { name: "Color theme" });

		fireEvent.change(themePicker, { target: { value: "phthalo" } });

		expect(document.documentElement.dataset.kelsierTheme).toBe("phthalo");
		expect(window.localStorage.getItem("kelsier-color-theme")).toBe("phthalo");

		unmount();
		delete document.documentElement.dataset.kelsierTheme;
		render(<KelsierPage />);

		expect(document.documentElement.dataset.kelsierTheme).toBe("phthalo");
		expect(
			screen.getByRole("combobox", { name: "Color theme" }),
		).toHaveProperty("value", "phthalo");
	});

	it("uses Volt Lime when no theme has been saved", () => {
		render(<KelsierPage />);

		expect(document.documentElement.dataset.kelsierTheme).toBe("volt");
		expect(window.localStorage.getItem("kelsier-color-theme")).toBe("volt");
		expect(
			screen.getByRole("combobox", { name: "Color theme" }),
		).toHaveProperty("value", "volt");
	});

	it("ignores unsupported theme values", () => {
		render(<KelsierPage />);

		fireEvent.change(screen.getByRole("combobox", { name: "Color theme" }), {
			target: { value: "unsupported" },
		});

		expect(document.documentElement.dataset.kelsierTheme).toBe("volt");
		expect(window.localStorage.getItem("kelsier-color-theme")).toBe("volt");
	});

	it("keeps lightweight scroll state active for reduced-motion users", async () => {
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: query === "(prefers-reduced-motion: reduce)",
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));

		render(<KelsierPage />);

		const nav = screen.getByRole("navigation", {
			name: "Kelsier section navigation",
		});

		Object.defineProperty(window, "scrollY", {
			configurable: true,
			value: 24,
		});
		fireEvent.scroll(window);

		await waitFor(() => {
			expect(nav.classList.contains("scrolled")).toBe(true);
		});
	});

	it("supports legacy reduced-motion media query listeners", () => {
		const addListener = vi.fn();
		const removeListener = vi.fn();
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: query === "(prefers-reduced-motion: reduce)",
			media: query,
			onchange: null,
			addListener,
			removeListener,
			dispatchEvent: vi.fn(),
		}));

		const { unmount } = render(<KelsierPage />);

		expect(addListener).toHaveBeenCalledOnce();

		unmount();

		expect(removeListener).toHaveBeenCalledOnce();
	});

	it("does not smooth scroll assessment controls for reduced-motion users", async () => {
		window.matchMedia = vi.fn().mockImplementation((query: string) => ({
			matches: query === "(prefers-reduced-motion: reduce)",
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}));

		render(<KelsierPage />);

		fireEvent.click(
			screen.getByRole("button", { name: "Start and save progress" }),
		);

		await waitFor(() => {
			expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
				behavior: "auto",
				block: "start",
			});
		});
	});

	it("starts the scroll reveal when the word section enters the viewport", async () => {
		render(<KelsierPage />);

		const wordHeading = screen.getByRole("heading", {
			name: "Behavioural insight in motion",
		});
		const wordSection = wordHeading.closest("section");
		expect(wordSection).toBeTruthy();

		Object.defineProperty(wordSection, "offsetTop", {
			configurable: true,
			value: 200,
		});
		Object.defineProperty(window, "innerHeight", {
			configurable: true,
			value: 100,
		});
		Object.defineProperty(window, "scrollY", {
			configurable: true,
			value: 100,
		});

		fireEvent.scroll(window);

		const firstWord = screen.getByText("The");
		const finalWord = screen.getAllByText("there.").at(-1);

		await waitFor(() => {
			expect(firstWord.classList.contains("lit")).toBe(true);
			expect(finalWord?.classList.contains("lit")).toBe(false);
		});

		Object.defineProperty(window, "scrollY", {
			configurable: true,
			value: 165,
		});
		fireEvent.scroll(window);

		await waitFor(() => {
			expect(finalWord?.classList.contains("lit")).toBe(true);
		});
	});

	it("renders standard footer navigation links", () => {
		render(<KelsierPage />);

		expect(
			screen.getByRole("navigation", { name: "Footer navigation" }),
		).toBeTruthy();
		expect(
			screen.getByRole("link", { name: "Privacy" }).getAttribute("href"),
		).toBe("/privacy");
		expect(
			screen.getByRole("link", { name: "Terms" }).getAttribute("href"),
		).toBe("/terms");
		expect(
			screen.getByRole("link", { name: "Contact" }).getAttribute("href"),
		).toBe("mailto:hello@kelsier.example");
		const githubLinks = screen.getAllByRole("link", { name: "GitHub" });
		expect(githubLinks).toHaveLength(3);
		expect(
			githubLinks.every(
				(link) =>
					link.getAttribute("href") === GITHUB_REPOSITORY_URL &&
					link.getAttribute("target") === "_blank",
			),
		).toBe(true);
		expect(screen.getByRole("contentinfo").textContent).toContain(
			`${new Date().getFullYear()} Kelsier. All rights reserved.`,
		);
		expect(screen.getByRole("contentinfo").textContent).toContain(
			"Open source on GitHub.",
		);
	});

	it("starts and progresses through the questionnaire", async () => {
		render(<KelsierPage />);

		fireEvent.click(
			screen.getByRole("button", { name: "Start and save progress" }),
		);
		await screen.findByRole("radio", { name: "Restructure immediately" });
		fireEvent.click(
			screen.getByRole("radio", { name: "Restructure immediately" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Next question" }));

		expect(
			await screen.findByRole("heading", {
				name: "Your preferred way to resolve conflict is…",
			}),
		).toBeTruthy();
	});

	it("keeps questionnaire progression disabled until an option is selected", async () => {
		render(<KelsierPage />);

		fireEvent.click(
			screen.getByRole("button", { name: "Start and save progress" }),
		);
		await screen.findByRole("group", {
			name: "When a deadline moves unexpectedly, you tend to…",
		});

		expect(
			screen.getByRole("group", {
				name: "When a deadline moves unexpectedly, you tend to…",
			}),
		).toBeTruthy();

		const nextButton = screen.getByRole("button", { name: "Next question" });

		expect(nextButton).toHaveProperty("disabled", true);

		const restructureOption = screen.getByRole("radio", {
			name: "Restructure immediately",
		});

		expect(restructureOption).toHaveProperty("checked", false);

		fireEvent.click(restructureOption);

		expect(restructureOption).toHaveProperty("checked", true);
		expect(nextButton).toHaveProperty("disabled", false);
	});

	it("allows an optional question to be skipped", async () => {
		const optionalQuestionnaire = {
			...assessmentQuestionnaireFixture,
			questions: [
				{
					...assessmentQuestionnaireFixture.questions[0],
					required: false,
				},
			],
		};

		render(
			<KelsierPageComponent
				questionnaire={optionalQuestionnaire}
				persistenceActions={{
					...assessmentPersistenceActionsFixture,
					completeAttempt: async () => ({
						attemptId: "10000000-0000-4000-8000-000000000001",
						completedAt: "2026-08-13T12:00:00.000Z",
						scoringAlgorithmVersion: "dimension-mean-v1",
						confidence: null,
						rows: [
							{
								dimension: "adaptability",
								label: "Adaptability",
								score: null,
								contributingQuestionCount: 0,
							},
						],
					}),
				}}
			/>,
		);
		fireEvent.click(
			screen.getByRole("button", { name: "Start and save progress" }),
		);
		await screen.findByText(/Question 1 of 1 · Optional/);

		expect(screen.getByText(/Question 1 of 1 · Optional/)).toBeTruthy();
		const completeButton = screen.getByRole("button", {
			name: "Complete prototype",
		});
		expect(completeButton).toHaveProperty("disabled", false);

		fireEvent.click(completeButton);

		expect(await screen.findByText("No response")).toBeTruthy();
		expect(screen.getByText("0")).toBeTruthy();
	});

	it("keeps an in-progress questionnaire when the hero call to action is clicked", async () => {
		render(<KelsierPage />);

		fireEvent.click(
			screen.getByRole("button", { name: "Start and save progress" }),
		);
		await screen.findByRole("radio", { name: "Restructure immediately" });
		fireEvent.click(
			screen.getByRole("radio", { name: "Restructure immediately" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Next question" }));
		await screen.findByRole("heading", {
			name: "Your preferred way to resolve conflict is…",
		});
		fireEvent.click(screen.getByRole("button", { name: "Discover your team" }));

		expect(
			screen.getByRole("heading", {
				name: "Your preferred way to resolve conflict is…",
			}),
		).toBeTruthy();
		expect(screen.getByText("33% answered")).toBeTruthy();
	});

	it("shows and focuses the completion state after the last question", async () => {
		render(<KelsierPage />);

		fireEvent.click(
			screen.getByRole("button", { name: "Start and save progress" }),
		);
		await screen.findByRole("radio", { name: "Restructure immediately" });
		fireEvent.click(
			screen.getByRole("radio", { name: "Restructure immediately" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Next question" }));
		await screen.findByRole("radio", { name: "Find common ground first" });
		fireEvent.click(
			screen.getByRole("radio", { name: "Find common ground first" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Next question" }));
		await screen.findByRole("radio", {
			name: "Pair them with the strongest collaborator",
		});
		fireEvent.click(
			screen.getByRole("radio", {
				name: "Pair them with the strongest collaborator",
			}),
		);
		fireEvent.click(screen.getByRole("button", { name: "Complete prototype" }));

		expect(
			await screen.findByRole("heading", { name: "Demonstration result" }),
		).toBeTruthy();
		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: "Demonstration result" }),
			).toBe(document.activeElement);
		});
	});

	it("returns to the questionnaire when the hero call to action is clicked after completion", async () => {
		render(<KelsierPage />);

		fireEvent.click(
			screen.getByRole("button", { name: "Start and save progress" }),
		);
		await screen.findByRole("radio", { name: "Restructure immediately" });
		fireEvent.click(
			screen.getByRole("radio", { name: "Restructure immediately" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Next question" }));
		await screen.findByRole("radio", { name: "Find common ground first" });
		fireEvent.click(
			screen.getByRole("radio", { name: "Find common ground first" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Next question" }));
		await screen.findByRole("radio", {
			name: "Pair them with the strongest collaborator",
		});
		fireEvent.click(
			screen.getByRole("radio", {
				name: "Pair them with the strongest collaborator",
			}),
		);
		fireEvent.click(screen.getByRole("button", { name: "Complete prototype" }));

		expect(
			await screen.findByRole("heading", { name: "Demonstration result" }),
		).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Discover your team" }));

		expect(
			screen.getByRole("heading", {
				name: "Demonstration result",
			}),
		).toBeTruthy();
	});

	it("offers explicit advice before consuming the single resume", async () => {
		const resumeAttempt = vi
			.fn()
			.mockImplementation((_attemptId: string, continuationToken: string) =>
				Promise.resolve({
					attemptId: "10000000-0000-4000-8000-000000000001",
					expiresAt: "2026-08-18T00:00:00.000Z",
					continuationToken,
					currentQuestionIndex: 1,
					answers: { "deadline-response": "restructure" },
				}),
			);

		render(
			<KelsierPageComponent
				questionnaire={assessmentQuestionnaireFixture}
				initialGuestAssessmentEntry={{
					attemptId: "10000000-0000-4000-8000-000000000001",
					startedAt: "2026-08-11T00:00:00.000Z",
					expiresAt: "2026-08-18T00:00:00.000Z",
					answeredCount: 1,
					answersComplete: false,
					resumeAvailable: true,
				}}
				persistenceActions={{
					...assessmentPersistenceActionsFixture,
					resumeAttempt,
				}}
			/>,
		);

		expect(screen.getByText(/mood, circumstances, or context/)).toBeTruthy();
		fireEvent.click(
			screen.getByRole("button", { name: "Continue this snapshot" }),
		);

		expect(
			await screen.findByRole("heading", {
				name: "Your preferred way to resolve conflict is…",
			}),
		).toBeTruthy();
		expect(resumeAttempt).toHaveBeenCalledOnce();
		expect(screen.getAllByText(/This is its single resume/)).toHaveLength(2);
	});

	it("restores a submitted response as complete without offering a resume", () => {
		render(
			<KelsierPageComponent
				questionnaire={assessmentQuestionnaireFixture}
				initialGuestAssessmentEntry={{
					attemptId: "10000000-0000-4000-8000-000000000001",
					startedAt: "2026-08-11T00:00:00.000Z",
					expiresAt: "2026-08-18T00:00:00.000Z",
					answeredCount: 3,
					answersComplete: true,
					answers: {
						"deadline-response": "restructure",
						"conflict-style": "common-ground",
						"support-response": "pair-collaborator",
					},
					resumeAvailable: true,
				}}
				persistenceActions={assessmentPersistenceActionsFixture}
			/>,
		);

		expect(
			screen.getByRole("heading", { name: "Demonstration result" }),
		).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: "Continue this snapshot" }),
		).toBeNull();
		expect(screen.getByText("100% answered")).toBeTruthy();
	});

	it("keeps the current question available when saving fails", async () => {
		const saveAnswer = vi.fn().mockRejectedValue(new Error("offline"));
		render(
			<KelsierPageComponent
				questionnaire={assessmentQuestionnaireFixture}
				persistenceActions={{
					...assessmentPersistenceActionsFixture,
					saveAnswer,
				}}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "Start and save progress" }),
		);
		await screen.findByRole("radio", { name: "Restructure immediately" });
		fireEvent.click(
			screen.getByRole("radio", { name: "Restructure immediately" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Next question" }));

		expect(await screen.findAllByText(/Your answer wasn’t saved/)).toHaveLength(
			2,
		);
		expect(
			screen.getByRole("heading", {
				name: "When a deadline moves unexpectedly, you tend to…",
			}),
		).toBeTruthy();
		expect(
			screen.getByRole("radio", { name: "Restructure immediately" }),
		).toHaveProperty("checked", true);
	});

	it("allows a returned guest to delete without consuming the resume", async () => {
		const deleteAttempt = vi.fn().mockResolvedValue({ deleted: true });
		render(
			<KelsierPageComponent
				questionnaire={assessmentQuestionnaireFixture}
				initialGuestAssessmentEntry={{
					attemptId: "10000000-0000-4000-8000-000000000001",
					startedAt: "2026-08-11T00:00:00.000Z",
					expiresAt: "2026-08-18T00:00:00.000Z",
					answeredCount: 1,
					answersComplete: false,
					resumeAvailable: true,
				}}
				persistenceActions={{
					...assessmentPersistenceActionsFixture,
					deleteAttempt,
				}}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: "Delete saved attempt" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Confirm deletion" }));

		expect(
			await screen.findAllByText("Your saved guest attempt has been deleted."),
		).toHaveLength(2);
		expect(deleteAttempt).toHaveBeenCalledWith(
			"10000000-0000-4000-8000-000000000001",
		);
		expect(
			screen.getByRole("button", { name: "Start and save progress" }),
		).toBeTruthy();
	});

	it("shows the privacy notice before persistence and deletes with confirmation", async () => {
		const deleteAttempt = vi.fn().mockResolvedValue({ deleted: true });
		render(
			<KelsierPageComponent
				questionnaire={assessmentQuestionnaireFixture}
				persistenceActions={{
					...assessmentPersistenceActionsFixture,
					deleteAttempt,
				}}
			/>,
		);

		expect(screen.getByText(/If that cookie is lost/)).toBeTruthy();
		fireEvent.click(
			screen.getByRole("button", { name: "Start and save progress" }),
		);
		await screen.findByRole("radio", { name: "Restructure immediately" });
		fireEvent.click(
			screen.getByRole("button", { name: "Delete saved attempt" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Confirm deletion" }));

		expect(
			await screen.findAllByText("Your saved guest attempt has been deleted."),
		).toHaveLength(2);
		expect(deleteAttempt).toHaveBeenCalledWith(
			"10000000-0000-4000-8000-000000000001",
		);
		expect(
			screen.getByRole("button", { name: "Start and save progress" }),
		).toBeTruthy();
	});
});
