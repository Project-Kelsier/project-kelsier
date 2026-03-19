import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Footer from "./Footer";

afterEach(() => {
	cleanup();
});

describe("Footer", () => {
	it("renders the current year and TanStack links", () => {
		render(<Footer />);

		expect(
			screen.getByText(new RegExp(`${new Date().getFullYear()}`)),
		).toBeTruthy();
		expect(
			screen
				.getByRole("link", { name: "Follow TanStack on X" })
				.getAttribute("href"),
		).toBe("https://x.com/tan_stack");
		expect(
			screen
				.getByRole("link", { name: "Go to TanStack GitHub" })
				.getAttribute("href"),
		).toBe("https://github.com/TanStack");
	});
});
