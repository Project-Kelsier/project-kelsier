import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import * as schema from "./schema";

export type DatabaseEnv = {
	DATABASE_URL?: string;
	DATABASE_URL_POOLED?: string;
	USE_HYPERDRIVE?: boolean | string;
};

export type DbConnection = {
	db: ReturnType<typeof createDrizzleClient>;
	queryClient: Sql;
};

const connections = new WeakMap<DatabaseEnv, DbConnection>();

function createDrizzleClient(queryClient: Sql) {
	return drizzle(queryClient, { schema });
}

function shouldUseHyperdrive(value: DatabaseEnv["USE_HYPERDRIVE"]) {
	return value === true || value === "true";
}

function getConnectionString(env: DatabaseEnv) {
	const useHyperdrive = shouldUseHyperdrive(env.USE_HYPERDRIVE);
	const connectionString = useHyperdrive
		? env.DATABASE_URL_POOLED
		: env.DATABASE_URL;

	if (!connectionString) {
		throw new Error(
			useHyperdrive
				? "DATABASE_URL_POOLED is required when USE_HYPERDRIVE=true."
				: "DATABASE_URL is required.",
		);
	}

	return connectionString;
}

export function createDbConnection(connectionString: string): DbConnection {
	// Prepared statements are disabled for compatibility with pooled PostgreSQL
	// connections, including Cloudflare Hyperdrive-backed deployments.
	const queryClient = postgres(connectionString, {
		prepare: false,
	});

	return {
		db: createDrizzleClient(queryClient),
		queryClient,
	};
}

export function getDbConnection(env: DatabaseEnv): DbConnection {
	const existingConnection = connections.get(env);

	if (existingConnection) {
		return existingConnection;
	}

	const connection = createDbConnection(getConnectionString(env));
	connections.set(env, connection);

	return connection;
}

export function getDb(env: DatabaseEnv) {
	return getDbConnection(env).db;
}

export type DbClient = ReturnType<typeof getDb>;
