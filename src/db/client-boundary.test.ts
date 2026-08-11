import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = join(process.cwd(), "src");
const nodeOnlyClientPath = join(sourceRoot, "db", "client.node.ts");
const workerClientPath = join(sourceRoot, "db", "client.worker.ts");
const nodeOnlyClientModulePath = normalize(
	join(sourceRoot, "db", "client.node"),
);
const moduleSpecifierExtensions = [
	"",
	".ts",
	".tsx",
	".js",
	".jsx",
	".mts",
	".cts",
];
const forbiddenRuntimePackages = new Set([
	"postgres",
	"drizzle-orm/postgres-js",
]);

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

function collectModuleSpecifiers(source: string): string[] {
	return Array.from(
		source.matchAll(/(?:from\s+|import\s*\(\s*)["'](?<specifier>[^"']+)["']/g),
		(match) => match.groups?.specifier,
	).filter((specifier): specifier is string => Boolean(specifier));
}

function isNodeOnlyClientSpecifier(filePath: string, specifier: string) {
	const aliasNodeOnlySpecifiers = moduleSpecifierExtensions.flatMap(
		(extension) => [
			`#/db/client.node${extension}`,
			`@/db/client.node${extension}`,
		],
	);

	if (aliasNodeOnlySpecifiers.includes(specifier)) {
		return true;
	}

	if (!specifier.startsWith(".")) {
		return false;
	}

	const resolvedSpecifier = normalize(resolve(dirname(filePath), specifier));

	return moduleSpecifierExtensions.some(
		(extension) =>
			resolvedSpecifier === `${nodeOnlyClientModulePath}${extension}`,
	);
}

describe("database runtime boundary", () => {
	it("keeps concrete database drivers inside the runtime clients", () => {
		const workerFacingFiles = listSourceFiles(sourceRoot).filter(
			(path) => path !== nodeOnlyClientPath && path !== workerClientPath,
		);

		const violations = workerFacingFiles
			.map((path) => ({
				path: relative(process.cwd(), path),
				source: readFileSync(path, "utf8"),
			}))
			.filter(({ path, source }) => {
				const moduleSpecifiers = collectModuleSpecifiers(source);

				return moduleSpecifiers.some(
					(specifier) =>
						forbiddenRuntimePackages.has(specifier) ||
						isNodeOnlyClientSpecifier(join(process.cwd(), path), specifier),
				);
			})
			.map(({ path }) => path);

		expect(violations).toEqual([]);
	});
});
