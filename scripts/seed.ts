import "dotenv/config";
import { db, queryClient } from "#/db/client";
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

const DEMO_AUTH_USER_ID = "00000000-0000-4000-8000-000000000001";
// Dev-only fake Neon Auth user ID. Neon Auth owns real identity records.
const DEMO_USER_ID = "00000000-0000-4000-8000-000000000101";
const DEMO_ORGANISATION_ID = "00000000-0000-4000-8000-000000000201";
const DEMO_TEAM_ID = "00000000-0000-4000-8000-000000000202";
const KELSIER_CORE_VERSION_ID = "00000000-0000-4000-8000-000000000301";

const questions = [
	{
		id: "00000000-0000-4000-8000-000000001001",
		dimension: "clarity",
		sortOrder: 1,
		prompt: "I understand what my team needs from me this week.",
	},
	{
		id: "00000000-0000-4000-8000-000000001002",
		dimension: "candour",
		sortOrder: 2,
		prompt: "Important concerns are raised directly and respectfully.",
	},
	{
		id: "00000000-0000-4000-8000-000000001003",
		dimension: "listening",
		sortOrder: 3,
		prompt: "People adjust their views when they hear useful new information.",
	},
	{
		id: "00000000-0000-4000-8000-000000001004",
		dimension: "trust",
		sortOrder: 4,
		prompt: "I can rely on teammates to follow through on commitments.",
	},
	{
		id: "00000000-0000-4000-8000-000000001005",
		dimension: "conflict",
		sortOrder: 5,
		prompt: "Disagreements help the team make better decisions.",
	},
	{
		id: "00000000-0000-4000-8000-000000001006",
		dimension: "decision_making",
		sortOrder: 6,
		prompt: "Decision owners and next steps are clear after discussions.",
	},
	{
		id: "00000000-0000-4000-8000-000000001007",
		dimension: "energy",
		sortOrder: 7,
		prompt: "The team's communication leaves me with energy to do good work.",
	},
	{
		id: "00000000-0000-4000-8000-000000001008",
		dimension: "support",
		sortOrder: 8,
		prompt: "When someone is blocked, help arrives early enough to matter.",
	},
	{
		id: "00000000-0000-4000-8000-000000001009",
		dimension: "accountability",
		sortOrder: 9,
		prompt: "The team notices and resolves missed commitments constructively.",
	},
	{
		id: "00000000-0000-4000-8000-000000001010",
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

	await db
		.insert(users)
		.values({
			id: DEMO_USER_ID,
			authUserId: DEMO_AUTH_USER_ID,
		})
		.onConflictDoUpdate({
			target: users.authUserId,
			set: {
				updatedAt,
			},
		});

	await db
		.insert(organisations)
		.values({
			id: DEMO_ORGANISATION_ID,
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
		});

	await db
		.insert(organisationMembers)
		.values({
			organisationId: DEMO_ORGANISATION_ID,
			userId: DEMO_USER_ID,
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
		.insert(teams)
		.values({
			id: DEMO_TEAM_ID,
			organisationId: DEMO_ORGANISATION_ID,
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
		});

	await db
		.insert(teamMembers)
		.values({
			organisationId: DEMO_ORGANISATION_ID,
			teamId: DEMO_TEAM_ID,
			userId: DEMO_USER_ID,
			role: "lead",
		})
		.onConflictDoUpdate({
			target: [teamMembers.teamId, teamMembers.userId],
			set: {
				organisationId: DEMO_ORGANISATION_ID,
				role: "lead",
				deletedAt: null,
				updatedAt,
			},
		});

	await db
		.insert(assessmentVersions)
		.values({
			id: KELSIER_CORE_VERSION_ID,
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
		});

	for (const question of questions) {
		await db
			.insert(assessmentQuestions)
			.values({
				id: question.id,
				versionId: KELSIER_CORE_VERSION_ID,
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
			});

		for (const [optionIndex, option] of optionLabels.entries()) {
			await db
				.insert(assessmentOptions)
				.values({
					questionId: question.id,
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
	await queryClient.end();
	console.log("Seed complete.");
} catch (error) {
	await queryClient.end();
	console.error(error);
	process.exitCode = 1;
}
