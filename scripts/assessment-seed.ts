import { isDeepStrictEqual } from "node:util";
import { eq } from "drizzle-orm";
import type { DbClient } from "#/db/client.ts";
import {
	assessmentOptions,
	assessmentQuestions,
	assessmentVersions,
} from "#/db/schema/index.ts";

export type AssessmentSeed = {
	slug: string;
	title: string;
	description: string;
	questions: {
		dimension: string;
		prompt: string;
		required: boolean;
		sortOrder: number;
		options: {
			sortOrder: number;
			label: string;
			value: string;
			scoreWeights: Record<string, number>;
		}[];
	}[];
};

export async function seedAssessmentQuestionnaire(
	db: DbClient,
	definition: AssessmentSeed,
) {
	return db.transaction(async (transaction) => {
		// Insert the complete version atomically; concurrent seeds wait on the slug.
		// Existing versions are never edited, even before their first response.
		const [created] = await transaction
			.insert(assessmentVersions)
			.values({
				slug: definition.slug,
				title: definition.title,
				description: definition.description,
				status: "active",
			})
			.onConflictDoNothing({ target: assessmentVersions.slug })
			.returning({ id: assessmentVersions.id });
		if (created) {
			for (const question of definition.questions) {
				const { options, ...fields } = question;
				const [inserted] = await transaction
					.insert(assessmentQuestions)
					.values({ ...fields, versionId: created.id })
					.returning({ id: assessmentQuestions.id });
				if (!inserted || options.length === 0)
					throw new Error("Seed questions require options.");
				await transaction
					.insert(assessmentOptions)
					.values(
						options.map((option) => ({ ...option, questionId: inserted.id })),
					);
			}
			if (definition.questions.length === 0)
				throw new Error("Seed questionnaire requires questions.");
			return created.id;
		}

		const [existing] = await transaction
			.select()
			.from(assessmentVersions)
			.where(eq(assessmentVersions.slug, definition.slug))
			.limit(1);
		if (!existing) throw new Error("Seed questionnaire could not be loaded.");
		const questions = await transaction
			.select()
			.from(assessmentQuestions)
			.where(eq(assessmentQuestions.versionId, existing.id))
			.orderBy(assessmentQuestions.sortOrder);
		const options = await transaction
			.select({
				questionId: assessmentOptions.questionId,
				sortOrder: assessmentOptions.sortOrder,
				label: assessmentOptions.label,
				value: assessmentOptions.value,
				scoreWeights: assessmentOptions.scoreWeights,
			})
			.from(assessmentOptions)
			.innerJoin(
				assessmentQuestions,
				eq(assessmentOptions.questionId, assessmentQuestions.id),
			)
			.where(eq(assessmentQuestions.versionId, existing.id))
			.orderBy(assessmentOptions.sortOrder);
		const stored = {
			slug: existing.slug,
			title: existing.title,
			description: existing.description,
			questions: questions.map((question) => ({
				dimension: question.dimension,
				prompt: question.prompt,
				required: question.required,
				sortOrder: question.sortOrder,
				options: options
					.filter((option) => option.questionId === question.id)
					.map(({ questionId: _questionId, ...option }) => option),
			})),
		};
		if (!isDeepStrictEqual(stored, definition)) {
			throw new Error(
				"Seed content differs from the stored questionnaire. Create an explicit new assessment version; existing scoring inputs cannot be overwritten.",
			);
		}
		// Do not reactivate retired versions as a side effect of development startup.
		return existing.id;
	});
}
