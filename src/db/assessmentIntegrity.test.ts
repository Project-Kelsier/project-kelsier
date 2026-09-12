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
	completeGuestAssessmentAttempt,
	createGuestAssessmentAttempt,
	deleteGuestAssessmentAttempt,
	getActiveAssessmentQuestionnaireBySlug,
	replaceGuestAssessmentAttempt,
	resumeGuestAssessmentAttempt,
	saveGuestAssessmentAnswer,
} from "../services/assessments";
import { createDbConnection, type NodeDbConnection } from "./client.node";
import {
	assessmentAnswers,
	assessmentAttempts,
	assessmentOptions,
	assessmentQuestions,
	assessmentResults,
	assessmentVersions,
	guestSessions,
} from "./schema";

describe.skipIf(process.env.RUN_DB_TESTS !== "true")(
	"assessment integrity in PostgreSQL",
	() => {
		let connection: NodeDbConnection;
		let versionId: string;
		let sessionId: string;
		let tokenHash: string;
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
			tokenHash = randomUUID();
			await connection.db.insert(assessmentVersions).values({
				id: versionId,
				slug: versionId,
				title: "Integrity test",
				status: "active",
			});
			await connection.db
				.insert(guestSessions)
				.values({ id: sessionId, tokenHash, expiresAt });
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

		async function responseFixture() {
			const firstId = randomUUID();
			const lastId = randomUUID();
			const firstOptionId = randomUUID();
			const changedOptionId = randomUUID();
			const lastOptionId = randomUUID();
			await connection.db.insert(assessmentQuestions).values([
				{
					id: firstId,
					versionId,
					dimension: "test",
					sortOrder: 1,
					prompt: "Required",
					required: true,
				},
				{
					id: lastId,
					versionId,
					dimension: "test",
					sortOrder: 2,
					prompt: "Optional",
					required: false,
				},
			]);
			await connection.db.insert(assessmentOptions).values([
				{
					id: firstOptionId,
					questionId: firstId,
					sortOrder: 1,
					label: "One",
					value: "one",
					scoreWeights: { test: 1 },
				},
				{
					id: changedOptionId,
					questionId: firstId,
					sortOrder: 2,
					label: "Three",
					value: "three",
					scoreWeights: { test: 3 },
				},
				{
					id: lastOptionId,
					questionId: lastId,
					sortOrder: 1,
					label: "Five",
					value: "five",
					scoreWeights: { test: 5 },
				},
			]);
			const continuationTokenHash = randomUUID();
			const attempt = await createGuestAssessmentAttempt(connection.db, {
				guestSessionId: sessionId,
				assessmentVersionId: versionId,
				continuationTokenHash,
				expiresAt,
			});
			if (!attempt) throw new Error("Fixture attempt missing");
			const identity = {
				attemptId: attempt.id,
				tokenHash,
				continuationTokenHash,
				now: new Date(),
			};
			return {
				identity,
				first: { ...identity, questionId: firstId, optionId: firstOptionId },
				changed: {
					...identity,
					questionId: firstId,
					optionId: changedOptionId,
				},
				last: { ...identity, questionId: lastId, optionId: lastOptionId },
			};
		}

		it("scores the committed answer when completion waits for a concurrent save", async () => {
			const fixture = await responseFixture();
			await saveGuestAssessmentAnswer(connection.db, fixture.first);
			let completion:
				| ReturnType<typeof completeGuestAssessmentAttempt>
				| undefined;
			try {
				await connection.db.transaction(async (transaction) => {
					await transaction
						.select()
						.from(assessmentAttempts)
						.where(eq(assessmentAttempts.id, fixture.identity.attemptId))
						.for("update");
					completion = completeGuestAssessmentAttempt(
						connection.db,
						fixture.last,
					);
					await expect
						.poll(async () => {
							const waiting =
								await connection.queryClient`select pid from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and query like '%assessment_attempts%'`;
							return waiting.length;
						})
						.toBeGreaterThan(0);
					await transaction
						.update(assessmentAnswers)
						.set({ optionId: fixture.changed.optionId })
						.where(eq(assessmentAnswers.attemptId, fixture.identity.attemptId));
				});
				const result = await completion;
				expect(result).toMatchObject({
					status: "completed",
					result: { rows: [{ score: 4, contributingQuestionCount: 2 }] },
				});
			} finally {
				await completion;
			}
		});

		it("returns the same immutable result for concurrent completion and retries", async () => {
			const fixture = await responseFixture();
			await saveGuestAssessmentAnswer(connection.db, fixture.first);
			const results = await Promise.all([
				completeGuestAssessmentAttempt(connection.db, fixture.last),
				completeGuestAssessmentAttempt(connection.db, {
					...fixture.last,
					optionId: null,
				}),
			]);
			expect(results[0]).toEqual(results[1]);
			expect(results[0].status).toBe("completed");
			expect(
				await saveGuestAssessmentAnswer(connection.db, fixture.changed),
			).toMatchObject({ status: "not-found" });
			expect(
				await connection.db
					.select()
					.from(assessmentResults)
					.where(eq(assessmentResults.attemptId, fixture.identity.attemptId)),
			).toHaveLength(1);
		});

		it("rejects missing required answers and completes with an omitted optional final answer", async () => {
			const fixture = await responseFixture();
			expect(
				await completeGuestAssessmentAttempt(connection.db, fixture.last),
			).toMatchObject({ status: "missing-required" });
			expect(
				await connection.db
					.select()
					.from(assessmentResults)
					.where(eq(assessmentResults.attemptId, fixture.identity.attemptId)),
			).toHaveLength(0);
			await saveGuestAssessmentAnswer(connection.db, fixture.first);
			expect(
				await completeGuestAssessmentAttempt(connection.db, {
					...fixture.last,
					optionId: null,
				}),
			).toMatchObject({
				status: "completed",
				result: { rows: [{ score: 1, contributingQuestionCount: 1 }] },
			});
		});

		it("does not replace an attempt that completes while replacement waits", async () => {
			const fixture = await responseFixture();
			let replacement:
				| ReturnType<typeof replaceGuestAssessmentAttempt>
				| undefined;
			try {
				await connection.db.transaction(async (transaction) => {
					await transaction
						.select()
						.from(assessmentAttempts)
						.where(eq(assessmentAttempts.id, fixture.identity.attemptId))
						.for("update");
					replacement = replaceGuestAssessmentAttempt(connection.db, {
						...fixture.identity,
						assessmentVersionId: versionId,
					});
					await expect
						.poll(
							async () =>
								(
									await connection.queryClient`select pid from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock' and query like '%assessment_attempts%'`
								).length,
						)
						.toBeGreaterThan(0);
					await transaction
						.update(assessmentAttempts)
						.set({ completedAt: new Date() })
						.where(eq(assessmentAttempts.id, fixture.identity.attemptId));
				});
				expect(await replacement).toBeNull();
				expect(
					await connection.db
						.select()
						.from(assessmentAttempts)
						.where(eq(assessmentAttempts.id, fixture.identity.attemptId)),
				).toHaveLength(1);
			} finally {
				await replacement;
			}
		});

		it("rotates continuation credentials once and rejects stale saves", async () => {
			const fixture = await responseFixture();
			const resumed = {
				...fixture.identity,
				continuationTokenHash: randomUUID(),
			};
			await Promise.all([
				resumeGuestAssessmentAttempt(connection.db, resumed),
				saveGuestAssessmentAnswer(connection.db, fixture.first),
			]);
			expect(
				await saveGuestAssessmentAnswer(connection.db, fixture.changed),
			).toMatchObject({ status: "not-found" });
			expect(await resumeGuestAssessmentAttempt(connection.db, resumed)).toBe(
				"resumed",
			);
			expect(
				await resumeGuestAssessmentAttempt(connection.db, {
					...resumed,
					continuationTokenHash: randomUUID(),
				}),
			).toBe("resume-unavailable");
			expect(
				await saveGuestAssessmentAnswer(connection.db, {
					...fixture.changed,
					continuationTokenHash: resumed.continuationTokenHash,
				}),
			).toMatchObject({ status: "saved" });
		});

		it("cascades results and answers when owner deletion races with completion", async () => {
			const fixture = await responseFixture();
			await saveGuestAssessmentAnswer(connection.db, fixture.first);
			await Promise.all([
				completeGuestAssessmentAttempt(connection.db, fixture.last),
				deleteGuestAssessmentAttempt(connection.db, fixture.identity),
			]);
			expect(
				await connection.db
					.select()
					.from(assessmentResults)
					.where(eq(assessmentResults.attemptId, fixture.identity.attemptId)),
			).toHaveLength(0);
			expect(
				await connection.db
					.select()
					.from(assessmentAnswers)
					.where(eq(assessmentAnswers.attemptId, fixture.identity.attemptId)),
			).toHaveLength(0);
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
