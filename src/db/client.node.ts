import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";
import {
	type DatabaseEnv,
	getConnectionString,
	shouldUseHyperdrive,
} from "./client";
import * as schema from "./schema";

export type { DatabaseEnv };
export { getConnectionString, shouldUseHyperdrive };

export type NodeDbConnection = {
	db: ReturnType<typeof createDrizzleClient>;
	queryClient: Sql;
};

const connections = new Map<string, NodeDbConnection>();

function createDrizzleClient(queryClient: Sql) {
	return drizzle(queryClient, { schema });
}

export function createDbConnection(connectionString: string): NodeDbConnection {
	// Prepared statements are disabled for compatibility with pooled PostgreSQL
	// connections used by local scripts and migration tooling.
	const queryClient = postgres(connectionString, {
		prepare: false,
	});

	return {
		db: createDrizzleClient(queryClient),
		queryClient,
	};
}

export function getDbConnection(env: DatabaseEnv): NodeDbConnection {
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
