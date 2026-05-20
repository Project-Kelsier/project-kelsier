import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import {
	assertAssessmentAttemptTeamScope,
	getAssessmentResultForAttempt,
	listAssessmentAttemptsForUser,
} from "./assessments";
import type { OrganisationUserContext } from "./context";

const limit = vi.fn<() => Promise<Array<{ id: string }>>>();
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

function createContextWithTeamRows(
	rows: Array<{ id: string }>,
): OrganisationUserContext {
	limit.mockResolvedValue(rows);
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

		expectOrganisationSoftDeletePredicate();
	});

	it("excludes teams from soft-deleted organisations", async () => {
		await assertAssessmentAttemptTeamScope(
			createContextWithTeamRows([]),
			"00000000-0000-4000-8000-000000000006",
		).catch(() => undefined);

		expectOrganisationSoftDeletePredicate();
	});
});

describe("assessment service organisation visibility", () => {
	it("excludes attempts from soft-deleted organisations", async () => {
		await listAssessmentAttemptsForUser(
			createContextWithTeamRows([]),
			"00000000-0000-4000-8000-000000000003",
		);

		expectOrganisationSoftDeletePredicate();
	});

	it("excludes results from soft-deleted organisations", async () => {
		await getAssessmentResultForAttempt(
			createContextWithTeamRows([]),
			"00000000-0000-4000-8000-000000000003",
		);

		expectOrganisationSoftDeletePredicate();
	});
});
