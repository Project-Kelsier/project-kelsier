import { readFileSync } from "node:fs";

const packageJson = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version?: string };

if (typeof packageJson.version !== "string" || packageJson.version.trim() === "") {
	throw new Error(
		'Invalid package.json: expected a non-empty string "version" field.',
	);
}

const appVersion = packageJson.version;

export const appVersionDefine = {
	__APP_VERSION__: JSON.stringify(appVersion),
};
