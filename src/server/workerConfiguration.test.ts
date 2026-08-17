import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workerConfiguration = readFileSync(
	resolve(process.cwd(), "wrangler.jsonc"),
	"utf8",
);

describe("production Worker configuration", () => {
	it("keeps the assessment runtime protections and cleanup schedule enabled", () => {
		expect(workerConfiguration).toContain('"main": "src/worker.ts"');
		expect(workerConfiguration).toContain('"binding": "HYPERDRIVE"');
		expect(workerConfiguration).toContain(
			'"name": "ASSESSMENT_ATTEMPT_RATE_LIMITER"',
		);
		expect(workerConfiguration).toContain('"crons": ["17 3 * * *"]');
		expect(workerConfiguration).toContain('"head_sampling_rate": 1');
		expect(workerConfiguration).not.toContain("ENABLE_DEMO_IDENTITY");
	});
});
