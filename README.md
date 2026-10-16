# Project Kelsier

Open-source exploration of cognition, communication patterns, and human-centered collaboration.

[Staging](https://project-kelsier.mindphreak.workers.dev/) | [Assessment MVP](./docs/assessment-mvp.md) | [Staging Operations](./docs/staging-operations.md) | [Security Notes](./docs/security-hardening.md) | [Versioning](./VERSIONING.md)

Public launch is on hold. Mindphreak hosts staging; curiousphreak hosts dummy production. Both are pre-launch verification environments and temporarily share one Neon database. See [hosted targets and cleanup ownership](./docs/staging-operations.md#hosted-targets). The seeded questionnaire and results are demonstration content.

Built with TanStack Start, React, Vite, Biome, Vitest, Playwright, GitHub Actions CI, and Cloudflare Workers-ready deployment.

Current app version: see [`package.json`](./package.json) or run `pnpm version:show`.

## Environment

Copy [`.env.example`](./.env.example) to `.env` for local development. The default database URL points at the Docker Compose PostgreSQL service on `localhost:55432`; use Neon connection strings only when intentionally working against hosted staging or production databases.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for generated-file and secret-handling rules before opening a PR.

## Commands

For the database-backed application, start Docker Desktop and run `pnpm dev`. The command starts local PostgreSQL, waits for it to become healthy, applies migrations, runs the idempotent seed, and then starts Vite. It refuses to automate this setup when `DATABASE_URL` points at a hosted database.

```bash
pnpm install
pnpm dev
pnpm dev:app
pnpm check
pnpm typecheck
pnpm test
pnpm coverage
pnpm build
pnpm preview
pnpm cf-typegen
pnpm worker:check
pnpm deploy
pnpm test:e2e
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm version:show
```

Daily local startup:

```bash
pnpm dev
```

Use `pnpm dev:app` only when the local database is already prepared and you intentionally want to start Vite without the database checks.

## Local Database Setup

Local PostgreSQL runs through Docker Compose for daily development, migration checks, seed testing, and destructive resets. Neon remains the hosted database target for staging and production.

Prerequisite: Docker Desktop must be running. If `pnpm dev` reports that Docker is unavailable, start Docker Desktop, wait until it is ready, and retry the command.

The local container exposes PostgreSQL on `localhost:55432` to avoid common Windows port reservations around `5432`.

```bash
# Start local PostgreSQL
docker compose up -d

# Stop local PostgreSQL
docker compose down

# Fully reset local PostgreSQL data
docker compose down -v

# Check running containers
docker ps

# Connect with psql inside the container
docker exec -it kelsier-postgres psql -U kelsier -d kelsier_dev

# Generate, apply, and seed the local database
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Tooling Notes

- Cloudflare Workers deployment is configured through [`wrangler.jsonc`](./wrangler.jsonc) and the Cloudflare Vite plugin in [`vite.config.ts`](./vite.config.ts). [`src/worker.ts`](./src/worker.ts) delegates HTTP requests to TanStack Start and runs the daily expired-assessment cleanup.
- Node `>=26.11.1 <27.0.0` is supported by [`package.json`](./package.json). [`.nvmrc`](./.nvmrc) pins the tested baseline, 26.12.0; CI reads that same pin. Node is used for local tooling and CI; deployed Workers run on Cloudflare's runtime.
- Node 26 does not bundle Corepack. See [local package-manager setup](./CONTRIBUTING.md#local-setup) to install Corepack and enable the repository's pinned pnpm version, including recovery from stale Windows launchers after a Node upgrade.
- Use the pnpm version pinned in [`package.json`](./package.json) `packageManager`. Settings and build-script approvals are declared in [`pnpm-workspace.yaml`](./pnpm-workspace.yaml). Installs enforce approved builds and engines, a strict 24-hour release-age gate, fail-closed publication metadata, trust-downgrade rejection, and transitive exotic-source blocking.
- [`worker-configuration.d.ts`](./worker-configuration.d.ts) contains Wrangler-generated binding and runtime API types. Refresh it with `pnpm cf-typegen` after changing bindings, compatibility dates/flags, or Wrangler; an upgrade can change runtime declarations without changing bindings.
- Local Vite serving defaults `WRANGLER_LOG` to `warn` so repeated environment-source notices do not obscure useful startup output. Set `WRANGLER_LOG=log` or `WRANGLER_LOG=debug` explicitly when deeper Wrangler diagnostics are needed.
- Vitest uses [`vitest.config.ts`](./vitest.config.ts) instead of sharing [`vite.config.ts`](./vite.config.ts). This avoids the full TanStack Start and Cloudflare runtime plugin stack keeping the unit test process open.
- Review UI through the running app with `pnpm dev`; Vitest and Playwright cover component behavior and browser journeys.
- Playwright starts Vite directly in [`playwright.config.ts`](./playwright.config.ts) instead of using `pnpm dev`. This is a Windows-friendly workaround so the dev server shuts down cleanly after E2E runs.
- Prepare local PostgreSQL before running browser tests. Each browser project simulates a separate client IP to avoid sharing a creation-rate bucket; the real rate limits remain enabled. See [testing notes](./CONTRIBUTING.md#testing-notes).
- Biome has Tailwind CSS directive parsing enabled in [`biome.json`](./biome.json) for Tailwind v4 syntax such as `@theme` in [`src/styles.css`](./src/styles.css).
- [`src/routeTree.gen.ts`](./src/routeTree.gen.ts) is generated by TanStack Router, excluded from manual editing and linting, and committed because the application imports it at runtime.
- Versioning uses [`package.json`](./package.json) as the source of truth. See [`VERSIONING.md`](./VERSIONING.md) and [`CHANGELOG.md`](./CHANGELOG.md).

## Cloudflare Workers

This repo is configured for Cloudflare Workers rather than static-only hosting.

The tracked Wrangler configuration targets staging. Dummy production requires its own account-specific Hyperdrive binding and no cleanup cron; follow [the two-account deployment procedure](./docs/staging-operations.md#deploying-the-same-build-to-both-accounts). For an authorized staging deployment:

```bash
pnpm install
pnpm cf-typegen
pnpm preview
pnpm worker:check
pnpm deploy
```

If you add Cloudflare bindings later, update [`wrangler.jsonc`](./wrangler.jsonc) and rerun `pnpm cf-typegen`. Run `pnpm worker:check` after Worker entrypoint or deployment-configuration changes; it validates the deploy bundle without publishing it.

## CI

GitHub Actions runs the baseline checks on pushes to `main` and on pull requests:

- `pnpm install --frozen-lockfile --ignore-scripts`
- `pnpm audit signatures`
- `pnpm audit --audit-level high`
- `pnpm rebuild`
- `pnpm version:check` on pull requests
- `pnpm check`
- `pnpm typecheck`
- `pnpm test`
- `pnpm coverage`
- `pnpm build`
- `pnpm worker:check`
- `pnpm test:e2e`

CodeRabbit supplies automatic pull request review. Maintainers can request a separate, review-only Claude pass by mentioning `@claude` in a pull request comment or review; Claude is not an automatic or required approver.

The separate database job applies migrations, seeds twice, and runs `src/db/assessmentIntegrity.test.ts` with `RUN_DB_TESTS=true`. Both jobs use the same pinned PostgreSQL image digest and disable persisted checkout credentials.
