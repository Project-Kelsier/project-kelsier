import type { getDb as getWorkerDb } from "./client.worker";

export type DatabaseEnv = {
	DATABASE_URL?: string;
	DATABASE_URL_POOLED?: string;
	USE_HYPERDRIVE?: boolean | string;
};

export type WorkerDatabaseEnv = {
	HYPERDRIVE?: Pick<Hyperdrive, "connectionString">;
};

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

export function getWorkerConnectionString(env: WorkerDatabaseEnv) {
	if (!env.HYPERDRIVE?.connectionString) {
		throw new Error("The HYPERDRIVE binding is required.");
	}

	return env.HYPERDRIVE.connectionString;
}

export type DbClient = ReturnType<typeof getWorkerDb>;
