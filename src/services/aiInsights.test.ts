import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import {
	listAiInsightsForOrganisation,
	listAiInsightsForSource,
} from "./aiInsights";
import type { OrganisationUserContext } from "./context";

const where = vi.fn<(predicate: unknown) => Promise<unknown[]>>();
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
	where.mockResolvedValue([]);
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

function expectOrganisationSoftDeletePredicate() {
	const predicate = where.mock.calls.at(-1)?.at(0);
	const predicateSql = collectStringChunks(predicate).join(" ");

	expect(predicateSql).toContain("deleted_at");
	expect(predicateSql).toContain(" is null");
}

describe("AI insight service organisation visibility", () => {
	it("excludes organisation insights from soft-deleted organisations", async () => {
		await listAiInsightsForOrganisation(createContext());

		expectOrganisationSoftDeletePredicate();
	});

	it("excludes source insights from soft-deleted organisations", async () => {
		await listAiInsightsForSource(
			createContext(),
			"00000000-0000-4000-8000-000000000003",
		);

		expectOrganisationSoftDeletePredicate();
	});
});
