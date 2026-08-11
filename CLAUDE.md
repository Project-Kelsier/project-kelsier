# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server on port 3000
pnpm build        # Production build (Cloudflare Workers)
pnpm deploy       # Build and deploy to Cloudflare

pnpm check        # Biome lint + format check (what CI runs)
pnpm format       # Auto-fix formatting
pnpm typecheck    # TypeScript check (no emit)

pnpm test                          # Run all unit tests
pnpm test --reporter=verbose       # Run unit tests with output
pnpm vitest run src/path/file.test.ts  # Run a single test file
pnpm coverage     # Unit tests with v8 coverage report

pnpm test:e2e     # Playwright e2e (auto-starts dev server if not running)

pnpm db:generate  # Generate Drizzle migration from schema changes
pnpm db:migrate   # Apply migrations to the local database
pnpm db:seed      # Seed local database with demo data

pnpm ci           # Full local CI: check + typecheck + test + build
```

## Local database

The project uses a Docker Postgres instance for local development and scripts:

```bash
docker compose up -d   # Start local Postgres on port 55432
docker compose down    # Stop it
```

Default connection: `postgres://kelsier:kelsier@localhost:55432/kelsier_dev`

The `.env` file is read by Drizzle Kit and seed scripts. Set `DATABASE_URL` there to override. The seed script refuses to run against non-local databases unless `ALLOW_SEED=true` is set explicitly.

## Architecture

### Runtime target: Cloudflare Workers

The app deploys as a Cloudflare Worker via TanStack Start's server entry (`@tanstack/react-start/server-entry`). The Vite config uses `@cloudflare/vite-plugin` with SSR mode, so the production bundle runs in the Workers edge runtime — not Node. The dev server emulates this locally.

### Dual database clients

There are two Drizzle client implementations because the Worker connects through Cloudflare Hyperdrive while Node tooling connects directly to PostgreSQL:

- **`src/db/client.worker.ts`** — uses `drizzle-orm/postgres-js` through the generated Cloudflare Hyperdrive binding. This is what runs in production.
- **`src/db/client.node.ts`** — uses `drizzle-orm/postgres-js` with the `postgres` npm package. Used by local scripts (`seed.ts`, Drizzle Kit migrations).
- **`src/db/client.ts`** — shared types and connection string helpers that both clients import. Must stay runtime-safe — never import Node-only modules here.

`DbClient` (the type used throughout services) is inferred from the worker client's `getDb` return type. When adding new service functions, import `DbClient` from `#/db/client`.

**Client boundary**: never import `src/db/client.node.ts`, `postgres`, or `drizzle-orm/postgres-js` from routes, services, or any Worker-facing module. `src/db/client-boundary.test.ts` enforces this and will fail if the boundary is crossed.

### Service layer

`src/services/` contains plain async functions (no classes) that accept either a `DbClient` directly or a context object:

- `AuthenticatedUserContext` — `{ db: DbClient, userId: string }`
- `OrganisationUserContext` — extends the above with `organisationId`

Services always scope queries to `organisationId` and filter out soft-deleted rows (`isNull(deletedAt)`). All service functions are exported from `src/services/index.ts`.

### Routing

TanStack Router with file-based routes under `src/routes/`. `src/routeTree.gen.ts` is auto-generated and committed as runtime source — never edit it directly. The router plugin regenerates it on every dev server start and build.

`src/lib/appShell.ts` drives body class selection: the `kelsier-body` class is applied on all routes except `/privacy` and `/terms`, which use the base legal layout.

### Styling

Tailwind v4 (no config file — configured via CSS `@import`). Two CSS entry points are loaded in the root route:

- `src/styles.css` — global base styles
- `src/styles/kelsier.css` — all Kelsier-specific design tokens and component styles (`k-` prefixed classes)

Kelsier design tokens use semantic CSS custom properties (`--k-accent`, `--k-text`, `--k-card`, etc.). New Kelsier UI should use these tokens rather than raw color values. Theme metadata, validation, and pre-hydration restoration live in `src/lib/kelsierThemes.ts`; palette token values live in `src/styles/kelsier.css`.

### Path aliases

`#/` and `@/` both map to `src/`. Use `#/db/client`, `#/services`, etc. for internal imports. Don't mix both aliases within the same file.

### Version metadata requirement

Every PR that changes release-relevant files (anything under `src/`, `e2e/`, `scripts/`, config files, etc.) **must** bump `package.json` version and update `CHANGELOG.md`. CI enforces this via `pnpm version:check`. The version must strictly increase from the merge base.

### Linting and formatting

Biome handles both linting and formatting (no ESLint or Prettier). Run `pnpm check` before committing. The CI gate is `pnpm check` — it fails on any lint or format issue.

## Dependency pinning

Direct `@tanstack/*` dependencies are pinned to **exact versions** (no `^` or `~`). This is a deliberate security policy following a May 2026 supply-chain incident (CVE-2026-45321) affecting the TanStack ecosystem. Do not convert them to range pins. When updating TanStack packages, pin to a specific reviewed version.

### Dependency upgrade discipline

Dependency work is not complete when `pnpm install` succeeds. Before editing dependency files, read `AGENTS.md`, this file, `CONTRIBUTING.md`, and `docs/security-hardening.md`. Follow the strictest applicable instruction.

When pnpm blocks a version because of release-age policy, choose the newest policy-compliant version unless the user explicitly approves a security exception. Do not commit `minimumReleaseAgeExclude` or other cooldown bypasses as repository configuration.

Prefer direct package upgrades over transitive overrides. If an override is necessary, put it in `pnpm-workspace.yaml`, document the advisory and removal condition nearby, and use the narrowest compatible version. Do not use broad `>=` overrides when an exact compatible version is safer. After every override, run the full dependency-change quality gate and verify that tests still execute.

If a low or moderate advisory cannot be fixed safely because no compatible patched version exists, leave it unresolved and explain the blocker. Do not force incompatible major versions through transitive overrides just to make `pnpm audit` quiet.

Do not claim completion unless the required checks have actually passed. In the handoff, list the exact commands run and their result. If a command was skipped, failed, required escalation, or needed a workaround, say so plainly.

### Vitest config

`vitest.config.ts` intentionally excludes the full TanStack Start and Cloudflare Workers plugin stack. Do not add those plugins to the Vitest config — they cause runtime mismatch issues in tests.

## Quality gates

Run the minimum set relevant to your change:

**Most code changes:**
```bash
pnpm check && pnpm typecheck && pnpm test
```

**UI or routing changes (also required before a PR):**
```bash
pnpm check && pnpm typecheck && pnpm test && pnpm coverage && pnpm build && pnpm test:e2e
```

**Dependency or install-path changes:**
```bash
pnpm install --frozen-lockfile --ignore-scripts && pnpm audit signatures && pnpm audit --audit-level high && pnpm version:check && pnpm check && pnpm typecheck && pnpm test && pnpm build
```

**Database schema or seed changes:**
```bash
docker compose up -d && pnpm db:generate && pnpm db:migrate && pnpm db:seed && pnpm check && pnpm typecheck && pnpm test
```

## Testing conventions

### Query helper tests

When testing Drizzle service functions, assert on the **intent** of queries rather than internal Drizzle structure or generated SQL strings:

- Mock Drizzle operators (`eq`, `and`, `isNull`) when needed and assert that expected schema columns are passed — e.g. `isNull(organisations.deletedAt)`, not `deleted_at IS NULL`.
- Assert required joins by checking the joined schema table object.
- For org-scoped helpers, prove that `organisations.deletedAt` is filtered, not merely that some null check exists.
- Do not assert on generated SQL strings, magic string counts, or Drizzle internal predicate object shape.

### Database schema

Drizzle schema is in `src/db/schema/`, with one file per domain entity. `src/db/schema/index.ts` re-exports everything. Keep Drizzle relation definitions in `src/db/schema/relations.ts` — do not colocate them in individual schema files. Migrations live in `drizzle/migrations/`.

After changing the schema:
```bash
pnpm db:generate
git diff drizzle/migrations      # review generated SQL before committing
git diff drizzle/migrations/meta
pnpm db:migrate                  # apply locally (requires docker compose up -d)
pnpm db:seed
```

Fresh database setup must be fully reproducible from committed migrations, including required extensions such as `pgcrypto`. Never apply generated migrations to a hosted Neon database without reviewing the SQL first.

The `users` table is a thin domain anchor — it stores only `authUserId` linking to Neon Auth. Do not add auth identity fields (email, display name, avatar) to this table.

### Assessment data model

Assessment content is versioned: `assessmentVersions` → `assessmentQuestions` → `assessmentOptions`. A user's response is an `assessmentAttempt` containing `assessmentAnswers`, which produces an `assessmentResult` with `traitScores` (JSONB keyed by dimension). The landing page loads the active questionnaire version and its ordered options from PostgreSQL through a TanStack Start server function. Starting creates a cookie-authorized guest attempt, while answers remain client-only until the persistence phase.
