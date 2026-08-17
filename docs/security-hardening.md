# Security Hardening

This document records Project Kelsier's baseline security posture for dependency management, GitHub Actions, releases, and incident response. Keep controls practical, reviewable, and proportional to an early-stage OSS SaaS project.

## Baseline

The repository should preserve these defaults unless a reviewed change explicitly explains why they need to move:

- Pin the project package manager in `package.json` `packageManager`.
- Use `pnpm install --frozen-lockfile --ignore-scripts` in CI.
- Run `pnpm audit signatures` after dependency installation.
- Keep dependency build-script approvals in `pnpm-workspace.yaml` `allowBuilds`.
- Keep `engineStrict` and `strictDepBuilds` in `pnpm-workspace.yaml`.
- Pin direct `@tanstack/*` dependencies to exact versions until maintainers intentionally relax that policy.
- Pin third-party GitHub Actions to full commit SHAs.
- Keep top-level GitHub Actions permissions minimal, usually `contents: read`.
- Do not let untrusted pull requests save dependency caches used by trusted jobs.
- Do not grant `id-token: write` to CI jobs that install or execute pull-request-controlled code.

## Supply-Chain Controls

### pnpm

Project Kelsier uses pnpm through the `packageManager` field in `package.json`. When updating pnpm:

- Review the pnpm release notes and migration guide.
- Choose a reviewed stable patch release.
- Include Corepack's integrity suffix in `packageManager`.
- Regenerate `pnpm-lock.yaml` only when required.
- Run the validation checklist in this document.

pnpm v11 reads workspace install policy from `pnpm-workspace.yaml`, not from `package.json#pnpm` or non-registry `.npmrc` settings. Keep `allowBuilds`, `engineStrict`, and `strictDepBuilds` there.

### Install Scripts

CI installs dependencies with `--ignore-scripts`. This prevents dependency lifecycle scripts from running during install.

Packages that legitimately require build scripts must be explicitly reviewed and listed in `pnpm-workspace.yaml` `allowBuilds`. Do not add `pnpm approve-builds` to CI; use it locally only as a review helper, then commit the explicit allow-list decision.

### Signature Audit

CI runs `pnpm audit signatures` after install. This verifies registry ECDSA signatures for packages when the registry publishes signing keys.

Signature auditing helps detect tampered package metadata or tarballs that do not match registry provenance. It does not replace vulnerability scanning, exact version pins, lockfile review, install-script restrictions, or maintainer judgment.

If a package registry does not publish signing keys, pnpm may skip signature verification for packages from that registry. Document skipped registries before treating the audit result as equivalent to a fully signed dependency graph.

### Temporary Overrides

pnpm overrides are an incident response tool, not a permanent aesthetic layer. Use them only when a reviewed advisory or compatibility issue requires transitive dependency control.

Temporary overrides must:

- Live in `pnpm-workspace.yaml`.
- Include a clear reason in the PR description or nearby documentation.
- Have an explicit removal condition.
- Be removed once clean upstream versions are available and validation passes.

Prefer clean direct upgrades and a regenerated lockfile over long-lived transitive pins.

## Dependency Updates

Normal dependency updates should keep PRs small and grouped by ecosystem. Separate npm package updates from GitHub Actions updates.

Security updates may bypass normal dependency timing controls only when the PR explains why the newer version materially reduces risk. If pnpm's release-age cooldown is bypassed for a security update, do it only as a local command option. Do not commit a cooldown bypass as repository configuration.

If pnpm rejects an update because the release is inside the cooldown window, first look for the newest already-aged version that satisfies the same compatibility range. Treat committed cooldown bypasses, broad transitive overrides, and audit-only fixes that break tests as failed dependency maintenance.

When fixing advisories through `pnpm-workspace.yaml` overrides, prefer the narrowest compatible override and verify the parent package still works. Some packages import internal files from dependencies, so forcing a new major version can pass audit while breaking runtime or tests. If no compatible patched version exists, document the residual advisory and upstream blocker instead of hiding it with an unsafe override.

### Resolved Sharp Advisory

GHSA-f88m-g3jw-g9cj previously remained in development tooling because Miniflare pinned Sharp 0.34.5. The current dependency graph resolves Miniflare with Sharp 0.35.2, so that residual advisory and its compatibility exception no longer apply. Do not add a Sharp override unless a future reviewed dependency graph creates a concrete need.

The workspace also carries narrow patch-level overrides for current transitive advisories where the parent dependency graph has not yet adopted the patched release. Their advisory IDs, exact versions, and parent paths are documented beside the overrides in `pnpm-workspace.yaml`. Remove each override as soon as normal parent resolution selects the same or a newer compatible patched version.

For dependency maintenance PRs, run:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm audit signatures
pnpm audit --audit-level high
pnpm version:check
pnpm check
pnpm typecheck
pnpm test
pnpm build
```

For meaningful UI, routing, or runtime changes, also run:

```bash
pnpm coverage
pnpm test:e2e
```

## GitHub Actions

- Default workflow permissions should be `contents: read`.
- Add job-level permissions only for steps that demonstrably need them.
- Do not use `pull_request_target` for workflows that check out, install, build, test, or execute PR-controlled code.
- Forked PR workflows must not receive deployment secrets, publish tokens, Cloudflare credentials, npm credentials, or `id-token: write`.
- Privileged deployment and publishing workflows should run only on protected branches, protected environments, or explicit maintainer approval.
- Add `github.repository_owner` and branch guards to privileged jobs when a workflow could run in forks or mirrors.
- Pin third-party actions to full commit SHAs. Keep a comment with the readable version tag for maintenance.

SHA pinning prevents a moved tag from changing executed workflow code. Version tags are easier to update but trust the action maintainer and GitHub tag state at every run. For this project, use SHA pinning for CI and deployment workflows, then update pins through reviewed maintenance PRs.

## Cache Security

- Do not allow untrusted PRs to save caches that privileged workflows later restore.
- Prefer separate restore and save steps.
- Allow cache saves only from trusted `push` runs on `refs/heads/main` or another protected branch.
- Treat dependency stores as executable inputs. A poisoned package store can be equivalent to code execution.
- If a privileged workflow is suspected of restoring a poisoned cache, delete repository Actions caches before rerunning release or deploy jobs.

## OIDC And Deployment

- Keep CI and deployment workflows separate.
- CI should not request `id-token: write`.
- Deployment workflows should request `id-token: write` only in the deploy job and only after branch, owner, and environment checks.
- Cloudflare deployment should use the minimum viable credential shape. Prefer OIDC or scoped Cloudflare API tokens over broad account tokens where supported.
- Store Cloudflare credentials only as GitHub environment secrets with required reviewer approval for production.
- Never expose Cloudflare, Neon, npm, GitHub publishing, or database credentials to pull request workflows.

## Database Secrets

- Local development should use Docker PostgreSQL with the non-secret development credentials documented in [`.env.example`](../.env.example).
- Keep Neon connection strings out of committed files. Use local untracked env files, password managers, or protected hosting secrets for hosted database credentials.
- Before running `pnpm db:migrate`, `pnpm db:seed`, destructive resets, or ad hoc database scripts, confirm `DATABASE_URL` points at the intended target.
- Do not run seed data or destructive local reset workflows against Neon unless the operation is explicitly planned and reviewed.

## Branch Protection

Require branch protection on `main`:

- Require pull requests before merging.
- Require at least one maintainer review.
- Require status checks for CI.
- Require branches to be up to date before merge when practical.
- Block force pushes and branch deletion.
- Restrict who can bypass protection.
- Require conversation resolution.

## CODEOWNERS

Add CODEOWNERS before the repo becomes broadly active. Recommended initial ownership:

- `.github/workflows/*`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `wrangler.jsonc`
- `src/router.tsx`
- `src/routes/__root.tsx`

Changes to these files should require platform maintainer review.

## Commit And Release Hygiene

- Prefer signed commits for maintainers.
- Use protected GitHub environments for releases and production deploys.
- Require manual approval before npm publishing or Cloudflare production deploys.
- Keep release tokens out of local machines where possible.
- Rotate release credentials after any suspected install-time compromise.
- Keep `CHANGELOG.md` and `VERSIONING.md` aligned with releases.

## Dependency Automation

Use one dependency automation tool, not both Dependabot and Renovate.

Recommended starting point:

- Weekly dependency PRs grouped by ecosystem.
- Separate GitHub Actions updates from npm updates.
- Require CI before automerge.
- Do not automerge major framework, runtime, deployment, auth, database, or ORM updates.
- Keep direct `@tanstack/*` dependencies exact until maintainers intentionally relax that policy.

## Future npm Publishing

If this project later publishes packages:

- Use npm trusted publishing with GitHub OIDC from a dedicated release workflow.
- Keep publish jobs separate from test jobs that execute untrusted code.
- Do not grant `id-token: write` to jobs that install arbitrary PR dependencies.
- Use protected environments and maintainer approval for publish jobs.
- Publish from immutable release tags, not arbitrary branch pushes.

## Future Release SBOMs

When Project Kelsier starts tagging public releases, deploying production builds for real users, or needing partner/compliance evidence, generate a Software Bill of Materials as a release artifact.

Use pnpm's built-in SBOM command rather than committing generated SBOM files by default:

```bash
pnpm sbom --sbom-format cyclonedx --lockfile-only --out sbom.cdx.json
```

Treat SBOMs as release evidence for incident response and dependency review. Do not add them to the normal CI gate until release automation exists and the artifact storage location is clear.

## Secret Rotation

Rotate secrets immediately after:

- A CI job with secrets executes untrusted code.
- A dependency install runs a known malicious version.
- A maintainer machine with release credentials is suspected compromised.
- A Cloudflare, npm, GitHub, Neon, or database token appears in logs.

Maintain an inventory of GitHub repository secrets, environment secrets, Cloudflare tokens, npm publishing settings, and future Neon credentials.

## Database Runtime Boundary

Keep database clients split by runtime:

- `src/db/client.worker.ts` is the Cloudflare Worker application client. It uses Drizzle's Postgres.js driver with the generated `HYPERDRIVE` binding and creates a lightweight client per request.
- `src/db/client.node.ts` is for Node-only scripts, local seed work, migration support, and tests that need postgres-js. Do not import it from route, service, or Worker runtime modules.
- `src/db/client.ts` is a runtime-safe shared surface for environment parsing and `DbClient` typing. It must not import `postgres`, `drizzle-orm/postgres-js`, `node:*`, or other Node-only modules.

`src/db/client-boundary.test.ts` statically scans Worker-facing source files so concrete drivers remain isolated to `client.worker.ts` and `client.node.ts`, and the Node-only client cannot enter the Worker bundle by accident.

## Incident Response

If a developer machine or CI runner installed a known malicious dependency version, treat that host as compromised until proven otherwise.

Recommended local cleanup on Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item -Force pnpm-lock.yaml
```

Then regenerate from a clean pnpm install path:

```bash
pnpm store path
pnpm store prune
pnpm install --ignore-scripts
pnpm install --lockfile-only --ignore-scripts
```

Rotate npm, GitHub, Cloudflare, database, SSH, and cloud credentials that were reachable from the affected machine or runner.

## Historical Incidents

### TanStack May 2026

GHSA-g7cv-rxg3-hmpx / CVE-2026-45321 was a malicious npm package publication incident affecting parts of the TanStack ecosystem. Affected package versions executed install-time malware through an injected optional dependency on `@tanstack/setup` from a GitHub commit, plus a `prepare` lifecycle script.

The active remediation for this repo is complete: use clean current TanStack versions, keep exact direct pins, avoid long-lived transitive overrides, preserve `--ignore-scripts` in CI, and keep `pnpm audit signatures` in the install path.

Historical indicators worth checking during forensic review:

- `@tanstack/setup`
- `github:tanstack/router#79ac49eedf774dd4b0cfa308722bc463cfe5885c`
- `router_init.js`
- `tanstack_runner.js`
- `litter.catbox.moe`
- `git-tanstack.com`
- `filev2.getsession.org`
- `seed1.getsession.org`

Sources:

- TanStack incident follow-up: <https://tanstack.com/blog/incident-followup>
- GitHub advisory: <https://github.com/TanStack/router/security/advisories/GHSA-g7cv-rxg3-hmpx>
