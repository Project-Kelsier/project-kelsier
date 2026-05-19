import { and, eq } from "drizzle-orm";
import { db } from "#/db/client";
import { personalityProfiles } from "#/db/schema";
import type { OrganisationUserContext } from "./context";

export async function getPersonalityProfileForUser(
	context: OrganisationUserContext,
	userId: string,
) {
	const [profile] = await db
		.select()
		.from(personalityProfiles)
		.where(
			and(
				eq(personalityProfiles.organisationId, context.organisationId),
				eq(personalityProfiles.userId, userId),
			),
		)
		.limit(1);

	return profile ?? null;
}
