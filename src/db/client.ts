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

const connections = new Map<string, DbConnection>();

function createDrizzleClient(queryClient: Sql) {
	return drizzle(queryClient, { schema });
}

export function shouldUseHyperdrive(value: DatabaseEnv["USE_HYPERDRIVE"]) {
	return value === true || value === "true";
}

export function getConnectionString(env: DatabaseEnv) {
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
	const connectionString = getConnectionString(env);
	const existingConnection = connections.get(connectionString);

	if (existingConnection) {
		return existingConnection;
	}

	const connection = createDbConnection(connectionString);
	connections.set(connectionString, connection);

	return connection;
}

export async function closeDbConnections(env?: DatabaseEnv) {
	const entries = env
		? (() => {
				const connectionString = getConnectionString(env);
				return [[connectionString, connections.get(connectionString)] as const];
			})()
		: Array.from(connections.entries());

	await Promise.all(
		entries.map(async ([connectionString, connection]) => {
			if (!connection) {
				return;
			}

			await connection.queryClient.end();
			connections.delete(connectionString);
		}),
	);
}

export function getDb(env: DatabaseEnv) {
	return getDbConnection(env).db;
}

export type DbClient = ReturnType<typeof getDb>;
