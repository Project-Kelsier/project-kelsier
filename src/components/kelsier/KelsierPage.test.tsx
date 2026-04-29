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

	it("renders standard footer navigation links", () => {
		render(<KelsierPage />);

		expect(
			screen.getByRole("navigation", { name: "Footer navigation" }),
		).toBeTruthy();
		expect(screen.getByRole("link", { name: "Privacy" })).toBeTruthy();
		expect(screen.getByRole("link", { name: "Terms" })).toBeTruthy();
		expect(
			screen.getByRole("link", { name: "Contact" }).getAttribute("href"),
		).toBe("mailto:hello@kelsier.example");
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
