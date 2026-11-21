import { expect, test } from "@playwright/test";

test("reduced motion restores visible content and static ring centering", async ({
	page,
}) => {
	await page.goto("/");
	await expect(page.locator("[data-hydrated]")).toBeVisible();
	await page.evaluate(() => window.scrollTo(0, 600));
	await page.emulateMedia({ reducedMotion: "reduce" });
	const hero = page.locator(".k-hero-content");
	await expect(hero).toHaveCSS("opacity", "1");
	await expect(hero).toHaveCSS("transform", "none");
	await expect(page.locator(".k-hero-ring")).not.toHaveCSS("transform", "none");
	await expect
		.poll(() => hero.evaluate((el) => el.getAttribute("style") ?? ""))
		.not.toContain("opacity");
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await expect
		.poll(() => hero.evaluate((el) => el.style.transform))
		.not.toBe("");
});

test("initial reduced motion leaves assessment and landing content visible", async ({
	page,
}) => {
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.goto("/");
	await expect(page.locator("[data-hydrated]")).toBeVisible();
	await expect(page.locator(".k-hero-content")).toHaveCSS("opacity", "1");
	await expect(page.locator(".k-portal-content")).toHaveCSS("opacity", "1");
});
