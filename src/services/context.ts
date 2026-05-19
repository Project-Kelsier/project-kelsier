export type AuthenticatedUserContext = {
	userId: string;
};

export type OrganisationUserContext = AuthenticatedUserContext & {
	organisationId: string;
};
