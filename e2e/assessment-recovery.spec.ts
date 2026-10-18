import { expect, test } from "@playwright/test";

test("retries the questionnaire loader after a temporary request failure", async ({
	page,
}) => {
	await page.goto("/");
	await expect(
		page.locator(".kelsier-page[data-hydrated='true']"),
	).toBeVisible();
	await page.getByRole("link", { name: "Privacy", exact: true }).click();
	await page.route("**/_serverFn/**", (route) => route.abort("failed"));
	await page.goBack();
	await expect(
		page.getByRole("heading", {
			name: "The assessment is temporarily unavailable.",
		}),
	).toBeVisible();
	await page.unroute("**/_serverFn/**");
	await page.getByRole("button", { name: "Retry assessment" }).click();
	await expect(
		page.locator(".kelsier-page[data-hydrated='true']"),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Start and save progress" }),
	).toBeVisible();
});
