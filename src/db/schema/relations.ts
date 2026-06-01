import { relations } from "drizzle-orm";
import { aiInsights } from "./aiInsights";
import {
	assessmentAnswers,
	assessmentAttempts,
	assessmentOptions,
	assessmentQuestions,
	assessmentResults,
	assessmentVersions,
} from "./assessments";
import { organisationMembers, teamMembers } from "./memberships";
import { organisations, pilotRequests } from "./organisations";
import { personalityProfiles } from "./profiles";
import { teams } from "./teams";
import { users } from "./users";

export const usersRelations = relations(users, ({ many }) => ({
	organisationMemberships: many(organisationMembers),
	teamMemberships: many(teamMembers),
	assessmentAttempts: many(assessmentAttempts),
	assessmentResults: many(assessmentResults),
	personalityProfiles: many(personalityProfiles),
	aiInsights: many(aiInsights),
}));

export const organisationsRelations = relations(organisations, ({ many }) => ({
	teams: many(teams),
	organisationMembers: many(organisationMembers),
	teamMembers: many(teamMembers),
	assessmentAttempts: many(assessmentAttempts),
	assessmentAnswers: many(assessmentAnswers),
	assessmentResults: many(assessmentResults),
	personalityProfiles: many(personalityProfiles),
	pilotRequests: many(pilotRequests),
	aiInsights: many(aiInsights),
}));

export const pilotRequestsRelations = relations(pilotRequests, ({ one }) => ({
	organisation: one(organisations, {
		fields: [pilotRequests.organisationId],
		references: [organisations.id],
	}),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
	organisation: one(organisations, {
		fields: [teams.organisationId],
		references: [organisations.id],
	}),
	teamMembers: many(teamMembers),
	assessmentAttempts: many(assessmentAttempts),
	aiInsights: many(aiInsights),
}));

export const organisationMembersRelations = relations(
	organisationMembers,
	({ one }) => ({
		organisation: one(organisations, {
			fields: [organisationMembers.organisationId],
			references: [organisations.id],
		}),
		user: one(users, {
			fields: [organisationMembers.userId],
			references: [users.id],
		}),
	}),
);

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
	organisation: one(organisations, {
		fields: [teamMembers.organisationId],
		references: [organisations.id],
	}),
	team: one(teams, {
		fields: [teamMembers.teamId, teamMembers.organisationId],
		references: [teams.id, teams.organisationId],
	}),
	user: one(users, {
		fields: [teamMembers.userId],
		references: [users.id],
	}),
}));

export const assessmentVersionsRelations = relations(
	assessmentVersions,
	({ many }) => ({
		questions: many(assessmentQuestions),
		attempts: many(assessmentAttempts),
		results: many(assessmentResults),
	}),
);

export const assessmentQuestionsRelations = relations(
	assessmentQuestions,
	({ one, many }) => ({
		version: one(assessmentVersions, {
			fields: [assessmentQuestions.versionId],
			references: [assessmentVersions.id],
		}),
		options: many(assessmentOptions),
		answers: many(assessmentAnswers),
	}),
);

export const assessmentOptionsRelations = relations(
	assessmentOptions,
	({ one, many }) => ({
		question: one(assessmentQuestions, {
			fields: [assessmentOptions.questionId],
			references: [assessmentQuestions.id],
		}),
		answers: many(assessmentAnswers),
	}),
);

export const assessmentAttemptsRelations = relations(
	assessmentAttempts,
	({ one, many }) => ({
		organisation: one(organisations, {
			fields: [assessmentAttempts.organisationId],
			references: [organisations.id],
		}),
		team: one(teams, {
			fields: [assessmentAttempts.teamId, assessmentAttempts.organisationId],
			references: [teams.id, teams.organisationId],
		}),
		user: one(users, {
			fields: [assessmentAttempts.userId],
			references: [users.id],
		}),
		assessmentVersion: one(assessmentVersions, {
			fields: [assessmentAttempts.assessmentVersionId],
			references: [assessmentVersions.id],
		}),
		answers: many(assessmentAnswers),
		result: one(assessmentResults),
	}),
);

export const assessmentAnswersRelations = relations(
	assessmentAnswers,
	({ one }) => ({
		organisation: one(organisations, {
			fields: [assessmentAnswers.organisationId],
			references: [organisations.id],
		}),
		attempt: one(assessmentAttempts, {
			fields: [assessmentAnswers.attemptId],
			references: [assessmentAttempts.id],
		}),
		question: one(assessmentQuestions, {
			fields: [assessmentAnswers.questionId],
			references: [assessmentQuestions.id],
		}),
		option: one(assessmentOptions, {
			fields: [assessmentAnswers.optionId],
			references: [assessmentOptions.id],
		}),
	}),
);

export const assessmentResultsRelations = relations(
	assessmentResults,
	({ one }) => ({
		organisation: one(organisations, {
			fields: [assessmentResults.organisationId],
			references: [organisations.id],
		}),
		attempt: one(assessmentAttempts, {
			fields: [assessmentResults.attemptId],
			references: [assessmentAttempts.id],
		}),
		user: one(users, {
			fields: [assessmentResults.userId],
			references: [users.id],
		}),
		assessmentVersion: one(assessmentVersions, {
			fields: [assessmentResults.assessmentVersionId],
			references: [assessmentVersions.id],
		}),
	}),
);

export const personalityProfilesRelations = relations(
	personalityProfiles,
	({ one }) => ({
		organisation: one(organisations, {
			fields: [personalityProfiles.organisationId],
			references: [organisations.id],
		}),
		user: one(users, {
			fields: [personalityProfiles.userId],
			references: [users.id],
		}),
	}),
);

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
	organisation: one(organisations, {
		fields: [aiInsights.organisationId],
		references: [organisations.id],
	}),
	team: one(teams, {
		fields: [aiInsights.teamId, aiInsights.organisationId],
		references: [teams.id, teams.organisationId],
	}),
	user: one(users, {
		fields: [aiInsights.userId],
		references: [users.id],
	}),
}));
