import { expect, test } from "@playwright/test";

test("home page renders the Kelsier hero and interactive questionnaire", async ({
	page,
}) => {
	await page.goto("/");

	await expect(
		page.getByRole("heading", {
			name: "What drives your team lies beneath the surface",
		}),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Discover your team" }),
	).toBeVisible();
	await expect(page.getByText("Nova Atelier")).toHaveCount(0);

	await page.getByRole("button", { name: "Start assessment" }).click();
	await page.getByRole("button", { name: "Restructure immediately" }).click();
	await page.getByRole("button", { name: "Next question" }).click();

	await expect(
		page.getByRole("heading", {
			name: "Your preferred way to resolve conflict is…",
		}),
	).toBeVisible();
});
