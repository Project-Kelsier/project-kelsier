import { describe, expect, it } from "vitest";
import {
	assertSeedTargetIsAllowed,
	getSeedDatabaseUrl,
	isLocalSeedDatabase,
} from "../../scripts/seed-config";

describe("seed database configuration", () => {
	it("uses the pooled database URL when Hyperdrive is enabled with boolean true", () => {
		expect(
			getSeedDatabaseUrl({
				DATABASE_URL: "postgres://direct.example/db",
				DATABASE_URL_POOLED: "postgres://pooled.example/db",
				USE_HYPERDRIVE: true,
			}),
		).toBe("postgres://pooled.example/db");
	});

	it("uses the pooled database URL when Hyperdrive is enabled with string true", () => {
		expect(
			getSeedDatabaseUrl({
				DATABASE_URL: "postgres://direct.example/db",
				DATABASE_URL_POOLED: "postgres://pooled.example/db",
				USE_HYPERDRIVE: "true",
			}),
		).toBe("postgres://pooled.example/db");
	});

	it("recognizes the local seed database", () => {
		expect(
			isLocalSeedDatabase(
				"postgres://kelsier:kelsier@localhost:55432/kelsier_dev",
			),
		).toBe(true);
		expect(
			isLocalSeedDatabase(
				"postgres://kelsier:kelsier@127.0.0.1:55432/kelsier_dev",
			),
		).toBe(true);
	});

	it("rejects non-local databases by default", () => {
		expect(() =>
			assertSeedTargetIsAllowed("postgres://user:pass@db.example/prod", {
				DATABASE_URL: "postgres://user:pass@db.example/prod",
			}),
		).toThrow("Refusing to seed a non-local database");
	});

	it("allows non-local databases only when explicitly opted in", () => {
		expect(() =>
			assertSeedTargetIsAllowed("postgres://user:pass@db.example/prod", {
				ALLOW_SEED: "true",
				DATABASE_URL: "postgres://user:pass@db.example/prod",
			}),
		).not.toThrow();
	});
});
