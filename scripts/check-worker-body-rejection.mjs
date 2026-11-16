import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// A response that rejects an unread body must survive the service binding.
// Keep the consuming control: reading the body is not an application workaround.
const parents = ["@cloudflare/vite-plugin", "wrangler"];
const parent = process.argv[3];

if (process.argv[2] === "--worker") {
	assert.ok(parents.includes(parent));
	const require = createRequire(import.meta.resolve(parent));
	const { Miniflare, convertV4MiniflareOptions } = require("miniflare");
	const mf = new Miniflare(
		convertV4MiniflareOptions({
			workers: [
				{
					name: "entry",
					modules: true,
					compatibilityDate: "2026-08-06",
					script:
						"export default { fetch(request, env) { return env.TARGET.fetch(request); } }",
					serviceBindings: { TARGET: "target" },
				},
				{
					name: "target",
					modules: true,
					compatibilityDate: "2026-08-06",
					script:
						'export default { async fetch(request) { if (new URL(request.url).pathname === "/consume") await request.text(); return new Response("Forbidden", { status: 403 }); } }',
				},
			],
		}),
	);
	try {
		for (const pathname of ["/reject", "/consume"]) {
			for (let i = 0; i < 50; i++) {
				const body = new ReadableStream({
					start(controller) {
						controller.enqueue(new TextEncoder().encode("x".repeat(5000)));
						controller.close();
					},
				});
				const response = await mf.dispatchFetch(`http://localhost${pathname}`, {
					method: "POST",
					body,
					duplex: "half",
					signal: AbortSignal.timeout(5000),
				});
				assert.equal(response.status, 403);
				assert.equal(await response.text(), "Forbidden");
			}
		}
	} finally {
		await mf.dispose();
	}
} else {
	assert.equal(process.argv.length, 2, "Unexpected arguments");
	for (const dependency of parents) {
		for (let start = 1; start <= 2; start++) {
			const result = spawnSync(
				process.execPath,
				[fileURLToPath(import.meta.url), "--worker", dependency],
				{
					stdio: "inherit",
					windowsHide: true,
					timeout: 90_000,
					env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
				},
			);
			assert.equal(result.status, 0, `${dependency}: process ${start} failed`);
			console.log(`${dependency}: process ${start}, 100 responses verified`);
		}
	}
}
