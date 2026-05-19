import { describe, expect, it, vi } from "vitest";
import { getDb, getDbConnection } from "./client";

describe("database client factory", () => {
	it("defers missing credential validation until a db is requested", async () => {
		vi.resetModules();

		const client = await import("./client");

		expect(() => client.getDb({})).toThrow("DATABASE_URL is required.");
	});

	it("uses the pooled connection string when Hyperdrive is enabled", () => {
		expect(() =>
			getDb({
				DATABASE_URL: "postgres://direct.example/db",
				USE_HYPERDRIVE: "true",
			}),
		).toThrow("DATABASE_URL_POOLED is required when USE_HYPERDRIVE=true.");
	});

	it("reuses a connection for the same environment object", async () => {
		const env = {
			DATABASE_URL: "postgres://user:pass@localhost:55432/kelsier_dev",
		};

		const connection = getDbConnection(env);

		try {
			expect(connection).toBe(getDbConnection(env));
		} finally {
			await connection.queryClient.end();
		}
	});
});
