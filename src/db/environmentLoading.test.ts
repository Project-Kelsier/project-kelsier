// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../../", import.meta.url));
const localDatabase = "postgres://kelsier:kelsier@localhost:55432/kelsier_dev";
const hostedDatabase = "postgres://fixture:synthetic@database.invalid/example";
const moduleUrl = (path: string) => JSON.stringify(pathToFileURL(path).href);
let directory: string;

beforeEach(() => {
	directory = mkdtempSync(join(tmpdir(), "kelsier env test "));
	writeFileSync(join(directory, "activity.jsonl"), "");
	// Block real subprocesses and network access even if a safety guard regresses.
	writeFileSync(
		join(directory, "isolate.cjs"),
		`const { appendFileSync } = require('node:fs');
const { syncBuiltinESMExports } = require('node:module');
const record = value => appendFileSync(${JSON.stringify(join(directory, "activity.jsonl"))}, JSON.stringify(value) + '\\n');
require('node:child_process').spawnSync = (command, args) => {
  record({ kind: 'process', command, args });
  return { status: 0, stdout: '', stderr: '' };
};
require('node:net').Socket.prototype.connect = function (...args) {
  const options = Array.isArray(args[0]) ? args[0][0] : args[0];
  // tsx probes local IPC pipes; block those too, but record only TCP attempts.
  const ipc = options?.path || (typeof options === 'string' && !/^\\d+$/.test(options));
  if (!ipc) record({ kind: 'network' });
  throw new Error('Network disabled in environment loading test');
};
syncBuiltinESMExports();
`,
	);
});

afterEach(() => {
	// Only remove the unique fixture directory created by this test.
	if (
		dirname(directory) !== tmpdir() ||
		!basename(directory).startsWith("kelsier env test ")
	) {
		throw new Error("Unexpected environment fixture path");
	}
	rmSync(directory, { recursive: true, force: true });
});

function run(source: string, variables: Record<string, string> = {}) {
	const script = join(directory, "probe.mjs");
	writeFileSync(script, source);
	// Do not inherit developer credentials, NODE_OPTIONS, or dotenv overrides.
	const env: Record<string, string | undefined> = {};
	for (const name of ["PATH", "SystemRoot", "WINDIR", "TEMP", "TMP"]) {
		if (process.env[name]) env[name] = process.env[name];
	}
	return spawnSync(
		process.execPath,
		[
			"--require",
			join(directory, "isolate.cjs"),
			"--import",
			pathToFileURL(require.resolve("tsx")).href,
			script,
		],
		{
			cwd: directory,
			// Wrangler's ambient ProcessEnv requires app bindings; these probes
			// intentionally omit them to test missing and file-loaded values.
			env: {
				...env,
				TSX_TSCONFIG_PATH: join(root, "tsconfig.json"),
				...variables,
			} as unknown as NodeJS.ProcessEnv,
			encoding: "utf8",
			timeout: 10_000,
		},
	);
}

function activity() {
	return readFileSync(join(directory, "activity.jsonl"), "utf8")
		.trim()
		.split("\n")
		.filter(Boolean)
		.map((line) => JSON.parse(line));
}

describe("environment loading at script boundaries", () => {
	it.each(["named", "side-effect"])(
		"preserves inherited values and parses file values with %s loading",
		(mode) => {
			writeFileSync(
				join(directory, ".env"),
				[
					"PRESERVED=file-value",
					"EMPTY=file-value",
					"MISSING=from-file # comment",
					'QUOTED="value # retained"',
					'MULTILINE="first\\nsecond"',
					"FILE_EMPTY=",
				].join("\r\n"),
			);
			const load =
				mode === "named"
					? `import { config } from ${moduleUrl(require.resolve("dotenv"))}; config({ path: '.env', quiet: true });`
					: `import ${moduleUrl(require.resolve("dotenv/config"))};`;
			const result = run(
				`${load}
console.log(JSON.stringify(Object.fromEntries(['PRESERVED', 'EMPTY', 'MISSING', 'QUOTED', 'MULTILINE', 'FILE_EMPTY'].map(key => [key, process.env[key]]))));`,
				{ PRESERVED: "inherited", EMPTY: "" },
			);
			expect(result.error).toBeUndefined();
			expect(result.status, result.stderr).toBe(0);
			expect(result.stdout.trim().split("\n")).toHaveLength(1);
			expect(JSON.parse(result.stdout.trim().split("\n").at(-1) ?? "")).toEqual(
				{
					PRESERVED: "inherited",
					EMPTY: "",
					MISSING: "from-file",
					QUOTED: "value # retained",
					MULTILINE: "first\nsecond",
					FILE_EMPTY: "",
				},
			);
			expect(result.stderr).toBe("");
			expect(activity()).toEqual([]);
		},
	);

	it("keeps missing-file errors nonfatal and quiet for explicit config", () => {
		const result = run(
			`import { config } from ${moduleUrl(require.resolve("dotenv"))};
const result = config({ path: 'missing.env', quiet: true });
console.log(JSON.stringify({ code: result.error?.code, value: process.env.PRESERVED }));`,
			{
				PRESERVED: "inherited",
			},
		);
		expect(result.status, result.stderr).toBe(0);
		expect(JSON.parse(result.stdout)).toEqual({
			code: "ENOENT",
			value: "inherited",
		});
		expect(result.stderr).toBe("");
	});

	it("loads the real Drizzle config without overriding CI credentials or logging them", () => {
		writeFileSync(join(directory, ".env"), `DATABASE_URL=${hostedDatabase}`);
		const result = run(
			`import config from ${moduleUrl(join(root, "drizzle.config.ts"))}; console.log(JSON.stringify(config.dbCredentials.url));`,
			{ DATABASE_URL: localDatabase },
		);
		expect(result.status, result.stderr).toBe(0);
		expect(JSON.parse(result.stdout)).toBe(localDatabase);
		expect(result.stderr).toBe("");
		expect(activity()).toEqual([]);
	});

	it.each([hostedDatabase, "malformed-url", ""])(
		"refuses development preparation before subprocess activity for %j",
		(databaseUrl) => {
			writeFileSync(join(directory, ".env"), `DATABASE_URL=${localDatabase}`);
			const result = run(
				`import ${moduleUrl(join(root, "scripts/prepare-dev.mjs"))};`,
				{
					DATABASE_URL: databaseUrl,
					npm_execpath: "synthetic-pnpm-cli",
				},
			);
			expect(result.status).toBe(1);
			expect(result.stderr).toContain(
				"Refusing to prepare a non-local database",
			);
			expect(result.stdout).toBe("");
			expect(activity()).toEqual([]);
		},
	);

	it.each([
		{
			cli: "synthetic-pnpm.cjs",
			executable: process.execPath,
			prefix: ["synthetic-pnpm.cjs"],
		},
		{ cli: "synthetic-pnpm.exe", executable: "synthetic-pnpm.exe", prefix: [] },
		{ cli: "synthetic-pnpm", executable: "synthetic-pnpm", prefix: [] },
	])(
		"prepares Docker, migrations and seed in order using $cli",
		({ cli, executable, prefix }) => {
			writeFileSync(join(directory, ".env"), `DATABASE_URL=${localDatabase}`);
			const result = run(
				`import ${moduleUrl(join(root, "scripts/prepare-dev.mjs"))};`,
				{
					npm_execpath: cli,
				},
			);
			expect(result.status, result.stderr).toBe(0);
			expect(activity()).toEqual([
				{
					kind: "process",
					command: process.platform === "win32" ? "docker.exe" : "docker",
					args: ["compose", "up", "-d", "--wait", "postgres"],
				},
				{
					kind: "process",
					command: executable,
					args: [...prefix, "db:migrate"],
				},
				{ kind: "process", command: executable, args: [...prefix, "db:seed"] },
			]);
			expect(result.stderr).toBe("");
		},
	);

	it("the real seed entrypoint rejects a hosted file target before connecting", () => {
		writeFileSync(join(directory, ".env"), `DATABASE_URL=${hostedDatabase}`);
		const result = run(`import ${moduleUrl(join(root, "scripts/seed.ts"))};`);
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain("Refusing to seed a non-local database");
		expect(result.stderr).not.toContain(hostedDatabase);
		expect(activity()).toEqual([]);
	});
});
