import { and, eq } from "drizzle-orm";
import { db } from "#/db/client";
import { aiInsights } from "#/db/schema";
import type { OrganisationUserContext } from "./context";

export async function listAiInsightsForOrganisation(
	context: OrganisationUserContext,
) {
	return db
		.select()
		.from(aiInsights)
		.where(eq(aiInsights.organisationId, context.organisationId));
}

export async function listAiInsightsForSource(
	context: OrganisationUserContext,
	sourceEntityId: string,
) {
	return db
		.select()
		.from(aiInsights)
		.where(
			and(
				eq(aiInsights.organisationId, context.organisationId),
				eq(aiInsights.sourceEntityId, sourceEntityId),
			),
		);
}
