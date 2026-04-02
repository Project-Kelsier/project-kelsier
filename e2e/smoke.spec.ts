import { expect, test } from "@playwright/test";

test("home page renders and links to the about page", async ({ page }) => {
	await page.goto("/");

	await expect(
		page.getByRole("heading", { name: "Start simple, ship quickly." }),
	).toBeVisible();

	await page.getByRole("link", { name: "About This Starter" }).click();

	await expect(
		page.getByRole("heading", { name: "A small starter with room to grow." }),
	).toBeVisible();
});
