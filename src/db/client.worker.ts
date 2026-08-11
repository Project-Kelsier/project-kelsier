import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getWorkerConnectionString, type WorkerDatabaseEnv } from "./client";
import * as schema from "./schema";

export function createWorkerDbClient(connectionString: string) {
	const queryClient = postgres(connectionString, {
		fetch_types: false,
		max: 5,
		prepare: true,
	});

	return drizzle(queryClient, { schema });
}

export function getDb(env: WorkerDatabaseEnv) {
	return createWorkerDbClient(getWorkerConnectionString(env));
}
