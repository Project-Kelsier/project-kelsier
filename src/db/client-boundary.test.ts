import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = join(process.cwd(), "src");
const nodeOnlyClientPath = join(sourceRoot, "db", "client.node.ts");

function listSourceFiles(directory: string): string[] {
	return readdirSync(directory).flatMap((entry) => {
		const path = join(directory, entry);
		const stats = statSync(path);

		if (stats.isDirectory()) {
			return listSourceFiles(path);
		}

		if (!/\.(ts|tsx)$/.test(path) || /\.test\.(ts|tsx)$/.test(path)) {
			return [];
		}

		return [path];
	});
}

describe("database runtime boundary", () => {
	it("keeps postgres-js out of Worker-facing source modules", () => {
		const workerFacingFiles = listSourceFiles(sourceRoot).filter(
			(path) => path !== nodeOnlyClientPath,
		);

		const violations = workerFacingFiles
			.map((path) => ({
				path: relative(process.cwd(), path),
				source: readFileSync(path, "utf8"),
			}))
			.filter(({ source }) =>
				[
					/from\s+["']postgres["']/,
					/from\s+["']drizzle-orm\/postgres-js["']/,
					/["']#\/db\/client\.node["']/,
					/["']@\/db\/client\.node["']/,
					/["']\.\/client\.node["']/,
				].some((pattern) => pattern.test(source)),
			)
			.map(({ path }) => path);

		expect(violations).toEqual([]);
	});
});
