import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env", quiet: true });

export default defineConfig({
	schema: "./src/db/schema/index.ts",
	out: "./drizzle/migrations",
	dialect: "postgresql",
	dbCredentials: {
		url:
			process.env.DATABASE_URL ??
			"postgres://kelsier:kelsier@localhost:55432/kelsier_dev",
	},
	verbose: true,
	strict: true,
});
