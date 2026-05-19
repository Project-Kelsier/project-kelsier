import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSnapshot = JSON.parse(
	readFileSync("drizzle/migrations/meta/0001_snapshot.json", "utf8"),
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

	it("drops the unsafe composite team/organisation foreign key in the migration", () => {
		const migration = readFileSync(
			"drizzle/migrations/0001_natural_dormammu.sql",
			"utf8",
		);

		expect(migration).toContain(
			'ALTER TABLE "assessment_attempts" DROP CONSTRAINT "assessment_attempts_team_organisation_fk";',
		);
		expect(migration).not.toContain(
			'ADD CONSTRAINT "assessment_attempts_team_organisation_fk"',
		);
	});
});
