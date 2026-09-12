import { spawnSync } from "node:child_process";
import { config } from "dotenv";

const LOCAL_DATABASE_URL =
	"postgres://kelsier:kelsier@localhost:55432/kelsier_dev";

config({ path: ".env", quiet: true });

const databaseUrl = process.env.DATABASE_URL ?? LOCAL_DATABASE_URL;
const pnpmCli = process.env.npm_execpath;

if (!isApprovedLocalDatabase(databaseUrl)) {
	console.error(
		"\nRefusing to prepare a non-local database. Set DATABASE_URL to the Docker PostgreSQL instance on localhost:55432 before running pnpm dev.\n",
	);
	process.exit(1);
}

console.log("\nPreparing local development...");

if (!pnpmCli) {
	console.error("\nRun this setup through pnpm dev.\n");
	process.exit(1);
}

run("docker", ["compose", "up", "-d", "--wait", "postgres"], {
	failureMessage:
		"Docker PostgreSQL could not start. Confirm Docker Desktop is running, then run pnpm dev again.",
	missingCommandMessage:
		"Docker is unavailable. Start Docker Desktop, wait until it is ready, and run pnpm dev again.",
	quiet: true,
	successMessage: "PostgreSQL is healthy",
	windowsExecutable: "docker.exe",
});
run(process.execPath, [pnpmCli, "db:migrate"], {
	quiet: true,
	successMessage: "Migrations are applied",
});
run(process.execPath, [pnpmCli, "db:seed"], {
	quiet: true,
	successMessage: "Seed data is ready",
});

console.log("\nLocal database ready. Starting Kelsier...\n");

function isApprovedLocalDatabase(value) {
	try {
		const url = new URL(value);
		return (
			(url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
			url.port === "55432" &&
			url.pathname === "/kelsier_dev"
		);
	} catch {
		return false;
	}
}

function run(command, args, options = {}) {
	const executable =
		process.platform === "win32"
			? (options.windowsExecutable ?? command)
			: command;
	const result = spawnSync(executable, args, {
		encoding: options.quiet ? "utf8" : undefined,
		stdio: options.quiet ? "pipe" : "inherit",
		shell: false,
	});

	if (result.error?.code === "ENOENT") {
		console.error(
			`\n${options.missingCommandMessage ?? `${command} is unavailable.`}\n`,
		);
		process.exit(1);
	}

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		if (options.quiet) {
			const failureOutput = [result.stdout, result.stderr]
				.filter(Boolean)
				.join("\n")
				.trim();
			if (failureOutput) {
				console.error(`\n${failureOutput}`);
			}
		}
		if (options.failureMessage) {
			console.error(`\n${options.failureMessage}\n`);
		}
		process.exit(result.status ?? 1);
	}

	if (options.successMessage) {
		console.log(`  ✓ ${options.successMessage}`);
	}
}
