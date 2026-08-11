import "dotenv/config";
import { createDbConnection } from "#/db/client.node";
import {
	assessmentOptions,
	assessmentQuestions,
	assessmentVersions,
	organisationMembers,
	organisations,
	teamMembers,
	teams,
	users,
} from "#/db/schema";
import { assertSeedTargetIsAllowed, getSeedDatabaseUrl } from "./seed-config";

const databaseUrl = getSeedDatabaseUrl(process.env);
assertSeedTargetIsAllowed(databaseUrl, process.env);

const { db, queryClient } = createDbConnection(databaseUrl);

// Dev-only fake Neon Auth user IDs. Neon Auth owns real identity records.
const DEMO_OWNER_AUTH_USER_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_COLLEAGUE_AUTH_USER_ID = "00000000-0000-4000-8000-000000000002";
const SECOND_ORG_OWNER_AUTH_USER_ID = "00000000-0000-4000-8000-000000000003";

const questions = [
	{
		dimension: "clarity",
		sortOrder: 1,
		prompt: "I understand what my team needs from me this week.",
	},
	{
		dimension: "candour",
		sortOrder: 2,
		prompt: "Important concerns are raised directly and respectfully.",
	},
	{
		dimension: "listening",
		sortOrder: 3,
		prompt: "People adjust their views when they hear useful new information.",
	},
	{
		dimension: "trust",
		sortOrder: 4,
		prompt: "I can rely on teammates to follow through on commitments.",
	},
	{
		dimension: "conflict",
		sortOrder: 5,
		prompt: "Disagreements help the team make better decisions.",
	},
	{
		dimension: "decision_making",
		sortOrder: 6,
		prompt: "Decision owners and next steps are clear after discussions.",
	},
	{
		dimension: "energy",
		sortOrder: 7,
		prompt: "The team's communication leaves me with energy to do good work.",
	},
	{
		dimension: "support",
		sortOrder: 8,
		prompt: "When someone is blocked, help arrives early enough to matter.",
	},
	{
		dimension: "accountability",
		sortOrder: 9,
		prompt: "The team notices and resolves missed commitments constructively.",
	},
	{
		dimension: "adaptability",
		sortOrder: 10,
		prompt:
			"The team changes how it communicates when the current pattern fails.",
	},
] as const;

const optionLabels = [
	{ label: "Strongly disagree", value: "strongly_disagree", score: 1 },
	{ label: "Disagree", value: "disagree", score: 2 },
	{ label: "Neutral", value: "neutral", score: 3 },
	{ label: "Agree", value: "agree", score: 4 },
	{ label: "Strongly agree", value: "strongly_agree", score: 5 },
] as const;

async function seed() {
	const updatedAt = new Date();

	const [demoUser] = await db
		.insert(users)
		.values({
			authUserId: DEMO_OWNER_AUTH_USER_ID,
		})
		.onConflictDoUpdate({
			target: users.authUserId,
			set: {
				updatedAt,
			},
		})
		.returning({ id: users.id });

	if (!demoUser) {
		throw new Error("Failed to seed demo user.");
	}

	const [demoColleague] = await db
		.insert(users)
		.values({
			authUserId: DEMO_COLLEAGUE_AUTH_USER_ID,
		})
		.onConflictDoUpdate({
			target: users.authUserId,
			set: {
				updatedAt,
			},
		})
		.returning({ id: users.id });

	if (!demoColleague) {
		throw new Error("Failed to seed demo colleague.");
	}

	const [secondOrganisationOwner] = await db
		.insert(users)
		.values({
			authUserId: SECOND_ORG_OWNER_AUTH_USER_ID,
		})
		.onConflictDoUpdate({
			target: users.authUserId,
			set: {
				updatedAt,
			},
		})
		.returning({ id: users.id });

	if (!secondOrganisationOwner) {
		throw new Error("Failed to seed second organisation owner.");
	}

	const [demoOrganisation] = await db
		.insert(organisations)
		.values({
			slug: "demo-organisation",
			name: "Demo Organisation",
		})
		.onConflictDoUpdate({
			target: organisations.slug,
			set: {
				name: "Demo Organisation",
				status: "active",
				deletedAt: null,
				updatedAt,
			},
		})
		.returning({ id: organisations.id });

	if (!demoOrganisation) {
		throw new Error("Failed to seed demo organisation.");
	}

	await db
		.insert(organisationMembers)
		.values({
			organisationId: demoOrganisation.id,
			userId: demoUser.id,
			role: "owner",
		})
		.onConflictDoUpdate({
			target: [organisationMembers.organisationId, organisationMembers.userId],
			set: {
				role: "owner",
				deletedAt: null,
				updatedAt,
			},
		});

	await db
		.insert(organisationMembers)
		.values({
			organisationId: demoOrganisation.id,
			userId: demoColleague.id,
			role: "member",
		})
		.onConflictDoUpdate({
			target: [organisationMembers.organisationId, organisationMembers.userId],
			set: {
				role: "member",
				deletedAt: null,
				updatedAt,
			},
		});

	const [secondOrganisation] = await db
		.insert(organisations)
		.values({
			slug: "second-organisation",
			name: "Second Organisation",
		})
		.onConflictDoUpdate({
			target: organisations.slug,
			set: {
				name: "Second Organisation",
				status: "active",
				deletedAt: null,
				updatedAt,
			},
		})
		.returning({ id: organisations.id });

	if (!secondOrganisation) {
		throw new Error("Failed to seed second organisation.");
	}

	await db
		.insert(organisationMembers)
		.values({
			organisationId: secondOrganisation.id,
			userId: secondOrganisationOwner.id,
			role: "owner",
		})
		.onConflictDoUpdate({
			target: [organisationMembers.organisationId, organisationMembers.userId],
			set: {
				role: "owner",
				deletedAt: null,
				updatedAt,
			},
		});

	const [demoTeam] = await db
		.insert(teams)
		.values({
			organisationId: demoOrganisation.id,
			slug: "leadership-circle",
			name: "Leadership Circle",
		})
		.onConflictDoUpdate({
			target: [teams.organisationId, teams.slug],
			set: {
				name: "Leadership Circle",
				status: "active",
				deletedAt: null,
				updatedAt,
			},
		})
		.returning({ id: teams.id });

	if (!demoTeam) {
		throw new Error("Failed to seed demo team.");
	}

	await db
		.insert(teamMembers)
		.values({
			organisationId: demoOrganisation.id,
			teamId: demoTeam.id,
			userId: demoUser.id,
			role: "lead",
		})
		.onConflictDoUpdate({
			target: [teamMembers.teamId, teamMembers.userId],
			set: {
				organisationId: demoOrganisation.id,
				role: "lead",
				deletedAt: null,
				updatedAt,
			},
		});

	await db
		.insert(teamMembers)
		.values({
			organisationId: demoOrganisation.id,
			teamId: demoTeam.id,
			userId: demoColleague.id,
			role: "member",
		})
		.onConflictDoUpdate({
			target: [teamMembers.teamId, teamMembers.userId],
			set: {
				organisationId: demoOrganisation.id,
				role: "member",
				deletedAt: null,
				updatedAt,
			},
		});

	const [assessmentVersion] = await db
		.insert(assessmentVersions)
		.values({
			slug: "kelsier-core-v1",
			title: "Kelsier Core V1",
			description:
				"Starter assessment for early team communication patterns across ten dimensions.",
			status: "active",
		})
		.onConflictDoUpdate({
			target: assessmentVersions.slug,
			set: {
				title: "Kelsier Core V1",
				description:
					"Starter assessment for early team communication patterns across ten dimensions.",
				status: "active",
				updatedAt,
			},
		})
		.returning({ id: assessmentVersions.id });

	if (!assessmentVersion) {
		throw new Error("Failed to seed assessment version.");
	}

	for (const question of questions) {
		const [seededQuestion] = await db
			.insert(assessmentQuestions)
			.values({
				versionId: assessmentVersion.id,
				dimension: question.dimension,
				sortOrder: question.sortOrder,
				prompt: question.prompt,
			})
			.onConflictDoUpdate({
				target: [assessmentQuestions.versionId, assessmentQuestions.sortOrder],
				set: {
					dimension: question.dimension,
					prompt: question.prompt,
					updatedAt,
				},
			})
			.returning({ id: assessmentQuestions.id });

		if (!seededQuestion) {
			throw new Error(
				`Failed to seed assessment question ${question.sortOrder}.`,
			);
		}

		for (const [optionIndex, option] of optionLabels.entries()) {
			await db
				.insert(assessmentOptions)
				.values({
					questionId: seededQuestion.id,
					sortOrder: optionIndex + 1,
					label: option.label,
					value: option.value,
					scoreWeights: {
						[question.dimension]: option.score,
					},
				})
				.onConflictDoUpdate({
					target: [assessmentOptions.questionId, assessmentOptions.sortOrder],
					set: {
						label: option.label,
						value: option.value,
						scoreWeights: {
							[question.dimension]: option.score,
						},
						updatedAt,
					},
				});
		}
	}
}

try {
	await seed();
	console.log("Seed complete.");
} catch (error) {
	console.error(error);
	process.exitCode = 1;
} finally {
	await queryClient.end();
}
