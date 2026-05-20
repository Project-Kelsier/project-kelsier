import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import type { OrganisationUserContext } from "./context";
import { getPersonalityProfileForUser } from "./profiles";

const limit = vi.fn<() => Promise<unknown[]>>();
const where = vi.fn<(predicate: unknown) => { limit: typeof limit }>(() => ({
	limit,
}));
const innerJoin = vi.fn(() => ({ where }));

function collectStringChunks(
	value: unknown,
	seen = new WeakSet<object>(),
): string[] {
	if (typeof value === "string") {
		return [value];
	}

	if (!value || typeof value !== "object" || seen.has(value)) {
		return [];
	}

	seen.add(value);

	if (Array.isArray(value)) {
		return value.flatMap((item) => collectStringChunks(item, seen));
	}

	return Object.values(value).flatMap((item) =>
		collectStringChunks(item, seen),
	);
}

function createContext(): OrganisationUserContext {
	limit.mockResolvedValue([]);
	where.mockClear();
	innerJoin.mockClear();

	const db = {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				innerJoin,
			})),
		})),
	} as unknown as DbClient;

	return {
		db,
		organisationId: "00000000-0000-4000-8000-000000000001",
		userId: "00000000-0000-4000-8000-000000000002",
	};
}

describe("profile service organisation visibility", () => {
	it("excludes profiles from soft-deleted organisations", async () => {
		await getPersonalityProfileForUser(
			createContext(),
			"00000000-0000-4000-8000-000000000003",
		);

		const predicate = where.mock.calls.at(-1)?.at(0);
		const predicateSql = collectStringChunks(predicate).join(" ");

		expect(predicateSql).toContain("deleted_at");
		expect(predicateSql).toContain(" is null");
	});
});
