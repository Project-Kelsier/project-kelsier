import { describe, expect, it } from "vitest";
import { getSeedDatabaseUrl } from "../../scripts/seed-config";

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
});
