import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import type { OrganisationUserContext } from "./context";
import {
	getTeamBySlug,
	listTeamMembers,
	listTeamsForOrganisation,
} from "./teams";

const limit = vi.fn<() => Promise<unknown[]>>();
const where = vi.fn<(predicate: unknown) => unknown>();
const innerJoin = vi.fn(() => ({ where }));
const secondInnerJoin = vi.fn(() => ({ innerJoin, where }));

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
	where.mockReturnValue({ limit });
	innerJoin.mockClear();
	secondInnerJoin.mockClear();

	const db = {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				innerJoin: secondInnerJoin,
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

describe("team service organisation visibility", () => {
	it("excludes teams from soft-deleted organisations when listing teams", async () => {
		await listTeamsForOrganisation(createContext());

		expectOrganisationSoftDeletePredicate();
	});

	it("excludes teams from soft-deleted organisations when getting by slug", async () => {
		await getTeamBySlug(createContext(), "leadership-circle");

		expectOrganisationSoftDeletePredicate();
	});

	it("excludes team members from soft-deleted organisations", async () => {
		await listTeamMembers(
			createContext(),
			"00000000-0000-4000-8000-000000000003",
		);

		expectOrganisationSoftDeletePredicate();
	});
});
