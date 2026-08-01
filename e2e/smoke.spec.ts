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
	await expect(
		page.locator(".kelsier-page[data-hydrated='true']"),
	).toBeVisible();

	await page.getByRole("button", { name: "Discover your team" }).click();
	await page.getByText("Restructure immediately", { exact: true }).click();
	await expect(
		page.getByRole("radio", { name: "Restructure immediately" }),
	).toBeChecked();
	await page.getByRole("button", { name: "Next question" }).click();

	await expect(
		page.getByRole("heading", {
			name: /Your preferred way to resolve conflict is/,
		}),
	).toBeVisible();
});

test("restores a saved theme before the client app hydrates", async ({
	page,
}) => {
	let clientBundleWasBlocked = false;
	await page.addInitScript(() => {
		window.localStorage.setItem("kelsier-color-theme", "phthalo");
	});
	await page.route("**/*", (route) => {
		if (route.request().resourceType() === "script") {
			clientBundleWasBlocked = true;
			return route.abort();
		}

		return route.continue();
	});

	await page.goto("/", { waitUntil: "domcontentloaded" });

	expect(clientBundleWasBlocked).toBe(true);
	await expect(page.locator("html")).toHaveAttribute(
		"data-kelsier-theme",
		"phthalo",
	);
});

test("privacy route renders placeholder page", async ({ page }) => {
	await page.goto("/privacy");
	await expect(
		page.getByRole("heading", { name: "Privacy Policy" }),
	).toBeVisible();
});

test("terms route renders placeholder page", async ({ page }) => {
	await page.goto("/terms");
	await expect(
		page.getByRole("heading", { name: "Terms of Use" }),
	).toBeVisible();
});

test("unknown routes render the Kelsier invalid route page", async ({
	page,
}) => {
	await page.goto("/unknown-team-signal");
	await expect(
		page.getByRole("heading", {
			name: "This route sits beyond the mapped team dynamic.",
		}),
	).toBeVisible();
	await expect(page.getByRole("link", { name: "Return home" })).toHaveAttribute(
		"href",
		"/",
	);
});
