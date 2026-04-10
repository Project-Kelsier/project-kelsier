import { expect, test } from "@playwright/test";

test("home page renders the new hero and contact call to action", async ({ page }) => {
	await page.goto("/");

	await expect(
		page.getByRole("heading", {
			name: "Design-led digital launches with a sharper point of view.",
		}),
	).toBeVisible();
	await expect(page.getByRole("link", { name: "Book Discovery" })).toBeVisible();
	await expect(
		page.getByRole("link", { name: "hello@novaatelier.example" }),
	).toBeVisible();
});
