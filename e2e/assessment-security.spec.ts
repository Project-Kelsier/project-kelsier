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
		expect(rejected.headers()["cache-control"]).toContain("no-store");
		const wrongOwner = await anonymous.request.post(savedRequest.url(), {
			headers: {
				...headers,
				origin: new URL(page.url()).origin,
				cookie: `kelsier_guest=${"x".repeat(43)}`,
			},
			data: payload,
		});
		expect(wrongOwner.status()).toBe(404);
		expect(wrongOwner.headers()["cache-control"]).toContain("no-store");
	} finally {
		await anonymous.close();
	}
	// Corrupt a UUID in the captured request without depending on the RPC codec.
	const invalidPayload = payload.replace(
		/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
		"invalid-uuid",
	);
	expect(invalidPayload).not.toBe(payload);
	const invalid = await context.request.post(savedRequest.url(), {
		headers: { ...headers, origin: new URL(page.url()).origin },
		data: invalidPayload,
	});
	expect(invalid.status()).toBe(400);
	expect(invalid.headers()["cache-control"]).toContain("no-store");
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

test("preserves rate-limit status and retry headers while allowing deletion", async ({
	page,
	context,
	browserName,
}) => {
	// Isolate this intentional exhaustion from the other real-rate-limit tests.
	const client = { chromium: 21, firefox: 22, webkit: 23 }[browserName];
	await context.setExtraHTTPHeaders({
		"CF-Connecting-IP": `192.0.2.${client}`,
	});
	await page.goto("/");
	await expect(
		page.locator(".kelsier-page[data-hydrated='true']"),
	).toBeVisible();
	const creation = page.waitForResponse(
		(response) => response.request().method() === "POST",
	);
	await page.getByRole("button", { name: "Start and save progress" }).click();
	const created = await creation;
	expect(created.status()).toBe(200);
	const request = created.request();
	const headers = await request.allHeaders();
	for (const name of ["cookie", "host", "content-length"]) delete headers[name];
	try {
		// An existing attempt rejects duplicate creation, but still uses the bucket.
		for (let index = 0; index < 9; index += 1) {
			const duplicate = await context.request.post(request.url(), {
				headers,
				data: request.postData() ?? "",
			});
			expect(duplicate.status()).toBe(409);
			expect(duplicate.headers()["cache-control"]).toContain("no-store");
		}
		const throttled = await context.request.post(request.url(), {
			headers,
			data: request.postData() ?? "",
		});
		expect(throttled.status()).toBe(429);
		expect(throttled.headers()["retry-after"]).toBe("60");
		expect(throttled.headers()["cache-control"]).toContain("no-store");
	} finally {
		await page.getByRole("button", { name: "Delete saved attempt" }).click();
		await page.getByRole("button", { name: "Confirm deletion" }).click();
		await expect(
			page.getByRole("button", { name: "Start and save progress" }),
		).toBeVisible();
	}
});
