import { expect, test } from "./fixtures";

test("retries the questionnaire loader after a temporary request failure", async ({
	page,
	browserErrors,
}) => {
	await page.goto("/");
	await expect(
		page.locator(".kelsier-page[data-hydrated='true']"),
	).toBeVisible();
	await page.getByRole("link", { name: "Privacy", exact: true }).click();
	await page.route("**/_serverFn/**", (route) => route.abort("failed"));
	await browserErrors.expectFailure(
		page,
		{ kind: "rpc", method: "GET" },
		async () => {
			await page.goBack();
			await expect(
				page.getByRole("heading", {
					name: "The assessment is temporarily unavailable.",
				}),
			).toBeVisible();
			// Router invalidation re-renders the existing caught error while reloading.
			// Keep only that known diagnostic in scope; a second failed RPC is rejected.
			await page.unroute("**/_serverFn/**");
			await page.getByRole("button", { name: "Retry assessment" }).click();
			await expect(
				page.locator(".kelsier-page[data-hydrated='true']"),
			).toBeVisible();
		},
	);
	await expect(
		page.getByRole("button", { name: "Start and save progress" }),
	).toBeVisible();
});
