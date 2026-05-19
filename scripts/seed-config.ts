import type { DatabaseEnv } from "#/db/client";

function shouldUseHyperdrive(value: DatabaseEnv["USE_HYPERDRIVE"]) {
	return value === true || value === "true";
}

export type SeedEnv = DatabaseEnv & {
	ALLOW_SEED?: string;
};

export function getSeedDatabaseUrl(env: DatabaseEnv) {
	const useHyperdrive = shouldUseHyperdrive(env.USE_HYPERDRIVE);
	const databaseUrl = useHyperdrive
		? env.DATABASE_URL_POOLED
		: env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error(
			useHyperdrive
				? "DATABASE_URL_POOLED is required when USE_HYPERDRIVE=true."
				: "DATABASE_URL is required.",
		);
	}

	return databaseUrl;
}

export function isLocalSeedDatabase(databaseUrl: string) {
	const url = new URL(databaseUrl);

	return (
		(url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
		url.port === "55432" &&
		url.pathname === "/kelsier_dev"
	);
}

export function assertSeedTargetIsAllowed(databaseUrl: string, env: SeedEnv) {
	if (env.ALLOW_SEED === "true" || isLocalSeedDatabase(databaseUrl)) {
		return;
	}

	throw new Error(
		"Refusing to seed a non-local database. Set DATABASE_URL to postgres://kelsier:kelsier@localhost:55432/kelsier_dev or set ALLOW_SEED=true to opt in explicitly.",
	);
}
