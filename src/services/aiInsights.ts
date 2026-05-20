import { and, eq, isNull } from "drizzle-orm";
import { aiInsights, organisations } from "#/db/schema";
import type { OrganisationUserContext } from "./context";

const aiInsightColumns = {
	id: aiInsights.id,
	organisationId: aiInsights.organisationId,
	teamId: aiInsights.teamId,
	userId: aiInsights.userId,
	sourceEntityId: aiInsights.sourceEntityId,
	sourceEntityType: aiInsights.sourceEntityType,
	model: aiInsights.model,
	promptVersion: aiInsights.promptVersion,
	generatedAt: aiInsights.generatedAt,
	confidence: aiInsights.confidence,
	title: aiInsights.title,
	summary: aiInsights.summary,
	r2ObjectKey: aiInsights.r2ObjectKey,
	metadata: aiInsights.metadata,
	createdAt: aiInsights.createdAt,
	updatedAt: aiInsights.updatedAt,
};

export async function listAiInsightsForOrganisation(
	context: OrganisationUserContext,
) {
	return context.db
		.select(aiInsightColumns)
		.from(aiInsights)
		.innerJoin(organisations, eq(organisations.id, aiInsights.organisationId))
		.where(
			and(
				eq(aiInsights.organisationId, context.organisationId),
				isNull(organisations.deletedAt),
			),
		);
}

export async function listAiInsightsForSource(
	context: OrganisationUserContext,
	sourceEntityId: string,
) {
	return context.db
		.select(aiInsightColumns)
		.from(aiInsights)
		.innerJoin(organisations, eq(organisations.id, aiInsights.organisationId))
		.where(
			and(
				eq(aiInsights.organisationId, context.organisationId),
				eq(aiInsights.sourceEntityId, sourceEntityId),
				isNull(organisations.deletedAt),
			),
		);
}
