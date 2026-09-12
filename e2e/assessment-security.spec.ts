import { expect, test } from "@playwright/test";

test("rejects cross-site writes and requests without the owner cookie", async ({
	page,
	context,
	browser,
}) => {
	const document = await page.goto("/");
	expect(document?.headers()["cache-control"]).toContain("no-store");
	await expect(
		page.locator(".kelsier-page[data-hydrated='true']"),
	).toBeVisible();
	await page.getByRole("button", { name: "Start and save progress" }).click();
	await page.getByText("Strongly disagree", { exact: true }).click();
	const saving = page.waitForRequest((request) => request.method() === "POST");
	await page.getByRole("button", { name: "Next question" }).click();
	const savedRequest = await saving;
	await expect(
		page.getByRole("heading", {
			name: "Important concerns are raised directly and respectfully.",
		}),
	).toBeVisible();
	const headers = await savedRequest.allHeaders();
	for (const name of [
		"cookie",
		"host",
		"content-length",
		"origin",
		"referer",
		"sec-fetch-site",
		"sec-fetch-mode",
		"sec-fetch-dest",
	])
		delete headers[name];
	const payload = savedRequest.postData() ?? "";
	const attacks: Record<string, string>[] = [
		{ origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
		{ origin: "https://attacker.example" },
		{ origin: "null" },
	];
	for (const attackHeaders of attacks) {
		const rejected = await context.request.post(savedRequest.url(), {
			headers: { ...headers, ...attackHeaders },
			data: payload,
		});
		expect(rejected.status()).toBe(403);
		expect(rejected.headers()["cache-control"]).toContain("no-store");
	}
	const anonymous = await browser.newContext();
	try {
		const rejected = await anonymous.request.post(savedRequest.url(), {
			headers: { ...headers, origin: new URL(page.url()).origin },
			data: payload,
		});
		expect(rejected.status()).toBe(404);
	} finally {
		await anonymous.close();
	}
	const ownRetry = await context.request.post(savedRequest.url(), {
		headers: { ...headers, origin: new URL(page.url()).origin },
		data: payload,
	});
	expect(ownRetry.status()).toBe(200);
	expect(ownRetry.headers()["cache-control"]).toContain("no-store");
	await page.getByRole("button", { name: "Delete saved attempt" }).click();
	await page.getByRole("button", { name: "Confirm deletion" }).click();
	await expect(
		page.getByRole("button", { name: "Start and save progress" }),
	).toBeVisible();
});
