import { expect, test } from "@playwright/test";

test("blocks deletion until the pending save settles", async ({ page }) => {
	await page.goto("/");
	await expect(page.locator("[data-hydrated]")).toBeVisible();
	await page.getByRole("button", { name: "Start and save progress" }).click();
	await page.getByText("Strongly disagree", { exact: true }).click();
	let release = () => {};
	let entered = () => {};
	const gate = new Promise<void>((resolve) => {
		release = resolve;
	});
	const started = new Promise<void>((resolve) => {
		entered = resolve;
	});
	await page.route("**/*", async (route) => {
		if (route.request().method() === "POST") {
			entered();
			await gate;
		}
		await route.continue();
	});
	try {
		await page.getByRole("button", { name: "Next question" }).click();
		await started;
		await expect(
			page.getByRole("button", { name: "Delete saved attempt" }),
		).toBeDisabled();
		await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
	} finally {
		release();
	}
	await expect(page.getByText("Question 2 of 10")).toBeVisible();
	await page.unroute("**/*");
	await page.getByRole("button", { name: "Delete saved attempt" }).click();
	await page.getByRole("button", { name: "Confirm deletion" }).click();
	await expect(
		page.getByRole("button", { name: "Start and save progress" }),
	).toBeVisible();
});
