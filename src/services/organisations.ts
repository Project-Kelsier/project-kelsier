import { and, eq, isNull } from "drizzle-orm";
import {
	organisationMembers,
	organisations,
	type PilotRequest,
	pilotRequests,
} from "#/db/schema";
import type {
	AuthenticatedUserContext,
	OrganisationUserContext,
} from "./context";

export async function listOrganisationsForUser(
	context: AuthenticatedUserContext,
) {
	return context.db
		.select({ organisation: organisations })
		.from(organisationMembers)
		.innerJoin(
			organisations,
			eq(organisations.id, organisationMembers.organisationId),
		)
		.where(
			and(
				eq(organisationMembers.userId, context.userId),
				isNull(organisationMembers.deletedAt),
				isNull(organisations.deletedAt),
			),
		);
}

export async function getOrganisationBySlug(
	context: OrganisationUserContext,
	slug: string,
) {
	const [organisation] = await context.db
		.select()
		.from(organisations)
		.where(
			and(
				eq(organisations.id, context.organisationId),
				eq(organisations.slug, slug),
				isNull(organisations.deletedAt),
			),
		)
		.limit(1);

	return organisation ?? null;
}

export async function createPilotRequest(
	context: AuthenticatedUserContext,
	input: {
		contactName: string;
		contactEmail: string;
		companyName: string;
		notes?: string;
	},
): Promise<PilotRequest | null> {
	const [pilotRequest] = await context.db
		.insert(pilotRequests)
		.values(input)
		.returning();

	return pilotRequest ?? null;
}
