import { isNull } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import { organisations, teams } from "#/db/schema";
import {
	assertAssessmentAttemptTeamScope,
	getAssessmentResultForAttempt,
	listAssessmentAttemptsForUser,
} from "./assessments";
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

const limit = vi.fn<() => Promise<Array<{ id: string }>>>();
const where = vi.fn<(predicate: unknown) => { limit: typeof limit }>(() => ({
	limit,
}));
const innerJoin = vi.fn(() => ({ where }));

function createContextWithTeamRows(
	rows: Array<{ id: string }>,
): OrganisationUserContext {
	limit.mockResolvedValue(rows);
	where.mockClear();
	innerJoin.mockClear();
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

function expectOrganisationJoin() {
	expect(innerJoin.mock.calls.at(-1)?.at(0)).toBe(organisations);
}

function expectSoftDeletePredicates(...columns: unknown[]) {
	for (const column of columns) {
		expect(isNull).toHaveBeenCalledWith(column);
	}
}

describe("assertAssessmentAttemptTeamScope", () => {
	it("allows a team assignment when the team belongs to the organisation", async () => {
		const context = createContextWithTeamRows([
			{ id: "00000000-0000-4000-8000-000000000003" },
		]);

		await expect(
			assertAssessmentAttemptTeamScope(
				context,
				"00000000-0000-4000-8000-000000000003",
			),
		).resolves.toBeUndefined();
	});

	it("rejects a team assignment when the team is outside the organisation", async () => {
		const context = createContextWithTeamRows([]);

		await expect(
			assertAssessmentAttemptTeamScope(
				context,
				"00000000-0000-4000-8000-000000000004",
			),
		).rejects.toThrow(
			"Assessment attempt team must belong to the organisation.",
		);
	});

	it("excludes deleted teams from team assignment validation", async () => {
		const context = createContextWithTeamRows([]);

		await expect(
			assertAssessmentAttemptTeamScope(
				context,
				"00000000-0000-4000-8000-000000000005",
			),
		).rejects.toThrow(
			"Assessment attempt team must belong to the organisation.",
		);

		expectOrganisationJoin();
		expectSoftDeletePredicates(teams.deletedAt, organisations.deletedAt);
	});

	it("excludes teams from soft-deleted organisations", async () => {
		await assertAssessmentAttemptTeamScope(
			createContextWithTeamRows([]),
			"00000000-0000-4000-8000-000000000006",
		).catch(() => undefined);

		expectOrganisationJoin();
		expectSoftDeletePredicates(teams.deletedAt, organisations.deletedAt);
	});
});

describe("assessment service organisation visibility", () => {
	it("excludes attempts from soft-deleted organisations", async () => {
		await listAssessmentAttemptsForUser(
			createContextWithTeamRows([]),
			"00000000-0000-4000-8000-000000000003",
		);

		expectOrganisationJoin();
		expectSoftDeletePredicates(organisations.deletedAt);
	});

	it("excludes results from soft-deleted organisations", async () => {
		await getAssessmentResultForAttempt(
			createContextWithTeamRows([]),
			"00000000-0000-4000-8000-000000000003",
		);

		expectOrganisationJoin();
		expectSoftDeletePredicates(organisations.deletedAt);
	});
});
