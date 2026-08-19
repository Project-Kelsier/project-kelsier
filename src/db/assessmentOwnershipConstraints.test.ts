import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
	assessmentAnswers,
	assessmentAttempts,
	assessmentQuestions,
	assessmentResults,
	guestSessions,
	users,
} from "./schema";

function columnNames(table: Parameters<typeof getTableConfig>[0]) {
	return getTableConfig(table).columns.map((column) => column.name);
}

describe("assessment personal ownership constraints", () => {
	const attemptConfig = getTableConfig(assessmentAttempts);

	it("allows nullable owner columns and requires the exactly-one-owner check", () => {
		expect(assessmentAttempts.guestSessionId.notNull).toBe(false);
		expect(assessmentAttempts.userId.notNull).toBe(false);
		expect(attemptConfig.checks.map((constraint) => constraint.name)).toContain(
			"assessment_attempts_exactly_one_owner_check",
		);
	});

	it("references both supported personal owner tables with cascading cleanup", () => {
		const references = attemptConfig.foreignKeys.map((foreignKey) => ({
			onDelete: foreignKey.onDelete,
			reference: foreignKey.reference(),
		}));

		expect(references).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					onDelete: "cascade",
					reference: expect.objectContaining({ foreignTable: guestSessions }),
				}),
				expect.objectContaining({
					onDelete: "cascade",
					reference: expect.objectContaining({ foreignTable: users }),
				}),
			]),
		);
	});

	it("derives answer and result ownership exclusively through the attempt", () => {
		expect(columnNames(assessmentAnswers)).not.toContain("organisation_id");
		expect(columnNames(assessmentResults)).not.toContain("organisation_id");
		expect(columnNames(assessmentResults)).not.toContain("user_id");
	});

	it("stores explicit requiredness and guest expiry metadata", () => {
		expect(assessmentQuestions.required.notNull).toBe(true);
		expect(assessmentQuestions.required.hasDefault).toBe(true);
		expect(guestSessions.expiresAt.notNull).toBe(true);
		expect(
			getTableConfig(guestSessions).indexes.map((index) => index.config.name),
		).toContain("guest_sessions_expires_at_idx");
	});

	it("enforces result provenance through the attempt version", () => {
		const resultConfig = getTableConfig(assessmentResults);
		const versionReference = resultConfig.foreignKeys
			.map((foreignKey) => foreignKey.reference())
			.find(
				(reference) =>
					reference.name === "assessment_results_attempt_version_fk",
			);

		expect(versionReference).toMatchObject({
			columns: [
				assessmentResults.attemptId,
				assessmentResults.assessmentVersionId,
			],
			foreignColumns: [
				assessmentAttempts.id,
				assessmentAttempts.assessmentVersionId,
			],
			foreignTable: assessmentAttempts,
		});
		expect(assessmentResults.scoringAlgorithmVersion.notNull).toBe(true);
		expect(assessmentResults.contributingQuestionCounts.notNull).toBe(true);
	});
});
