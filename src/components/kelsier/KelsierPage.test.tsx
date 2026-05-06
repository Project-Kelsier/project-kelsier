import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KelsierPage } from "./KelsierPage";

describe("KelsierPage", () => {
	beforeEach(() => {
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

	it("does not smooth scroll assessment controls for reduced-motion users", () => {
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

		fireEvent.click(screen.getByRole("button", { name: "Start assessment" }));

		expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
			behavior: "auto",
			block: "start",
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
		expect(screen.getByRole("contentinfo").textContent).toContain(
			`${new Date().getFullYear()} Kelsier. All rights reserved.`,
		);
	});

	it("starts and progresses through the questionnaire", () => {
		render(<KelsierPage />);

		fireEvent.click(screen.getByRole("button", { name: "Start assessment" }));
		fireEvent.click(
			screen.getByRole("button", { name: "Restructure immediately" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Next question" }));

		expect(
			screen.getByRole("heading", {
				name: "Your preferred way to resolve conflict is…",
			}),
		).toBeTruthy();
	});

	it("shows a completion state after the last question", () => {
		render(<KelsierPage />);

		fireEvent.click(screen.getByRole("button", { name: "Start assessment" }));
		fireEvent.click(
			screen.getByRole("button", { name: "Restructure immediately" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Next question" }));
		fireEvent.click(
			screen.getByRole("button", { name: "Find common ground first" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Next question" }));
		fireEvent.click(
			screen.getByRole("button", {
				name: "Pair them with the strongest collaborator",
			}),
		);
		fireEvent.click(screen.getByRole("button", { name: "Complete prototype" }));

		expect(
			screen.getByRole("heading", { name: "Prototype complete" }),
		).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Restart prototype" }),
		).toBeTruthy();
	});
});
