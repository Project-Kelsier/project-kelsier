import { and, eq, isNull } from "drizzle-orm";
import { db } from "#/db/client";
import { teamMembers, teams } from "#/db/schema";
import type { OrganisationUserContext } from "./context";

export async function listTeamsForOrganisation(
	context: OrganisationUserContext,
) {
	return db
		.select()
		.from(teams)
		.where(
			and(
				eq(teams.organisationId, context.organisationId),
				isNull(teams.deletedAt),
			),
		);
}

export async function getTeamBySlug(
	context: OrganisationUserContext,
	slug: string,
) {
	const [team] = await db
		.select()
		.from(teams)
		.where(
			and(
				eq(teams.organisationId, context.organisationId),
				eq(teams.slug, slug),
				isNull(teams.deletedAt),
			),
		)
		.limit(1);

	return team ?? null;
}

export async function listTeamMembers(
	context: OrganisationUserContext,
	teamId: string,
) {
	return db
		.select()
		.from(teamMembers)
		.where(
			and(
				eq(teamMembers.organisationId, context.organisationId),
				eq(teamMembers.teamId, teamId),
				isNull(teamMembers.deletedAt),
			),
		);
}
