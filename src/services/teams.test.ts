import { isNull } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import { organisations, teamMembers, teams } from "#/db/schema";
import type { OrganisationUserContext } from "./context";
import {
	getTeamBySlug,
	listTeamMembers,
	listTeamsForOrganisation,
} from "./teams";

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
const where = vi.fn<(predicate: unknown) => unknown>();
const innerJoin = vi.fn(() => ({ where }));
const secondInnerJoin = vi.fn(() => ({ innerJoin, where }));

function createContext(): OrganisationUserContext {
	limit.mockResolvedValue([]);
	where.mockClear();
	where.mockReturnValue({ limit });
	innerJoin.mockClear();
	secondInnerJoin.mockClear();
	vi.mocked(isNull).mockClear();

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

function expectSoftDeletePredicates(...columns: unknown[]) {
	for (const column of columns) {
		expect(isNull).toHaveBeenCalledWith(column);
	}
}

describe("team service organisation visibility", () => {
	it("excludes teams from soft-deleted organisations when listing teams", async () => {
		await listTeamsForOrganisation(createContext());

		expect(secondInnerJoin.mock.calls.at(-1)?.at(0)).toBe(organisations);
		expectSoftDeletePredicates(teams.deletedAt, organisations.deletedAt);
	});

	it("excludes teams from soft-deleted organisations when getting by slug", async () => {
		await getTeamBySlug(createContext(), "leadership-circle");

		expect(secondInnerJoin.mock.calls.at(-1)?.at(0)).toBe(organisations);
		expectSoftDeletePredicates(teams.deletedAt, organisations.deletedAt);
	});

	it("excludes team members from soft-deleted organisations", async () => {
		await listTeamMembers(
			createContext(),
			"00000000-0000-4000-8000-000000000003",
		);

		expect(secondInnerJoin.mock.calls.at(-1)?.at(0)).toBe(teams);
		expect(innerJoin.mock.calls.at(-1)?.at(0)).toBe(organisations);
		expectSoftDeletePredicates(
			teamMembers.deletedAt,
			teams.deletedAt,
			organisations.deletedAt,
		);
	});
});
