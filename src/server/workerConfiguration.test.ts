// @vitest-environment node
import { describe, expect, it } from "vitest";
import { unstable_readConfig } from "wrangler";

const config = unstable_readConfig(
	{ config: "wrangler.jsonc" },
	{ preserveOriginalMain: true },
);

describe("production Worker configuration", () => {
	it("keeps the assessment protections and cleanup schedule enabled", () => {
		expect(config.main).toBe("src/worker.ts");
		expect(config.hyperdrive).toEqual([
			expect.objectContaining({ binding: "HYPERDRIVE" }),
		]);
		expect(config.ratelimits).toEqual([
			{
				name: "ASSESSMENT_ATTEMPT_RATE_LIMITER",
				namespace_id: "1001",
				simple: { limit: 10, period: 60 },
			},
			{
				name: "ASSESSMENT_ACTIVITY_RATE_LIMITER",
				namespace_id: "1002",
				simple: { limit: 120, period: 60 },
			},
		]);
		expect(config.triggers.crons).toEqual(["17 3 * * *"]);
		expect(config.observability).toMatchObject({
			enabled: true,
			logs: { head_sampling_rate: 1 },
		});
		expect(config.vars ?? {}).not.toHaveProperty("ENABLE_DEMO_IDENTITY");
	});
});
