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
			screen.getByRole("heading", {
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
				persistenceActions={assessmentPersistenceActionsFixture}
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

		expect(screen.getByText("Skipped")).toBeTruthy();
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
		fireEvent.click(
			screen.getByRole("radio", { name: "Find common ground first" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Next question" }));
		fireEvent.click(
			screen.getByRole("radio", {
				name: "Pair them with the strongest collaborator",
			}),
		);
		fireEvent.click(screen.getByRole("button", { name: "Complete prototype" }));

		expect(
			screen.getByRole("heading", { name: "Prototype complete" }),
		).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Restart questions" }),
		).toBeTruthy();
		await waitFor(() => {
			expect(screen.getByRole("heading", { name: "Prototype complete" })).toBe(
				document.activeElement,
			);
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
		fireEvent.click(
			screen.getByRole("radio", { name: "Find common ground first" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Next question" }));
		fireEvent.click(
			screen.getByRole("radio", {
				name: "Pair them with the strongest collaborator",
			}),
		);
		fireEvent.click(screen.getByRole("button", { name: "Complete prototype" }));

		expect(
			screen.getByRole("heading", { name: "Prototype complete" }),
		).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Discover your team" }));

		expect(
			screen.getByRole("heading", {
				name: "Prototype complete",
			}),
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
