import { eq, isNull } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import { organisations } from "#/db/schema";
import {
	listAiInsightsForOrganisation,
	listAiInsightsForSource,
} from "./aiInsights";
import type { OrganisationUserContext } from "./context";

vi.mock("drizzle-orm", async (importOriginal) => {
	const actual = await importOriginal<typeof import("drizzle-orm")>();

	return {
		...actual,
		and: vi.fn((...conditions: unknown[]) => ({ conditions })),
		eq: vi.fn((left: unknown, right: unknown) => ({ left, right })),
		isNull: vi.fn((column: unknown) => ({ column })),
	};
});

const where = vi.fn<(predicate: unknown) => Promise<unknown[]>>();
const innerJoin = vi.fn(() => ({ where }));

function createContext(): OrganisationUserContext {
	where.mockResolvedValue([]);
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

function expectOrganisationSoftDeletePredicate() {
	expect(innerJoin.mock.calls.at(-1)?.at(0)).toBe(organisations);
	expect(isNull).toHaveBeenCalledWith(organisations.deletedAt);
}

describe("AI insight service organisation visibility", () => {
	it("excludes organisation insights from soft-deleted organisations", async () => {
		await listAiInsightsForOrganisation(createContext());

		expectOrganisationSoftDeletePredicate();
	});

	it("excludes source insights from soft-deleted organisations", async () => {
		await listAiInsightsForSource(
			createContext(),
			"assessment_attempt",
			"00000000-0000-4000-8000-000000000003",
		);

		expect(eq).toHaveBeenCalledWith(
			expect.objectContaining({ name: "source_entity_type" }),
			"assessment_attempt",
		);
		expectOrganisationSoftDeletePredicate();
	});
});
