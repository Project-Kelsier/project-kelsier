// @vitest-environment node
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
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
	type AssessmentSeed,
	seedAssessmentQuestionnaire,
} from "../../scripts/assessment-seed";
import {
	CLEANUP_BATCH_SIZE,
	deleteExpiredGuestSessions,
} from "../services/assessmentCleanup";
import {
	completeGuestAssessmentAttempt,
	createGuestAssessmentAttempt,
	deleteGuestAssessmentAttempt,
	getActiveAssessmentQuestionnaireBySlug,
	getGuestAssessmentProgress,
	getGuestIncompleteAssessmentEntry,
	getLatestGuestAssessmentResult,
	replaceGuestAssessmentAttempt,
	resumeGuestAssessmentAttempt,
	saveGuestAssessmentAnswer,
} from "../services/assessments";
import type { DbClient } from "./client";
import { createDbConnection, type NodeDbConnection } from "./client.node";
import {
	assessmentAnswers,
	assessmentAttempts,
	assessmentOptions,
	assessmentQuestions,
	assessmentResults,
	assessmentVersions,
	guestSessions,
	users,
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

		it.each(["none", "both", "user"])(
			"enforces personal ownership for %s owners",
			async (owners) => {
				const rollback = new Error("Rollback ownership fixture");
				await expect(
					connection.db.transaction(async (transaction) => {
						const [user] = await transaction
							.insert(users)
							.values({ authUserId: randomUUID() })
							.returning();
						const insert = transaction.transaction(async (attemptTransaction) =>
							attemptTransaction.insert(assessmentAttempts).values({
								assessmentVersionId: versionId,
								guestSessionId: owners === "both" ? sessionId : null,
								userId: owners === "none" ? null : user.id,
								continuationTokenHash: randomUUID(),
							}),
						);
						if (owners === "user") await insert;
						else
							await expect(insert).rejects.toMatchObject({
								cause: expect.objectContaining({
									code: "23514",
									constraint_name:
										"assessment_attempts_exactly_one_owner_check",
								}),
							});
						throw rollback;
					}),
				).rejects.toBe(rollback);
			},
		);

		async function seedFixture() {
			const definition: AssessmentSeed = {
				slug: versionId,
				title: "Seed test",
				description: "Demonstration",
				questions: [
					{
						dimension: "test",
						prompt: "Question",
						required: true,
						sortOrder: 1,
						options: [
							{
								sortOrder: 1,
								label: "One",
								value: "one",
								scoreWeights: { test: 1 },
							},
						],
					},
				],
			};
			await connection.db
				.delete(assessmentVersions)
				.where(eq(assessmentVersions.id, versionId));
			versionId = await seedAssessmentQuestionnaire(connection.db, definition);
			return definition;
		}

		it("seeds identical content without changing row identities or reactivating a retired version", async () => {
			const definition = await seedFixture();
			const original = await connection.db
				.select()
				.from(assessmentQuestions)
				.where(eq(assessmentQuestions.versionId, versionId));
			await connection.db
				.update(assessmentVersions)
				.set({ status: "retired" })
				.where(eq(assessmentVersions.id, versionId));
			expect(await seedAssessmentQuestionnaire(connection.db, definition)).toBe(
				versionId,
			);
			expect(
				await connection.db
					.select()
					.from(assessmentQuestions)
					.where(eq(assessmentQuestions.versionId, versionId)),
			).toEqual(original);
			const [version] = await connection.db
				.select()
				.from(assessmentVersions)
				.where(eq(assessmentVersions.id, versionId));
			expect(version.status).toBe("retired");
		});

		it.each([
			"prompt",
			"required",
			"dimension",
			"score",
			"label",
			"value",
			"added-question",
			"removed-option",
		])(
			"rejects seed drift (%s) and preserves completed scoring history",
			async (change) => {
				const definition = await seedFixture();
				const [question] = await connection.db
					.select()
					.from(assessmentQuestions)
					.where(eq(assessmentQuestions.versionId, versionId));
				const [option] = await connection.db
					.select()
					.from(assessmentOptions)
					.where(eq(assessmentOptions.questionId, question.id));
				const continuationTokenHash = randomUUID();
				const attempt = await createGuestAssessmentAttempt(connection.db, {
					guestSessionId: sessionId,
					assessmentVersionId: versionId,
					continuationTokenHash,
					expiresAt,
				});
				if (!attempt) throw new Error("Fixture missing");
				const identity = {
					attemptId: attempt.id,
					tokenHash,
					continuationTokenHash,
					now: new Date(),
				};
				const result = await completeGuestAssessmentAttempt(connection.db, {
					...identity,
					questionId: question.id,
					optionId: option.id,
				});
				const changed = structuredClone(definition);
				const first = changed.questions[0];
				if (change === "prompt") first.prompt = "Changed";
				if (change === "required") first.required = false;
				if (change === "dimension") first.dimension = "changed";
				if (change === "score") first.options[0].scoreWeights.test = 5;
				if (change === "label") first.options[0].label = "Changed";
				if (change === "value") first.options[0].value = "changed";
				if (change === "added-question")
					changed.questions.push({ ...first, sortOrder: 2 });
				if (change === "removed-option") first.options = [];
				await expect(
					seedAssessmentQuestionnaire(connection.db, changed),
				).rejects.toThrow("explicit new assessment version");
				expect(
					await seedAssessmentQuestionnaire(connection.db, definition),
				).toBe(versionId);
				expect(
					await completeGuestAssessmentAttempt(connection.db, {
						...identity,
						questionId: question.id,
						optionId: option.id,
					}),
				).toEqual(result);
			},
		);

		it("rolls back a new incomplete questionnaire rather than publishing partial seed rows", async () => {
			const definition = await seedFixture();
			const invalid = {
				...definition,
				slug: randomUUID(),
				questions: [{ ...definition.questions[0], options: [] }],
			};
			await expect(
				seedAssessmentQuestionnaire(connection.db, invalid),
			).rejects.toThrow("require options");
			expect(
				await connection.db
					.select()
					.from(assessmentVersions)
					.where(eq(assessmentVersions.slug, invalid.slug)),
			).toHaveLength(0);
		});

		it("bounds cleanup batches and preserves unexpired sessions", async () => {
			// Use a transaction-local table: no developer sessions can be deleted.
			await connection.db.transaction(async (transaction) => {
				await transaction.execute(
					sql`create temporary table guest_sessions (like public.guest_sessions including all) on commit drop`,
				);
				await transaction.execute(
					sql`insert into guest_sessions (token_hash, expires_at) select 'cleanup-' || value, '2000-01-01'::timestamptz from generate_series(1, ${CLEANUP_BATCH_SIZE + 1}) value`,
				);
				await transaction.execute(
					sql`insert into guest_sessions (token_hash, expires_at) values ('unexpired', '2099-01-01')`,
				);
				const isolated = transaction as unknown as DbClient;
				expect(
					await deleteExpiredGuestSessions(isolated, new Date("2001-01-01")),
				).toBe(CLEANUP_BATCH_SIZE);
				expect(
					await deleteExpiredGuestSessions(isolated, new Date("2001-01-01")),
				).toBe(1);
				expect(
					await deleteExpiredGuestSessions(isolated, new Date("2001-01-01")),
				).toBe(0);
				expect(
					await transaction.execute(sql`select token_hash from guest_sessions`),
				).toEqual([expect.objectContaining({ token_hash: "unexpired" })]);
			});
		});

		it("cascades expiry through completed answers and results atomically", async () => {
			const fixture = await responseFixture();
			await saveGuestAssessmentAnswer(connection.db, fixture.first);
			expect(
				await completeGuestAssessmentAttempt(connection.db, fixture.last),
			).not.toBeNull();
			const rollback = new Error("Rollback cleanup test");
			await expect(
				connection.db.transaction(async (transaction) => {
					await transaction
						.update(guestSessions)
						.set({ expiresAt: new Date("1800-01-01") })
						.where(eq(guestSessions.id, sessionId));
					await deleteExpiredGuestSessions(
						transaction as unknown as DbClient,
						new Date("1801-01-01"),
					);
					for (const table of [assessmentAnswers, assessmentResults]) {
						expect(
							await transaction
								.select()
								.from(table)
								.where(eq(table.attemptId, fixture.identity.attemptId)),
						).toHaveLength(0);
					}
					expect(
						await transaction
							.select()
							.from(assessmentAttempts)
							.where(eq(assessmentAttempts.id, fixture.identity.attemptId)),
					).toHaveLength(0);
					throw rollback;
				}),
			).rejects.toBe(rollback);
			// The test rolls back every deletion, including any pre-existing old rows.
			expect(
				await connection.db
					.select()
					.from(assessmentResults)
					.where(eq(assessmentResults.attemptId, fixture.identity.attemptId)),
			).toHaveLength(1);
		});

		it("times out cleanup contention without partially deleting a session", async () => {
			const fixture = await responseFixture();
			await connection.db
				.update(guestSessions)
				.set({ expiresAt: new Date("1800-01-01") })
				.where(eq(guestSessions.id, sessionId));
			const rollback = new Error("Rollback cleanup test");
			await connection.db.transaction(async (lock) => {
				await lock
					.select()
					.from(assessmentAttempts)
					.where(eq(assessmentAttempts.id, fixture.identity.attemptId))
					.for("update");
				await expect(
					connection.db.transaction(async (transaction) => {
						await deleteExpiredGuestSessions(
							transaction as unknown as DbClient,
							new Date("1801-01-01"),
						);
						throw rollback;
					}),
				).rejects.toMatchObject({
					cause: expect.objectContaining({ code: "55P03" }),
				});
			});
			expect(
				await connection.db
					.select()
					.from(guestSessions)
					.where(eq(guestSessions.id, sessionId)),
			).toHaveLength(1);
			expect(
				await connection.db
					.select()
					.from(assessmentAttempts)
					.where(eq(assessmentAttempts.id, fixture.identity.attemptId)),
			).toHaveLength(1);
		});

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

		it("rejects another guest across every attempt operation and completed result access", async () => {
			const fixture = await responseFixture();
			const otherId = randomUUID();
			const otherToken = randomUUID();
			await connection.db
				.insert(guestSessions)
				.values({ id: otherId, tokenHash: otherToken, expiresAt });
			try {
				const foreign = { ...fixture.identity, tokenHash: otherToken };
				const lookup = {
					tokenHash: otherToken,
					assessmentVersionId: versionId,
					now: new Date(),
				};
				expect(
					await getGuestAssessmentProgress(connection.db, foreign),
				).toBeNull();
				expect(
					await getGuestIncompleteAssessmentEntry(connection.db, lookup),
				).toBeNull();
				expect(await resumeGuestAssessmentAttempt(connection.db, foreign)).toBe(
					"not-found",
				);
				expect(
					await replaceGuestAssessmentAttempt(connection.db, {
						...foreign,
						assessmentVersionId: versionId,
					}),
				).toBeNull();
				expect(
					await saveGuestAssessmentAnswer(connection.db, {
						...fixture.first,
						tokenHash: otherToken,
					}),
				).toMatchObject({ status: "not-found" });
				expect(
					await completeGuestAssessmentAttempt(connection.db, {
						...fixture.last,
						tokenHash: otherToken,
					}),
				).toMatchObject({ status: "not-found" });
				expect(await deleteGuestAssessmentAttempt(connection.db, foreign)).toBe(
					false,
				);
				await saveGuestAssessmentAnswer(connection.db, fixture.first);
				await completeGuestAssessmentAttempt(connection.db, fixture.last);
				expect(
					await getLatestGuestAssessmentResult(connection.db, lookup),
				).toBeNull();
				expect(await deleteGuestAssessmentAttempt(connection.db, foreign)).toBe(
					false,
				);
				expect(
					await getLatestGuestAssessmentResult(connection.db, {
						...lookup,
						tokenHash,
					}),
				).not.toBeNull();
			} finally {
				await connection.db
					.delete(guestSessions)
					.where(eq(guestSessions.id, otherId));
			}
		});

		it("rejects expired credentials before cleanup has removed the rows", async () => {
			const fixture = await responseFixture();
			await saveGuestAssessmentAnswer(connection.db, fixture.first);
			await connection.db
				.update(guestSessions)
				.set({ expiresAt: new Date(0) })
				.where(eq(guestSessions.id, sessionId));
			expect(
				await getGuestAssessmentProgress(connection.db, fixture.identity),
			).toBeNull();
			expect(
				await getGuestIncompleteAssessmentEntry(connection.db, {
					...fixture.identity,
					assessmentVersionId: versionId,
				}),
			).toBeNull();
			expect(
				await resumeGuestAssessmentAttempt(connection.db, fixture.identity),
			).toBe("not-found");
			expect(
				await saveGuestAssessmentAnswer(connection.db, fixture.changed),
			).toMatchObject({ status: "not-found" });
			expect(
				await completeGuestAssessmentAttempt(connection.db, fixture.last),
			).toMatchObject({ status: "not-found" });
			expect(
				await deleteGuestAssessmentAttempt(connection.db, fixture.identity),
			).toBe(false);
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
