import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const releaseRelevantPatterns = [
	/^src\//,
	/^public\//,
	/^e2e\//,
	/^scripts\//,
	/^\.github\/workflows\//,
	/^docs\/security-hardening\.md$/,
	/^AGENTS\.md$/,
	/^CONTRIBUTING\.md$/,
	/^README\.md$/,
	/^VERSIONING\.md$/,
	/^package\.json$/,
	/^pnpm-lock\.yaml$/,
	/^pnpm-workspace\.yaml$/,
	/^biome\.json$/,
	/^playwright\.config\.ts$/,
	/^tsconfig\.json$/,
	/^vite\.config\.ts$/,
	/^vitest\.config\.ts$/,
	/^wrangler\.jsonc$/,
	/^worker-configuration\.d\.ts$/,
];

const ignoredForRequirementPatterns = [/^CHANGELOG\.md$/];

function git(args) {
	return execFileSync("git", ["-c", "core.autocrlf=false", ...args], {
		encoding: "utf8",
	}).trim();
}

function normalizePath(path) {
	return path.replaceAll("\\", "/");
}

function resolveBaseRef() {
	if (process.env.VERSION_CHECK_BASE_REF) {
		return process.env.VERSION_CHECK_BASE_REF;
	}

	if (process.env.GITHUB_BASE_REF) {
		return `origin/${process.env.GITHUB_BASE_REF}`;
	}

	return "origin/main";
}

function mergeBase(baseRef) {
	try {
		return git(["merge-base", baseRef, "HEAD"]);
	} catch {
		throw new Error(
			`Unable to resolve merge base with ${baseRef}. Fetch the base branch first, or set VERSION_CHECK_BASE_REF to a local ref.`,
		);
	}
}

function changedFiles(baseSha) {
	const committed = git(["diff", "--name-only", `${baseSha}...HEAD`]);
	const workingTree = git(["diff", "--name-only"]);
	const staged = git(["diff", "--name-only", "--cached"]);
	const untracked = git(["ls-files", "--others", "--exclude-standard"]);
	const files = new Set(
		[committed, workingTree, staged, untracked]
			.filter(Boolean)
			.flatMap((output) => output.split(/\r?\n/).map(normalizePath)),
	);

	return [...files].sort();
}

function isReleaseRelevant(file) {
	if (ignoredForRequirementPatterns.some((pattern) => pattern.test(file))) {
		return false;
	}

	return releaseRelevantPatterns.some((pattern) => pattern.test(file));
}

function readJsonAtRef(ref, file) {
	return JSON.parse(git(["show", `${ref}:${file}`]));
}

function readJsonFile(file) {
	return JSON.parse(readFileSync(file, "utf8"));
}

function parseSemver(version) {
	const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

	if (!match) {
		throw new Error(`Invalid release version: ${version}. Use x.y.z format.`);
	}

	return match.slice(1, 4).map(Number);
}

function compareSemver(a, b) {
	const left = parseSemver(a);
	const right = parseSemver(b);

	for (let index = 0; index < left.length; index += 1) {
		if (left[index] > right[index]) {
			return 1;
		}

		if (left[index] < right[index]) {
			return -1;
		}
	}

	return 0;
}

function main() {
	const baseRef = resolveBaseRef();
	const baseSha = mergeBase(baseRef);
	const files = changedFiles(baseSha);
	const releaseRelevantFiles = files.filter(isReleaseRelevant);

	if (releaseRelevantFiles.length === 0) {
		console.log(
			"No release-relevant files changed; version metadata is not required.",
		);
		return;
	}

	const changed = new Set(files);
	const failures = [];

	if (!changed.has("CHANGELOG.md")) {
		failures.push("CHANGELOG.md must be updated.");
	}

	if (!changed.has("package.json")) {
		failures.push("package.json version must be updated.");
	} else {
		const baseVersion = readJsonAtRef(baseSha, "package.json").version;
		const currentVersion = readJsonFile("package.json").version;

		if (compareSemver(currentVersion, baseVersion) <= 0) {
			failures.push(
				`package.json version must increase from ${baseVersion}; found ${currentVersion}.`,
			);
		}
	}

	if (failures.length > 0) {
		console.error("Release-relevant files changed:");
		for (const file of releaseRelevantFiles) {
			console.error(`- ${file}`);
		}

		console.error("");
		for (const failure of failures) {
			console.error(failure);
		}

		process.exit(1);
	}

	console.log("Version metadata check passed.");
}

try {
	main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
