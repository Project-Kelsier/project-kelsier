# CLAUDE.md

This file contains Kelsier-specific guidance. General interaction preferences and personal Claude Code configuration are intentionally outside the repository's contributor contract.

## AGENTS.md is the operating contract

[`AGENTS.md`](AGENTS.md) is the authoritative operational guide for this repository, shared by human contributors and coding agents. Read it and follow it. It owns directory intent, routing and component rules, styling, accessibility, testing strategy, quality gates, tooling guardrails, generated-file ownership, secrets handling, PR scope, and refactor boundaries.

This file deliberately does **not** restate those rules. It adds only what `AGENTS.md` leaves out: what Kelsier is, why the product constrains technical reasoning, the verified stack, the runtime and data boundaries worth understanding before touching code, and the status of concepts that are not implemented.

`AGENTS.md` defines precedence when instructions disagree: explicit user request, then `AGENTS.md`, then [`README.md`](README.md), then [`CONTRIBUTING.md`](CONTRIBUTING.md), then existing code patterns. If this file and `AGENTS.md` conflict, say so rather than silently choosing one.

## Claim status labels

Every architectural or product claim below carries one label. Do not promote a claim to a stronger label without evidence of that specific kind.

| Label | Meaning |
| --- | --- |
| **Implemented** | Present in tracked code or configuration. |
| **DB-enforced** | A database constraint makes violation impossible. |
| **Test-enforced** | A test fails on violation, so CI blocks it. Not structurally prevented at runtime. |
| **Convention** | Current service or process practice. Not structurally prevented. |
| **Direction** | Approved intent recorded in a public repository document. |
| **Proposed** | No accepted public record. Must not guide implementation as binding architecture. |

This file is documentation, not a decision record. It cannot itself promote a proposal to approved direction; only an accepted public repository document can do that.

## What Kelsier is

Kelsier is an open-source platform for making interpersonal and team friction legible without reducing people to personality labels.

The product commitment is that a claim about a person or relationship should carry traceable evidence, an explicit confidence level, a way to be falsified or corrected, provenance separating machine inference from human-approved interpretation, and boundaries preventing behavioural data from being presented as clinical, diagnostic, predictive, or hiring-suitable without validation.

Parts of that commitment are already load-bearing in the schema:

- **DB-enforced** — a result cannot disagree with the attempt that produced it. `assessment_results_attempt_version_fk` is a composite foreign key onto `(assessmentAttempts.id, assessmentAttempts.assessmentVersionId)`.
- **DB-enforced** — at most one result row per attempt (`assessment_results_attempt_id_unique`).
- **Convention** — results are treated as immutable. The service layer only inserts and reads them; there is no update path. The database does *not* prevent updates: `assessmentResults` carries an `updatedAt` column and no trigger or rule blocks `UPDATE`. Do not describe results as structurally immutable, and do not add an update path without revisiting the product decision.
- **Implemented** — scoring is versioned independently of the app release. `dimension-mean-v1` is stored per result ([`src/lib/assessmentScoring.ts`](src/lib/assessmentScoring.ts)); changed arithmetic or dimension meaning requires a new identifier so incomparable scores are never silently compared.
- **Implemented** — `assessmentResults.confidence` is nullable and stays `null` until there is a defensible way to compute it. The schema declines to fabricate precision.
- **Implemented** — result traceability comes from the full persisted chain: result → attempt → answers → versioned questions and options. Every answer records its question and chosen option, so a score can be traced back to the exact items that produced it. `contributingQuestionCounts` is supporting metadata within that chain — it records how many questions fed each dimension, not which ones.
- **Direction** — assessment versions, questions, options, dimensions, and score weights must not be mutated once responses exist; future editing tools must create a new version rather than change an active one in place ([`docs/assessment-mvp.md`](docs/assessment-mvp.md)). The database does **not** structurally prohibit such updates, so the provenance chain only means what it claims for as long as this is honoured.
- **Implemented (schema only)** — `aiInsights` is *designed* to record machine-inference provenance (`model`, `promptVersion`, `generatedAt`, nullable `confidence`) for insights when they are generated. There is no AI generation pipeline in this repository: the service exposes two read-only list helpers and nothing writes insights. Do not describe inference provenance as a working behaviour.

The harm boundary is a hard product rule. The seeded questionnaire and its dimension-mean output are **demonstration content**. Never describe them — in code, comments, UI, tests, or docs — as validated, predictive, clinical, diagnostic, or suitable for hiring decisions. [`docs/assessment-mvp.md`](docs/assessment-mvp.md) is the approved source of truth for assessment work, including the public launch gate.

## Verified stack

**Implemented**, confirmed against tracked configuration:

- **Single-package pnpm application** on Node `24.x` tooling. [`pnpm-workspace.yaml`](pnpm-workspace.yaml) declares `packages: [.]` and exists to own install policy and documented CVE overrides, not to define multiple workspaces.
- **React 19 with TanStack Start, TanStack Router, and Vite.** Start is the framework, Router its file-based routing layer ([`vite.config.ts`](vite.config.ts)).
- **TanStack Start server functions are the API boundary** (`createServerFn`, [`src/server`](src/server)). There is no separate HTTP framework.
- **Production targets Cloudflare Workers** via Wrangler and `@cloudflare/vite-plugin` in SSR mode — the edge runtime, not Node.
- **Drizzle ORM over PostgreSQL.** Local development uses Docker PostgreSQL on `localhost:55432`; hosted access is Neon reached through the Cloudflare **Hyperdrive** binding.
- **Cloudflare Cron Triggers perform scheduled cleanup** (`17 3 * * *` in [`wrangler.jsonc`](wrangler.jsonc) → the `scheduled` export in [`src/worker.ts`](src/worker.ts)). No queue system or external job runner.
- Native Workers rate limiting (`ASSESSMENT_ATTEMPT_RATE_LIMITER`), Tailwind v4, Biome, Vitest, Playwright, Storybook.

**Not part of the current architecture.** Bun, Hono, Braintrust, Inngest, and a multi-package workspace layout are not installed dependencies, implemented services, or part of the tracked architecture — they appear in this repository only as named exclusions. If a task assumes any of them, verify against `package.json` and tracked source before building, and confirm the intent before introducing one. A comment in [`src/db/schema/aiInsights.ts`](src/db/schema/aiInsights.ts) records the intended background-job direction as Cloudflare Queues or Workflows, keeping that path platform-native.

## Runtime and data boundaries

Layout, file placement, and generated-file rules live in `AGENTS.md` ([Directory Intent](AGENTS.md#directory-intent), [Generated Files And Local Artifacts](AGENTS.md#generated-files-and-local-artifacts)). The boundaries below are the ones worth understanding before changing code.

**Two database clients.** The Worker reaches PostgreSQL through Hyperdrive; Node tooling connects directly. Both use `drizzle-orm/postgres-js` — the split is connection path, not driver compatibility.

- [`src/db/client.worker.ts`](src/db/client.worker.ts) — production; requires the `HYPERDRIVE` binding and throws without it.
- [`src/db/client.node.ts`](src/db/client.node.ts) — Node only: seed, migrations, tests.
- [`src/db/client.ts`](src/db/client.ts) — shared types and connection helpers; must stay runtime-safe, never import a concrete driver. `DbClient` is inferred here from the worker client.

**Test-enforced** — never import `client.node.ts`, `postgres`, or `drizzle-orm/postgres-js` from routes, services, or Worker-facing modules. [`src/db/client-boundary.test.ts`](src/db/client-boundary.test.ts) fails if crossed.

**Service layer.** Plain async functions in [`src/services`](src/services) taking a `DbClient` or a context from [`src/services/context.ts`](src/services/context.ts). Organisation-scoped services scope to `organisationId` and filter soft-deleted rows. Operational helpers such as scheduled cleanup stay direct server imports rather than joining the application service surface.

**Assessment ownership.**

- **DB-enforced** — exactly one owner per attempt, guest session or user, never both and never neither (`assessment_attempts_exactly_one_owner_check`). This check constrains the owner columns only; it says nothing about future sharing or account-claim behaviour.
- **Direction** — guest and claimed attempts remain personal records. Creating an account must not implicitly expose or route them to an organisation or team; sharing will be an explicit later action ([`docs/assessment-mvp.md`](docs/assessment-mvp.md)).
- **Implemented** — the attempt is the authorization boundary for its answers and result. Children derive ownership through the attempt rather than duplicating tenant columns — a deliberate exception to the repository's usual denormalized tenant-key convention, because these records are personal before any sharing decision exists.
- **Implemented** — only a SHA-256 hash of the guest token is stored (`guestSessions.tokenHash`); the raw value stays in an `HttpOnly`, `SameSite=Lax` cookie, `Secure` outside local development. Attempt IDs are non-secret UUIDs and never authorize access alone. A live questionnaire holds a continuation capability whose hash is stored on the attempt and rotated when the single resume succeeds.
- **Implemented** — retention is fixed from attempt creation, never extended on activity. [`src/server/assessmentCleanup.ts`](src/server/assessmentCleanup.ts) deletes expired guest sessions in one indexed statement, lets cascades remove dependents, emits structured `assessment_cleanup_completed` / `assessment_cleanup_failed` logs, and rethrows so Cloudflare records a failed invocation.
- Never attach names, emails, analytics identifiers, raw IPs, or user-agent strings to attempts.
- **Convention** — data minimization extends to identity: the `users` table is a thin domain anchor storing only `authUserId`. Do not add auth identity fields (email, display name, avatar) to it.

**Assessment flow.** Content is versioned (`assessmentVersions` → `assessmentQuestions` → `assessmentOptions`). A guest response is an `assessmentAttempt` holding `assessmentAnswers`, producing one `assessmentResult`. The landing page loads the active version through a server function; starting creates a cookie-authorized attempt; each answer is acknowledged before navigation; one interrupted attempt may be resumed exactly once; completion atomically stores the final answer, the result, and the completion timestamp. Active version content and score weights are treated as fixed scoring inputs once responses exist (**Direction**, per [`docs/assessment-mvp.md`](docs/assessment-mvp.md)) — editing tools must create a new version rather than mutate an active one. Nothing in the database prevents a direct update, so treat this as a rule to uphold, not a guarantee to rely on.

## Commands

Derived from `package.json`. `AGENTS.md` [Quality Gates](AGENTS.md#quality-gates) defines which sets to run for which change type — follow it rather than guessing.

```bash
pnpm dev              # Prepare local PostgreSQL, then start Vite on port 3000
pnpm dev:app          # Start Vite on port 3000 without database preparation
pnpm build            # Production build
pnpm preview          # Build, then run the local deployment preview
pnpm deploy           # Build and deploy to Cloudflare
pnpm cf-typegen       # Regenerate Cloudflare binding types
pnpm worker:check     # Wrangler dry run; validates the bundle without publishing

pnpm check            # Biome lint + format check (the CI gate)
pnpm format           # Biome format, writing fixes
pnpm lint             # Biome lint only
pnpm typecheck        # tsc --noEmit

pnpm test             # Vitest unit tests
pnpm coverage         # Vitest with v8 coverage
pnpm test:e2e         # Playwright
pnpm storybook        # Storybook workbench on port 6006
pnpm build-storybook  # Compile Storybook as CI does

pnpm db:generate      # Generate a Drizzle migration from schema changes
pnpm db:migrate       # Apply migrations to the local database
pnpm db:seed          # Seed the local database

pnpm version:show     # Print the current app version
pnpm version:check    # Verify version + CHANGELOG metadata (CI gate)
pnpm ci               # check + typecheck + test + app and Storybook builds
```

Non-obvious safety behaviour:

- `pnpm dev` needs a running Docker engine with Docker Compose. [`scripts/prepare-dev.mjs`](scripts/prepare-dev.mjs) starts and waits for PostgreSQL, migrates, seeds, then starts Vite — and **refuses to prepare a non-local `DATABASE_URL`**. `pnpm dev:app` bypasses all of it.
- `pnpm db:seed` refuses non-local databases unless `ALLOW_SEED=true` is set explicitly.
- `pnpm db:generate` writes generated SQL under [`drizzle/migrations`](drizzle/migrations) — review it before applying anywhere, and never apply unreviewed to hosted Neon.
- `pnpm deploy` publishes to Cloudflare. Prefer `pnpm preview` and `pnpm worker:check` first, and get explicit approval before running it.

Local default: `postgres://kelsier:kelsier@localhost:55432/kelsier_dev`.

## Not implemented

Neither concept below has an accepted public repository decision record. Both are **Proposed**: treat them as ideas under discussion, not as binding architecture, and do not implement against them until an accepted ADR or equivalent public document exists. Private discussion, unavailable external records, and this file itself are not sources of approval.

**Append-only behavioural observation log — Proposed.** The idea is to represent behavioural observations as an append-only event log, record corrections and rejections as further events rather than destructive edits, and derive the current belief about a person, relationship, or team as a replaceable projection over that history, with the evidence chain remaining the source of truth.

None of that exists. What exists is narrower and assessment-specific: one versioned attempt producing one result, as described above. Do not describe current attempts, answers, or results as a general behavioural event log — there is no event store, projection layer, or belief concept in the schema.

**Bronze judge — Proposed.** A component intended to evaluate generated claims across groundedness, falsifiability, calibration, sycophancy, and actionability versus harm. There is no implementation, rubric, prompt, dataset, threshold, evaluation harness, or trace integration in this repository, and no authoritative public specification defining what each dimension measures, its input and output contract, calibration, failure criteria, or effect on product behaviour. Do not invent those definitions.

If either should become binding on contributors, publish the accepted decision as a concise design document or ADR under [`docs`](docs) and reference it from `AGENTS.md`. A decision recorded only in private notes cannot be an open-source contribution requirement.
