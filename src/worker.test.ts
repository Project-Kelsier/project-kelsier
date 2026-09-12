// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import worker from "./worker";

const fetch = vi.hoisted(() => vi.fn());
vi.mock("@tanstack/react-start/server-entry", () => ({ default: { fetch } }));
vi.mock("#/db/client.worker", () => ({ getDb: vi.fn() }));
vi.mock("#/server/assessmentCleanup", () => ({
	runAssessmentCleanup: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());

it.each([200, 400, 403, 429, 500])(
	"prevents caching of dynamic responses including status %s",
	async (status) => {
		fetch.mockResolvedValue(
			new Response("private response", {
				status,
				headers: {
					"Cache-Control": "public, max-age=3600",
					"Set-Cookie": "test=value; HttpOnly",
					"Content-Type": "text/html",
				},
			}),
		);
		const response = await worker.fetch(
			new Request("https://assessment.example/") as Parameters<
				typeof worker.fetch
			>[0],
		);
		expect(response.status).toBe(status);
		expect(response.headers.get("Cache-Control")).toBe("private, no-store");
		expect(response.headers.get("Set-Cookie")).toBe("test=value; HttpOnly");
		expect(await response.text()).toBe("private response");
	},
);
