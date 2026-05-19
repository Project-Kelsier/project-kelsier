import { and, eq } from "drizzle-orm";
import { aiInsights } from "#/db/schema";
import type { OrganisationUserContext } from "./context";

export async function listAiInsightsForOrganisation(
	context: OrganisationUserContext,
) {
	return context.db
		.select()
		.from(aiInsights)
		.where(eq(aiInsights.organisationId, context.organisationId));
}

export async function listAiInsightsForSource(
	context: OrganisationUserContext,
	sourceEntityId: string,
) {
	return context.db
		.select()
		.from(aiInsights)
		.where(
			and(
				eq(aiInsights.organisationId, context.organisationId),
				eq(aiInsights.sourceEntityId, sourceEntityId),
			),
		);
}
