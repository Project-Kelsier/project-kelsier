import { eq, isNull } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import { organisations, personalityProfiles } from "#/db/schema";
import type { OrganisationUserContext } from "./context";
import { getPersonalityProfileForUser } from "./profiles";

vi.mock("drizzle-orm", async (importOriginal) => {
	const actual = await importOriginal<typeof import("drizzle-orm")>();

	return {
		...actual,
		and: vi.fn((...conditions: unknown[]) => ({ conditions })),
		eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
		isNull: vi.fn((column: unknown) => ({ column })),
	};
});

const limit = vi.fn<() => Promise<unknown[]>>();
const where = vi.fn<(predicate: unknown) => { limit: typeof limit }>(() => ({
	limit,
}));
const innerJoin = vi.fn(() => ({ where }));

function createContext(): OrganisationUserContext {
	limit.mockResolvedValue([]);
	where.mockClear();
	innerJoin.mockClear();
	vi.mocked(eq).mockClear();
	vi.mocked(isNull).mockClear();

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

		expect(innerJoin.mock.calls.at(-1)?.at(0)).toBe(organisations);
		expect(eq).toHaveBeenCalledWith(
			personalityProfiles.organisationId,
			"00000000-0000-4000-8000-000000000001",
		);
		expect(eq).toHaveBeenCalledWith(
			personalityProfiles.userId,
			"00000000-0000-4000-8000-000000000003",
		);
		expect(isNull).toHaveBeenCalledWith(organisations.deletedAt);
	});
});
