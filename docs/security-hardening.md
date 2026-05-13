# Security Hardening Notes

This document records baseline security expectations for Project Kelsier as an early-stage OSS SaaS platform. Keep the controls understandable and proportional; avoid adding process that maintainers cannot actually operate.

## TanStack Supply-Chain Response

The TanStack incident tracked as GHSA-g7cv-rxg3-hmpx / CVE-2026-45321 was a malicious npm package publication incident. Affected package versions executed install-time malware through an injected optional dependency on `@tanstack/setup` from a GitHub commit, plus a `prepare` lifecycle script.

Current repository policy:

- Pin direct `@tanstack/*` dependencies to exact versions while the ecosystem is recovering.
- Keep temporary pnpm overrides for transitive `@tanstack/*` packages that appear in `pnpm-lock.yaml`.
- Regenerate `pnpm-lock.yaml` from a clean install context after dependency changes.
- Search the lockfile for the known IOCs before release: `@tanstack/setup`, `github:tanstack/router#79ac49eedf774dd4b0cfa308722bc463cfe5885c`, and `router_init.js`.
- Scope any project-local pnpm store path to CI only. Do not commit a global `.npmrc` `store-dir` setting that changes developer installs away from pnpm's shared store.
- Prefer `pnpm install --frozen-lockfile --ignore-scripts` in CI, followed by `pnpm rebuild` so pnpm runs only the package build scripts already reviewed in `pnpm-workspace.yaml` `allowBuilds`.

Safe local cleanup after a suspected malicious install on Windows PowerShell:

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

If the host installed an affected TanStack version on 2026-05-11 during the published attack window, treat the host as compromised. Rotate npm, GitHub, Cloudflare, database, SSH, and cloud credentials that were reachable from that machine or CI runner.

## GitHub Actions Design

- Default workflow permissions should be `contents: read`.
- Add job-level permissions only for a step that demonstrably needs them.
- Do not use `pull_request_target` for workflows that check out, install, build, test, or execute PR-controlled code.
- Forked PR workflows must not receive deployment secrets, publish tokens, Cloudflare credentials, npm credentials, or `id-token: write`.
- Privileged deployment and publishing workflows should run only on protected branches, protected environments, or explicit maintainer approval.
- Add `github.repository_owner` and branch guards to privileged jobs when a workflow could run in forks or mirrors.
- Pin third-party actions to full commit SHAs. Keep a comment with the human-readable version tag for maintenance.

SHA pinning prevents a moved tag from changing executed workflow code. Version tags are easier to update but trust the action maintainer and GitHub tag state at every run. For this project, use SHA pinning for CI and deployment workflows, then update pins through reviewed dependency-maintenance PRs.

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
- Never expose Cloudflare, Neon, npm, or GitHub publishing credentials to pull request workflows.

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
- `.npmrc`
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

## Dependabot Or Renovate

Use one dependency automation tool, not both.

Recommended starting point:

- Weekly dependency PRs grouped by ecosystem.
- Separate GitHub Actions updates from npm updates.
- Require CI before automerge.
- Do not automerge major framework, runtime, deployment, auth, database, or ORM updates.
- For `@tanstack/*`, keep exact pins until maintainers intentionally relax this incident response control.

## Future npm Publishing

If this project later publishes packages:

- Use npm trusted publishing with GitHub OIDC from a dedicated release workflow.
- Keep publish jobs separate from test jobs that execute untrusted code.
- Do not grant `id-token: write` to jobs that install arbitrary PR dependencies.
- Use protected environments and maintainer approval for publish jobs.
- Publish from immutable release tags, not arbitrary branch pushes.

## Secret Rotation

Rotate secrets immediately after:

- A CI job with secrets executes untrusted code.
- A dependency install runs a known malicious version.
- A maintainer machine with release credentials is suspected compromised.
- A Cloudflare, npm, GitHub, Neon, or database token appears in logs.

Maintain an inventory of GitHub repository secrets, environment secrets, Cloudflare tokens, npm publishing settings, and future Neon credentials.
