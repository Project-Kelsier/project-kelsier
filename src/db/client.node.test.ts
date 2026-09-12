import { describe, expect, it } from "vitest";
import { getConnectionString, getWorkerConnectionString } from "./client";
import { closeDbConnections, getDb, getDbConnection } from "./client.node";

describe("database client factory", () => {
	it("requires a direct database URL by default", () => {
		expect(() => getConnectionString({})).toThrow("DATABASE_URL is required.");
	});

	it("uses the pooled connection string when Hyperdrive is enabled", () => {
		expect(() =>
			getDb({
				DATABASE_URL: "postgres://direct.example/db",
				USE_HYPERDRIVE: "true",
			}),
		).toThrow("DATABASE_URL_POOLED is required when USE_HYPERDRIVE=true.");
	});

	it("requires the Worker Hyperdrive binding", () => {
		expect(() => getWorkerConnectionString({})).toThrow(
			"The HYPERDRIVE binding is required.",
		);
	});

	it("reads the connection string from the Worker Hyperdrive binding", () => {
		expect(
			getWorkerConnectionString({
				HYPERDRIVE: { connectionString: "postgres://hyperdrive.example/db" },
			}),
		).toBe("postgres://hyperdrive.example/db");
	});

	it("reuses a connection for matching connection strings", async () => {
		const env = {
			DATABASE_URL: "postgres://user:pass@localhost:55432/kelsier_dev",
		};
		const equivalentEnv = {
			DATABASE_URL: "postgres://user:pass@localhost:55432/kelsier_dev",
		};

		const connection = getDbConnection(env);

		try {
			expect(connection).toBe(getDbConnection(env));
			expect(connection).toBe(getDbConnection(equivalentEnv));
		} finally {
			await closeDbConnections(env);
		}
	});

	it("can close cached connections for tests and scripts", async () => {
		const env = {
			DATABASE_URL: "postgres://user:pass@localhost:55432/kelsier_dev_close",
		};

		const connection = getDbConnection(env);

		await closeDbConnections(env);

		const nextConnection = getDbConnection(env);

		try {
			expect(nextConnection).not.toBe(connection);
		} finally {
			await closeDbConnections(env);
		}
	});
});
