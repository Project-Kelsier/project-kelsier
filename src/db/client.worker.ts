import { drizzle } from "drizzle-orm/neon-http";
import { getWorkerConnectionString, type WorkerDatabaseEnv } from "./client";
import * as schema from "./schema";

const dbClients = new Map<string, ReturnType<typeof createWorkerDbClient>>();

export function createWorkerDbClient(connectionString: string) {
	return drizzle(connectionString, { schema });
}

export function getDb(env: WorkerDatabaseEnv) {
	const connectionString = getWorkerConnectionString(env);
	const existingClient = dbClients.get(connectionString);

	if (existingClient) {
		return existingClient;
	}

	const db = createWorkerDbClient(connectionString);
	dbClients.set(connectionString, db);

	return db;
}

export function clearWorkerDbClientCache() {
	dbClients.clear();
}
