import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const useHyperdrive = process.env.USE_HYPERDRIVE === "true";

const connectionString = useHyperdrive
	? process.env.DATABASE_URL_POOLED
	: process.env.DATABASE_URL;

if (!connectionString) {
	throw new Error(
		useHyperdrive
			? "DATABASE_URL_POOLED is required when USE_HYPERDRIVE=true."
			: "DATABASE_URL is required.",
	);
}

// Hyperdrive is represented as a pooled PostgreSQL connection string so local
// development can use direct Neon without Cloudflare-specific runtime setup.
export const queryClient = postgres(connectionString, {
	prepare: false,
});

export const db = drizzle(queryClient, { schema });

export type DbClient = typeof db;
