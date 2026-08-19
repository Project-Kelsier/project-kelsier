import { expect, test } from "@playwright/test";

test("home page renders the Kelsier hero and interactive questionnaire", async ({
	context,
	page,
}) => {
	test.setTimeout(60_000);
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
	await expect(
		page.getByText("If that cookie is lost", { exact: false }),
	).toBeVisible();
	const guestCookieResponse = page.waitForResponse(async (response) =>
		((await response.allHeaders())["set-cookie"] ?? "").includes(
			"kelsier_guest=",
		),
	);
	await page.getByRole("button", { name: "Start and save progress" }).click();
	await expect(page.getByText("Question 1 of 10")).toBeVisible();
	const setCookieHeader = (
		(await (await guestCookieResponse).allHeaders())["set-cookie"] ?? ""
	).toLowerCase();
	expect(setCookieHeader).toContain("httponly");
	expect(setCookieHeader).toContain("samesite=lax");
	expect(setCookieHeader).not.toContain("; secure");
	const guestCookie = (await context.cookies()).find(
		(cookie) => cookie.name === "kelsier_guest",
	);
	expect(guestCookie).toMatchObject({
		httpOnly: true,
		secure: false,
	});
	await page.getByText("Strongly disagree", { exact: true }).click();
	await expect(
		page.getByRole("radio", { name: "Strongly disagree" }),
	).toBeChecked();
	await page.getByRole("button", { name: "Next question" }).click();

	await expect(
		page.getByRole("heading", {
			name: "Important concerns are raised directly and respectfully.",
		}),
	).toBeVisible();

	for (let questionNumber = 2; questionNumber <= 10; questionNumber += 1) {
		await expect(
			page.getByText(`Question ${questionNumber} of 10`),
		).toBeVisible();
		await expect(page.locator(".k-q-card .k-q-title")).toBeFocused();
		const firstOption = page.getByRole("radio").first();
		await firstOption.focus();
		await expect(firstOption).toBeFocused();
		await firstOption.press("Space");
		await expect(firstOption).toBeChecked();
		await page
			.getByRole("button", {
				name: questionNumber === 10 ? "Complete prototype" : "Next question",
			})
			.click();
	}

	await expect(
		page.getByRole("heading", { name: "Demonstration result" }),
	).toBeVisible();
	await expect(
		page.getByRole("table", {
			name: "Demonstration dimension scores on a scale from 1 to 5",
		}),
	).toBeVisible();
	await expect(page.getByRole("columnheader", { name: "Score" })).toBeVisible();
	await page.reload();
	await expect(
		page.locator(".kelsier-page[data-hydrated='true']"),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Demonstration result" }),
	).toBeVisible();
	await expect(
		page.getByRole("rowheader", { name: "Adaptability" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Continue this snapshot" }),
	).toHaveCount(0);
	await page.getByRole("button", { name: "Delete saved attempt" }).click();
	await page.getByRole("button", { name: "Confirm deletion" }).click();
	await expect(
		page.getByText("Your saved guest attempt has been deleted.").first(),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Start and save progress" }),
	).toBeVisible();
});

test("saves progress and allows exactly one explicit resume", async ({
	page,
}) => {
	await page.goto("/");
	await expect(
		page.locator(".kelsier-page[data-hydrated='true']"),
	).toBeVisible();
	await page.getByRole("button", { name: "Discover your team" }).click();
	await page.getByRole("button", { name: "Start and save progress" }).click();
	await page.getByText("Strongly disagree", { exact: true }).click();
	await page.getByRole("button", { name: "Next question" }).click();
	await expect(
		page.getByRole("heading", {
			name: "Important concerns are raised directly and respectfully.",
		}),
	).toBeVisible();

	await page.reload();
	await expect(
		page.locator(".kelsier-page[data-hydrated='true']"),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Continue or start a fresh snapshot" }),
	).toBeVisible();
	await expect(
		page.getByText("1 saved answer", { exact: false }),
	).toBeVisible();
	await expect(
		page.getByText("mood, circumstances, or context", { exact: false }),
	).toBeVisible();
	await page.getByRole("button", { name: "Continue this snapshot" }).click();
	await expect(
		page.getByRole("heading", {
			name: "Important concerns are raised directly and respectfully.",
		}),
	).toBeVisible();
	await page.getByRole("button", { name: "Back" }).click();
	await expect(
		page.getByRole("radio", { name: "Strongly disagree" }),
	).toBeChecked();

	await page.reload();
	await expect(
		page.locator(".kelsier-page[data-hydrated='true']"),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Continue or start a fresh snapshot" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Continue this snapshot" }),
	).toHaveCount(0);
	await expect(
		page.getByText("already used its single resume", { exact: false }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Start a fresh snapshot" }),
	).toBeVisible();
	await page.getByRole("button", { name: "Delete saved attempt" }).click();
	await page.getByRole("button", { name: "Confirm deletion" }).click();
	await expect(
		page.getByRole("button", { name: "Start and save progress" }),
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
	await expect(
		page.getByText("Selected answers and the resulting demonstration", {
			exact: false,
		}),
	).toBeVisible();
});

test("terms route renders placeholder page", async ({ page }) => {
	await page.goto("/terms");
	await expect(
		page.getByRole("heading", { name: "Terms of Use" }),
	).toBeVisible();
	await expect(
		page.getByText("persists a private guest snapshot", { exact: false }),
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
