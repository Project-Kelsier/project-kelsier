import { describe, expect, it, vi } from "vitest";
import type { DbClient } from "#/db/client";
import { assertAssessmentAttemptTeamScope } from "./assessments";
import type { OrganisationUserContext } from "./context";

function createContextWithTeamRows(
	rows: Array<{ id: string }>,
): OrganisationUserContext {
	const db = {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => ({
					limit: vi.fn(async () => rows),
				})),
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
});
