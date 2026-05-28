import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSnapshot = JSON.parse(
	readFileSync("drizzle/migrations/meta/0000_snapshot.json", "utf8"),
);
const latestMigrationSnapshot = JSON.parse(
	readFileSync("drizzle/migrations/meta/0001_snapshot.json", "utf8"),
);

describe("assessment attempts team constraints", () => {
	const assessmentAttempts =
		migrationSnapshot.tables["public.assessment_attempts"];
	const latestAssessmentAttempts =
		latestMigrationSnapshot.tables["public.assessment_attempts"];
	const assessmentAnswers =
		latestMigrationSnapshot.tables["public.assessment_answers"];
	const assessmentResults =
		latestMigrationSnapshot.tables["public.assessment_results"];

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

	it("enforces answer and result organisation consistency with attempts", () => {
		expect(
			latestAssessmentAttempts.indexes
				.assessment_attempts_id_organisation_id_unique,
		).toMatchObject({
			columns: [
				expect.objectContaining({ expression: "id" }),
				expect.objectContaining({ expression: "organisation_id" }),
			],
			isUnique: true,
		});

		expect(
			assessmentAnswers.foreignKeys.assessment_answers_attempt_organisation_fk,
		).toMatchObject({
			columnsFrom: ["attempt_id", "organisation_id"],
			columnsTo: ["id", "organisation_id"],
			onDelete: "cascade",
			tableTo: "assessment_attempts",
		});

		expect(
			assessmentResults.foreignKeys.assessment_results_attempt_organisation_fk,
		).toMatchObject({
			columnsFrom: ["attempt_id", "organisation_id"],
			columnsTo: ["id", "organisation_id"],
			onDelete: "cascade",
			tableTo: "assessment_attempts",
		});
	});

	it("creates the attempt organisation unique index before composite foreign keys", () => {
		const migration = readFileSync(
			"drizzle/migrations/0001_overjoyed_post.sql",
			"utf8",
		);

		const uniqueIndexPosition = migration.indexOf(
			"assessment_attempts_id_organisation_id_unique",
		);
		const answerForeignKeyPosition = migration.indexOf(
			"assessment_answers_attempt_organisation_fk",
		);
		const resultForeignKeyPosition = migration.indexOf(
			"assessment_results_attempt_organisation_fk",
		);

		expect(uniqueIndexPosition).toBeGreaterThanOrEqual(0);
		expect(answerForeignKeyPosition).toBeGreaterThan(uniqueIndexPosition);
		expect(resultForeignKeyPosition).toBeGreaterThan(uniqueIndexPosition);
	});
});
