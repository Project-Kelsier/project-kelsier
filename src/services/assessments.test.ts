import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import { assertAssessmentAttemptTeamScope } from "./assessments";
import type { OrganisationUserContext } from "./context";

const limit = vi.fn<() => Promise<Array<{ id: string }>>>();
const where = vi.fn<(predicate: unknown) => { limit: typeof limit }>(() => ({
	limit,
}));

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

	const db = {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where,
			})),
		})),
	} as unknown as DbClient;

	return {
		db,
		organisationId: "00000000-0000-4000-8000-000000000001",
		userId: "00000000-0000-4000-8000-000000000002",
	};
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

		const predicate = where.mock.calls.at(0)?.at(0);
		const predicateSql = collectStringChunks(predicate).join(" ");

		expect(predicateSql).toContain("deleted_at");
		expect(predicateSql).toContain(" is null");
	});
});
