import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { KelsierNotFoundPage } from "./KelsierNotFoundPage";

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

describe("KelsierNotFoundPage", () => {
	it("renders invalid route recovery actions", () => {
		render(<KelsierNotFoundPage />);

		expect(screen.getByText("Signal lost")).toBeTruthy();
		expect(
			screen.getByRole("heading", {
				name: "This route sits beyond the mapped team dynamic.",
			}),
		).toBeTruthy();
		expect(screen.getByRole("link", { name: "Return home" })).toHaveProperty(
			"href",
			"http://localhost:3000/",
		);
		expect(
			screen
				.getByRole("link", { name: "Begin assessment" })
				.getAttribute("href"),
		).toBe("/#begin");
	});

	it("points header section links back to the home page", () => {
		render(<KelsierNotFoundPage />);

		const headerNav = screen.getByRole("navigation", {
			name: "Kelsier section navigation",
		});

		expect(
			headerNav
				.querySelector<HTMLAnchorElement>("a[href='/#method']")
				?.getAttribute("href"),
		).toBe("/#method");
		expect(
			headerNav
				.querySelector<HTMLAnchorElement>("a[href='/#teams']")
				?.getAttribute("href"),
		).toBe("/#teams");
		expect(
			headerNav
				.querySelector<HTMLAnchorElement>("a[href='/#science']")
				?.getAttribute("href"),
		).toBe("/#science");
	});

	it("points footer section links back to the home page", () => {
		render(<KelsierNotFoundPage />);

		const footerNav = screen.getByRole("navigation", {
			name: "Footer navigation",
		});

		expect(
			footerNav
				.querySelector<HTMLAnchorElement>("a[href='/#method']")
				?.getAttribute("href"),
		).toBe("/#method");
		expect(
			footerNav
				.querySelector<HTMLAnchorElement>("a[href='/#hero']")
				?.getAttribute("href"),
		).toBe("/#hero");
	});
});
