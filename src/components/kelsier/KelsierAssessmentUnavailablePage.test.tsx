import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { KelsierAssessmentUnavailablePage } from "./KelsierAssessmentUnavailablePage";

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

describe("KelsierAssessmentUnavailablePage", () => {
	it("explains the failure without exposing database details and retries", () => {
		const onRetry = vi.fn();
		render(<KelsierAssessmentUnavailablePage onRetry={onRetry} />);

		expect(
			screen.getByRole("heading", {
				name: "The assessment is temporarily unavailable.",
			}),
		).toBeTruthy();
		expect(screen.queryByText(/postgres|query|hyperdrive/i)).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Retry assessment" }));

		expect(onRetry).toHaveBeenCalledOnce();
		expect(
			screen.getByRole("link", { name: "Privacy notice" }).getAttribute("href"),
		).toBe("/privacy");
	});
});
