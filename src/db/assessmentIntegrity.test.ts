// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "vitest";
import {
	createGuestAssessmentAttempt,
	getActiveAssessmentQuestionnaireBySlug,
} from "../services/assessments";
import { createDbConnection, type NodeDbConnection } from "./client.node";
import {
	assessmentAttempts,
	assessmentQuestions,
	assessmentVersions,
	guestSessions,
} from "./schema";

describe.skipIf(process.env.RUN_DB_TESTS !== "true")(
	"assessment integrity in PostgreSQL",
	() => {
		let connection: NodeDbConnection;
		let versionId: string;
		let sessionId: string;
		const expiresAt = new Date("2099-01-01T00:00:00Z");

		beforeAll(() => {
			const connectionString =
				process.env.DATABASE_URL ??
				"postgres://kelsier:kelsier@localhost:55432/kelsier_dev";
			const url = new URL(connectionString);
			if (
				!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
				url.pathname !== "/kelsier_dev"
			) {
				throw new Error(
					"Database integrity tests require local kelsier_dev PostgreSQL.",
				);
			}
			connection = createDbConnection(connectionString);
		});

		beforeEach(async () => {
			versionId = randomUUID();
			sessionId = randomUUID();
			await connection.db.insert(assessmentVersions).values({
				id: versionId,
				slug: versionId,
				title: "Integrity test",
				status: "active",
			});
			await connection.db
				.insert(guestSessions)
				.values({ id: sessionId, tokenHash: randomUUID(), expiresAt });
		});

		afterEach(async () => {
			await connection.db
				.delete(guestSessions)
				.where(eq(guestSessions.id, sessionId));
			await connection.db
				.delete(assessmentVersions)
				.where(eq(assessmentVersions.id, versionId));
		});

		afterAll(async () => {
			await connection?.queryClient.end();
		});

		it("allows one winner when the same guest creates attempts concurrently", async () => {
			const attempts = await Promise.all(
				Array.from({ length: 4 }, () =>
					createGuestAssessmentAttempt(connection.db, {
						guestSessionId: sessionId,
						assessmentVersionId: versionId,
						continuationTokenHash: randomUUID(),
						expiresAt,
					}),
				),
			);
			expect(attempts.filter(Boolean)).toHaveLength(1);
			expect(attempts.filter((attempt) => attempt === null)).toHaveLength(3);
			const stored = await connection.db
				.select()
				.from(assessmentAttempts)
				.where(eq(assessmentAttempts.guestSessionId, sessionId));
			expect(stored).toHaveLength(1);
		});

		it("permits a new attempt after completion without deleting history", async () => {
			const input = {
				guestSessionId: sessionId,
				assessmentVersionId: versionId,
				continuationTokenHash: randomUUID(),
				expiresAt,
			};
			const first = await createGuestAssessmentAttempt(connection.db, input);
			expect(first).not.toBeNull();
			await connection.db
				.update(assessmentAttempts)
				.set({ completedAt: new Date() })
				.where(eq(assessmentAttempts.id, first?.id ?? ""));
			const second = await createGuestAssessmentAttempt(connection.db, input);
			expect(second).not.toBeNull();
			expect(second?.id).not.toBe(first?.id);
		});

		it("rejects direct duplicate inserts at the database boundary", async () => {
			const row = {
				guestSessionId: sessionId,
				assessmentVersionId: versionId,
				continuationTokenHash: randomUUID(),
			};
			await connection.db.insert(assessmentAttempts).values(row);
			await expect(
				connection.db.insert(assessmentAttempts).values(row),
			).rejects.toMatchObject({
				cause: {
					code: "23505",
					constraint_name:
						"assessment_attempts_guest_version_unfinished_unique",
				},
			});
		});

		it("rejects an empty questionnaire and a required question without options", async () => {
			expect(
				await getActiveAssessmentQuestionnaireBySlug(connection.db, versionId),
			).toBeNull();
			await connection.db.insert(assessmentQuestions).values({
				versionId,
				dimension: "test",
				sortOrder: 1,
				prompt: "Missing options",
				required: true,
			});
			expect(
				await getActiveAssessmentQuestionnaireBySlug(connection.db, versionId),
			).toBeNull();
		});
	},
);
