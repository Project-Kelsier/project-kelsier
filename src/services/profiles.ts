import { and, eq, isNull } from "drizzle-orm";
import { organisations, personalityProfiles } from "#/db/schema";
import type { OrganisationUserContext } from "./context";

const profileColumns = {
	id: personalityProfiles.id,
	organisationId: personalityProfiles.organisationId,
	userId: personalityProfiles.userId,
	traitScores: personalityProfiles.traitScores,
	metadata: personalityProfiles.metadata,
	createdAt: personalityProfiles.createdAt,
	updatedAt: personalityProfiles.updatedAt,
};

export async function getPersonalityProfileForUser(
	context: OrganisationUserContext,
	userId: string,
) {
	const [profile] = await context.db
		.select(profileColumns)
		.from(personalityProfiles)
		.innerJoin(
			organisations,
			eq(organisations.id, personalityProfiles.organisationId),
		)
		.where(
			and(
				eq(personalityProfiles.organisationId, context.organisationId),
				eq(personalityProfiles.userId, userId),
				isNull(organisations.deletedAt),
			),
		)
		.limit(1);

	return profile ?? null;
}
