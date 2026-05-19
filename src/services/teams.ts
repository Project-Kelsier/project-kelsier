import { and, eq, isNull } from "drizzle-orm";
import { organisations, teamMembers, teams } from "#/db/schema";
import type { OrganisationUserContext } from "./context";

const teamColumns = {
	id: teams.id,
	organisationId: teams.organisationId,
	slug: teams.slug,
	name: teams.name,
	status: teams.status,
	createdAt: teams.createdAt,
	updatedAt: teams.updatedAt,
	deletedAt: teams.deletedAt,
};

export async function listTeamsForOrganisation(
	context: OrganisationUserContext,
) {
	return context.db
		.select(teamColumns)
		.from(teams)
		.innerJoin(organisations, eq(organisations.id, teams.organisationId))
		.where(
			and(
				eq(teams.organisationId, context.organisationId),
				isNull(teams.deletedAt),
				isNull(organisations.deletedAt),
			),
		);
}

export async function getTeamBySlug(
	context: OrganisationUserContext,
	slug: string,
) {
	const [team] = await context.db
		.select(teamColumns)
		.from(teams)
		.innerJoin(organisations, eq(organisations.id, teams.organisationId))
		.where(
			and(
				eq(teams.organisationId, context.organisationId),
				eq(teams.slug, slug),
				isNull(teams.deletedAt),
				isNull(organisations.deletedAt),
			),
		)
		.limit(1);

	return team ?? null;
}

export async function listTeamMembers(
	context: OrganisationUserContext,
	teamId: string,
) {
	return context.db
		.select({ teamMember: teamMembers })
		.from(teamMembers)
		.innerJoin(teams, eq(teams.id, teamMembers.teamId))
		.innerJoin(organisations, eq(organisations.id, teams.organisationId))
		.where(
			and(
				eq(teamMembers.organisationId, context.organisationId),
				eq(teamMembers.teamId, teamId),
				isNull(teamMembers.deletedAt),
				eq(teams.organisationId, context.organisationId),
				isNull(teams.deletedAt),
				isNull(organisations.deletedAt),
			),
		);
}
