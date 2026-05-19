import type { DbClient } from "#/db/client";

export type AuthenticatedUserContext = {
	db: DbClient;
	userId: string;
};

export type OrganisationUserContext = AuthenticatedUserContext & {
	organisationId: string;
};
