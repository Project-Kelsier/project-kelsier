import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSnapshot = JSON.parse(
	readFileSync("drizzle/migrations/meta/0000_snapshot.json", "utf8"),
);

describe("assessment attempts team constraints", () => {
	const assessmentAttempts =
		migrationSnapshot.tables["public.assessment_attempts"];

	it("keeps organisation ownership required while allowing team removal", () => {
		expect(assessmentAttempts.columns.organisation_id.notNull).toBe(true);
		expect(assessmentAttempts.columns.team_id.notNull).toBe(false);
	});

	it("uses only the nullable team_id foreign key for team deletion behavior", () => {
		const foreignKeys = assessmentAttempts.foreignKeys;

		expect(
			foreignKeys.assessment_attempts_team_organisation_fk,
		).toBeUndefined();
		expect(foreignKeys.assessment_attempts_team_id_teams_id_fk).toMatchObject({
			columnsFrom: ["team_id"],
			columnsTo: ["id"],
			onDelete: "set null",
			tableTo: "teams",
		});
	});

	it("never adds the unsafe composite team/organisation foreign key", () => {
		const migration = readFileSync(
			"drizzle/migrations/0000_military_blazing_skull.sql",
			"utf8",
		);

		expect(migration).not.toContain("assessment_attempts_team_organisation_fk");
		expect(migration).not.toContain(
			'ALTER TABLE "assessment_attempts" DROP CONSTRAINT',
		);
	});
});
