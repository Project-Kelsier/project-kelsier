# AGENTS.md

## Purpose

This file gives human contributors and coding agents a shared operating guide for this repository. It is intentionally more specific than a generic contribution guide: it explains how the app is structured today, which parts are generated or tool-owned, and how to extend the codebase without creating avoidable cleanup work later.

In an open source context, this file exists to reduce contributor guesswork and maintainer review overhead. Use it when planning or implementing changes in this repo. If a change affects workflow, architecture, or conventions, update this file in the same PR.

## Open Source Expectations

This repo should be easy for a new contributor to understand without private context. Changes should optimize for:

- Clear intent: contributors should be able to tell why a pattern exists.
- Low surprise: docs, scripts, CI, and code structure should agree with each other.
- Reviewability: changes should be scoped so maintainers can validate them quickly.
- Maintainability: avoid introducing abstractions or dependencies before they are needed.
- Respect for contributor time: required checks and expectations should be explicit.
- Respect for maintainer time: PRs should not create avoidable cleanup, hidden regressions, or undocumented conventions.

`README.md` explains the project, `CONTRIBUTING.md` explains contribution workflow, and this `AGENTS.md` explains how to operate safely inside the codebase.

## Repo Snapshot

- Framework: TanStack Start with React 19, Vite, and TanStack Router.
- Deployment target: Cloudflare Workers via Wrangler and the Cloudflare Vite plugin.
- Styling: Tailwind CSS v4, global baseline CSS in [`src/styles.css`](src/styles.css), and Kelsier-specific authored CSS in [`src/styles/kelsier.css`](src/styles/kelsier.css).
- Database: Drizzle ORM with PostgreSQL. Local development uses Docker Compose PostgreSQL on `localhost:55432`; Neon remains the hosted staging/production database target.
- Testing: Vitest for unit tests, Playwright for end-to-end coverage, and Storybook for isolated UI review.
- Quality gate: Biome for formatting, linting, and import organization.
- Package manager: `pnpm`
- Runtime target: Node `24.x`
- Node version hint: [`.nvmrc`](.nvmrc)
- Version source of truth: [`package.json`](package.json)

Current app shape is intentionally small:

- One root shell in [`src/routes/__root.tsx`](src/routes/__root.tsx)
- Route files in [`src/routes/index.tsx`](src/routes/index.tsx), [`src/routes/privacy.tsx`](src/routes/privacy.tsx), and [`src/routes/terms.tsx`](src/routes/terms.tsx)
- Kelsier page composition in [`src/components/kelsier/KelsierPage.tsx`](src/components/kelsier/KelsierPage.tsx)
- Reusable Kelsier shell components in [`src/components/kelsier/KelsierHeader.tsx`](src/components/kelsier/KelsierHeader.tsx) and [`src/components/kelsier/KelsierFooter.tsx`](src/components/kelsier/KelsierFooter.tsx)
- Drizzle schema modules in [`src/db/schema`](src/db/schema), including explicit relations in [`src/db/schema/relations.ts`](src/db/schema/relations.ts)
- Thin database service helpers in [`src/services`](src/services)
- Local seed data in [`scripts/seed.ts`](scripts/seed.ts)
- Global CSS baseline in [`src/styles.css`](src/styles.css) and Kelsier visual styles in [`src/styles/kelsier.css`](src/styles/kelsier.css)

This guide assumes the repo will grow from that starting point, so several sections below define conventions for scale before they are strictly required.

## Source Of Truth

When instructions disagree, use this order of precedence:

1. Explicit user request
2. This `AGENTS.md`
3. [`README.md`](README.md)
4. [`CONTRIBUTING.md`](CONTRIBUTING.md)
5. Existing local code patterns

If the codebase and this file disagree, prefer preserving the working code and update this file as part of the change.

## Core Principles

- Keep changes focused. Prefer small, reviewable PRs over broad refactors.
- Preserve the starter’s working toolchain. This repo already has a stable local and CI loop; avoid unnecessary config churn.
- Extend by composition, not duplication. Pull repeated UI into small shared components once duplication is real.
- Respect generated files and tool-owned outputs.
- Favor accessibility and responsive behavior by default.
- Keep the visual language intentional. This project is not aiming for generic placeholder UI.
- Prefer conventions that a first-time open source contributor can follow without tribal knowledge.

## Directory Intent

Use the current layout as the baseline and expand it with these responsibilities:

- [`src/routes`](src/routes): Route files and route-owned page composition.
- [`src/components`](src/components): Reusable presentational components shared by multiple routes or sections.
- [`src/styles.css`](src/styles.css): Tailwind imports, global font theme, and document-level baseline styles.
- [`src/styles/kelsier.css`](src/styles/kelsier.css): Kelsier design tokens, page layout, animations, and route-specific component styles.
- [`src/db`](src/db): Drizzle client and schema definitions.
- [`src/services`](src/services): Thin service-layer query helpers that keep tenant scoping explicit.
- [`drizzle/migrations`](drizzle/migrations): Drizzle-generated PostgreSQL migration SQL and metadata.
- [`scripts`](scripts): Local operational scripts such as database seed setup.
- [`src/router.tsx`](src/router.tsx): Router creation only.
- [`e2e`](e2e): End-to-end tests that validate cross-page user-visible behavior.
- [`.storybook`](.storybook): Storybook configuration for isolated UI review, shared preview styling, and app-specific Vite defines used by stories.
- [`public`](public): Static assets that should be served directly.

When the app grows, prefer adding these folders rather than overloading existing files:

- `src/components/<feature>` for reusable feature-level UI
- `src/lib` for framework-agnostic helpers and utilities
- `src/hooks` for custom React hooks
- `src/server` for server-only helpers used by TanStack Start routes or loaders
- `src/test` for shared test utilities, mocks, and render helpers

Add folders only when there is a real second use case. Do not pre-build a large architecture for a small feature.

## Routing Rules

TanStack Router file-based routing is the organizing backbone of the app.

- Add new pages under [`src/routes`](src/routes).
- Keep route files focused on route concerns: page composition, route metadata, loaders, and route-local state.
- If a route grows past a reasonable reading size, move repeated or dense UI blocks into `src/components`.
- Keep shared document-level concerns in [`src/routes/__root.tsx`](src/routes/__root.tsx), not duplicated across routes.

### Generated Route Tree

[`src/routeTree.gen.ts`](src/routeTree.gen.ts) is generated by TanStack Router.

- Do not hand-edit it.
- Do not add tests that assert against its implementation details.
- If route changes require regeneration, use the normal app/tooling workflow instead of manual edits.

## Component Conventions

- Prefer function components with explicit, readable props.
- Keep components small enough that their purpose is obvious from one screen of code.
- Co-locate tiny route-specific subcomponents with the route until reuse is proven.
- Promote a component into [`src/components`](src/components) when it is shared, reused, or represents an important design primitive.
- Avoid deeply nested prop drilling when a route can compose sections more directly.

For this repo specifically:

- [`src/components/kelsier/KelsierHeader.tsx`](src/components/kelsier/KelsierHeader.tsx) and [`src/components/kelsier/KelsierFooter.tsx`](src/components/kelsier/KelsierFooter.tsx) are reusable shell pieces for the Kelsier experience.
- The root document owns document metadata, stylesheets, body class selection, scripts, and devtools. Route-owned layout should stay in route or feature components unless there is a strong product reason to move it into the root shell.

## Styling Rules

The current styling approach is hybrid: Tailwind v4 is available, but much of the visual system is defined in authored CSS.

- Reuse the tokens and patterns in [`src/styles/kelsier.css`](src/styles/kelsier.css) before introducing new one-off values for the Kelsier page.
- Prefer CSS custom properties for reusable colors, surfaces, shadows, and visual identity decisions.
- Keep Kelsier color themes in the `data-kelsier-theme` token blocks in [`src/styles/kelsier.css`](src/styles/kelsier.css). Components and SVG data visuals should consume semantic `--k-*` tokens rather than embedding palette values. [`src/lib/kelsierThemes.ts`](src/lib/kelsierThemes.ts) owns selectable theme metadata, the default and storage key, validation, and the pre-hydration bootstrap; [`src/components/kelsier/KelsierThemePicker.tsx`](src/components/kelsier/KelsierThemePicker.tsx) owns the selection UI and persistence lifecycle.
- Use utility classes for layout and simple spacing where they keep JSX readable.
- Use authored CSS for multi-part components, layered backgrounds, animations, and repeated visual patterns.
- Preserve the repo’s intentional art direction. Avoid replacing the current look with a default framework aesthetic.

When adding new visual sections:

- Check mobile behavior early.
- Keep hover effects optional rather than required for comprehension.
- Respect reduced-motion considerations if animation meaningfully increases.

## Accessibility Expectations

Every user-facing change should maintain or improve baseline accessibility.

- Use semantic headings in a logical order.
- Ensure interactive elements have clear names.
- Prefer visible text over icon-only controls unless there is a strong UI reason.
- Preserve color contrast when extending the palette.
- Verify keyboard access for new navigation or form interactions.

## State And Data

The current UI is mostly static, but the repository now includes a production-shaped Drizzle/PostgreSQL foundation.

- Keep route data fetching close to the route when the data is route-owned.
- Move shared transformation logic into `src/lib` rather than embedding it in JSX.
- Separate server-only logic from client components as soon as that distinction matters.
- Avoid introducing a global client state library without a concrete need.
- Keep database services thin and explicit. Do not introduce generic repositories, CQRS, event sourcing, or domain frameworks without a concrete product need.
- Preserve tenant boundaries in service helpers. Organisation-scoped and team-scoped queries should include explicit `organisationId` predicates and should filter soft-deleted organisations, teams, and memberships from normal list/get helpers.
- Source-scoped lookup helpers should include all columns that define the source identity. For example, AI insight source lookups must filter by both `sourceEntityType` and `sourceEntityId`, not just the ID.
- When a table stores a duplicated `organisationId` for tenant-scoped lookup speed and also references a parent row, enforce that tenant relationship at the database level with composite unique keys/foreign keys where practical. Do not rely only on service-layer predicates to prevent cross-tenant rows.
- Keep external auth decoupled from domain users. `users.authUserId` is the bridge to managed auth identity; do not add foreign keys to provider-owned auth tables.
- Local database work should use Docker PostgreSQL through `DATABASE_URL=postgres://kelsier:kelsier@localhost:55432/kelsier_dev`. Do not run destructive development commands against Neon.

Default bias: start local, then extract when reuse or complexity justifies it.

## Testing Strategy

This repo already has a clear split between unit and end-to-end coverage.

- Add Vitest tests for logic, rendering branches, component behavior, and route-level UI that can be tested in isolation.
- Add Playwright tests for critical user journeys, major page contracts, and regressions that depend on the running app.
- If you change routing, shell layout, or primary call-to-action content, update or add at least one relevant test.

### Unit Tests

- Put unit tests next to source files using `*.test.ts` or `*.test.tsx`.
- Vitest includes `src/**/*.test.{ts,tsx}`.
- Do not place unit tests under `e2e`.

### Query Helper Tests

When testing Drizzle query helpers, avoid assertions that depend on Drizzle's internal predicate object shape, generated SQL chunk repetition, or magic string counts.

Prefer assertions that verify the intended contract directly:

- Mock Drizzle operators such as `eq`, `and`, and `isNull` when needed.
- Assert that expected schema columns are passed to operators, such as `isNull(organisations.deletedAt)`.
- Assert required joins by checking the joined schema table object.
- Keep tests focused on tenant visibility, soft-delete filtering, and return-shape behavior.
- Do not assert on generated SQL strings unless the test is explicitly about SQL generation.

For organisation-scoped helpers, tests should prove that `organisations.deletedAt` is filtered, not merely that some `deleted_at IS NULL` predicate exists.

### E2E Tests

- Put browser tests under [`e2e`](e2e).
- Prefer stable role- and text-based selectors over brittle implementation selectors.
- Keep smoke coverage fast and focused. Add deeper scenarios only when a feature introduces real interaction risk.

### Storybook

- Put stories next to the component they document using `*.stories.tsx`.
- Add a story when isolated rendering makes UI development meaningfully easier, such as for a reused component, a visually distinct state, or a state that is cumbersome to reach through normal navigation. Do not create stories for every wrapper or incidental component.
- Use Storybook as a lightweight workbench for isolated visual review of component states. It is not a separate source of behavioral test coverage.
- Keep important product contracts covered by Vitest or Playwright even when a Storybook story illustrates the same state.
- Keep Storybook decorators and app-wide preview setup in [`.storybook`](.storybook), including CSS imports, font links, and Vite defines such as `__APP_VERSION__`.
- Run `pnpm storybook` for local review. CI runs `pnpm build-storybook` as a compilation smoke check, not as an interaction, accessibility, or visual-regression test suite.
- Do not add automated Storybook testing infrastructure unless growth in reusable components or story-only states creates a concrete maintenance need.

## Quality Gates

Before handing off substantial work, run the smallest relevant set of checks.

### Minimum For Most Code Changes

```bash
pnpm check
pnpm typecheck
pnpm test
```

### Required Before A PR For Meaningful UI Or Routing Changes

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm coverage
pnpm build
pnpm build-storybook
pnpm test:e2e
```

### Required For Dependency Or Install-Path Changes

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

Dependency changes are not ready to hand off just because installation succeeds. Agents and contributors must inspect policy-relevant failures instead of bypassing them. If pnpm rejects a package because of release-age policy, prefer the newest policy-compatible version. Do not commit `minimumReleaseAgeExclude` or similar cooldown bypasses unless a maintainer explicitly requests a reviewed emergency exception.

Temporary transitive overrides must be narrow, documented, and verified. Prefer exact compatible versions over broad `>=` ranges when the parent package imports internal APIs or otherwise has a tight compatibility surface. After adding or changing an override, rerun the dependency-change gate above; if a low or moderate advisory cannot be fixed safely, explain the upstream blocker rather than forcing an incompatible major version.

### Required For Database Schema Or Seed Changes

```bash
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm check
pnpm typecheck
pnpm test
```

Review generated SQL under [`drizzle/migrations`](drizzle/migrations) before applying it to any hosted database. Neon should be used only intentionally for hosted environments, not as the default local development target.

If you cannot run a check locally, say so explicitly in your handoff and explain why.

## Tooling Guardrails

### Biome

- Biome is the formatter and linter.
- Prefer `pnpm check` for validation and `pnpm format` for formatting fixes.
- Keep import organization compatible with Biome’s automatic behavior.

### pnpm

- `package.json` pins the project package manager version.
- [`.nvmrc`](.nvmrc) mirrors the Node `24.x` runtime target for local version managers.
- [`pnpm-workspace.yaml`](pnpm-workspace.yaml) owns pnpm 11 dependency build-script approvals and install policy through `allowBuilds`, `engineStrict`, and `strictDepBuilds`.
- If a future supply-chain incident needs temporary pnpm overrides, put them in [`pnpm-workspace.yaml`](pnpm-workspace.yaml), document the reason, and remove them once clean upstream versions are available.
- Do not add `pnpm approve-builds` to CI. Use it locally only as a review helper, then commit the explicit `allowBuilds` decision.

### Versioning

- `package.json` owns the current app version.
- [`VERSIONING.md`](VERSIONING.md) defines the release policy and checklist.
- Release-relevant changes must update both `package.json` `version` and [`CHANGELOG.md`](CHANGELOG.md); CI enforces this with `pnpm version:check`.
- The app reads the version through [`src/lib/version.ts`](src/lib/version.ts), which is populated by Vite from `package.json`.

### Vite And Vitest

- [`vitest.config.ts`](vitest.config.ts) intentionally does not reuse the full Vite app plugin stack.
- [`vite.config.ts`](vite.config.ts) is configured for TanStack Start on Cloudflare Workers.
- Do not pull the full TanStack Start or Cloudflare Workers runtime plugin stack into Vitest config unless there is a proven test need.

### Cloudflare Workers

- [`wrangler.jsonc`](wrangler.jsonc) is the source of truth for Cloudflare deployment configuration and bindings.
- [`worker-configuration.d.ts`](worker-configuration.d.ts) is generated by Wrangler and should be refreshed with `pnpm cf-typegen` after binding changes.
- Prefer `pnpm preview` before `pnpm deploy` when validating runtime changes.
- If bindings are added or changed, rerun `pnpm cf-typegen` and keep generated types aligned with the Wrangler config.

### Drizzle And PostgreSQL

- [`docker-compose.yml`](docker-compose.yml) defines the local PostgreSQL 17 service. It publishes container port `5432` on host port `55432` to avoid common Windows reservations around `5432`.
- [`drizzle.config.ts`](drizzle.config.ts) reads database credentials from `.env`.
- Keep runtime database clients explicit. [`src/db/client.worker.ts`](src/db/client.worker.ts) is the Cloudflare Worker runtime client and uses Drizzle's Neon HTTP driver; [`src/db/client.node.ts`](src/db/client.node.ts) is Node-only for scripts, seed work, migration support, and tests that need postgres-js; [`src/db/client.ts`](src/db/client.ts) must remain a runtime-safe shared type/env helper and must not import Node-only database modules.
- Do not import [`src/db/client.node.ts`](src/db/client.node.ts), `postgres`, or `drizzle-orm/postgres-js` from routes, services, or other Worker-facing modules. [`src/db/client-boundary.test.ts`](src/db/client-boundary.test.ts) enforces this boundary.
- Do not wire Hyperdrive into the Worker client until `wrangler.jsonc` has a Hyperdrive binding and generated Worker types are updated.
- [`src/db/schema/index.ts`](src/db/schema/index.ts) is the schema export surface used by Drizzle.
- Keep relation definitions in [`src/db/schema/relations.ts`](src/db/schema/relations.ts) unless a future refactor proves colocated relations are safe and clearer.
- Preserve tenant integrity in schema design. If child rows duplicate `organisation_id` while referencing a parent row, add a composite unique key on the parent and a composite foreign key from the child so mismatched tenant rows are impossible. Current examples include `assessment_attempts(team_id, organisation_id)` referencing `teams(id, organisation_id)`, and `assessment_answers(attempt_id, organisation_id)` plus `assessment_results(attempt_id, organisation_id)` referencing `assessment_attempts(id, organisation_id)`.
- Generate migrations with `pnpm db:generate`; do not hand-write or casually edit generated migration metadata.
- Apply and seed locally with `pnpm db:migrate` and `pnpm db:seed` after confirming `.env` points at `localhost:55432`.
- Keep seed data idempotent and useful for frontend/API development. Avoid seed records that imply product behavior not yet supported.

### Playwright

- [`playwright.config.ts`](playwright.config.ts) starts Vite directly for Windows-friendly cleanup.
- Preserve that behavior unless you have validated a replacement across local and CI execution.

### TypeScript Paths

- `#/*` and `@/*` both resolve to `src/*`.
- Prefer one alias style consistently within a file. Avoid mixing aliases and long relative traversals in the same area without a reason.

## Generated Files And Local Artifacts

Some files are generated or tool-owned. Treat them according to their owner and commit policy.

| Path | Owner | Commit? | Notes |
| --- | --- | --- | --- |
| [`drizzle/migrations/*.sql`](drizzle/migrations) | Drizzle Kit | Yes | Generated by `pnpm db:generate`; review SQL before applying it anywhere. |
| [`drizzle/migrations/meta/*.json`](drizzle/migrations/meta) | Drizzle Kit | Yes | Migration metadata; keep aligned with generated SQL and do not hand-edit casually. |
| [`worker-configuration.d.ts`](worker-configuration.d.ts) | Wrangler | Yes | Generated by `pnpm cf-typegen` after Cloudflare binding changes. |
| [`pnpm-lock.yaml`](pnpm-lock.yaml) | pnpm | Yes | Commit when dependencies or package-manager resolution change. |
| `src/routeTree.gen.ts` | TanStack Router | No | Generated route tree; ignored by git and should not be hand-edited. |
| `.claude/` | Claude Code | No | Local Claude Code settings only. |
| `.env` | Developer-local config | No | Local secrets/config only. Document names and safe defaults in [`.env.example`](.env.example). |
| `node_modules/`, `.pnpm-store/` | pnpm | No | Local dependency install/cache output. |
| `dist/`, `.output/`, `.wrangler/`, `.tanstack/`, `.nitro/`, `.vinxi/` | Build/runtime tools | No | Local generated build, preview, and tool state. |
| `coverage/`, `playwright-report/`, `test-results/`, `storybook-static/` | Test and UI review tools | No | Local test, coverage, and Storybook build output. |

## Secrets Handling

Never commit real credentials, tokens, hosted database URLs, Neon connection strings, Cloudflare secrets, R2 keys, npm tokens, or GitHub tokens.

- Use [`.env.example`](.env.example) for variable names and safe local defaults only.
- Use `.env` for local untracked values.
- Store hosted/staging/production secrets in the relevant platform secret manager, such as GitHub environments, Cloudflare settings, or the hosting provider secret store.
- Local Docker PostgreSQL credentials in [`.env.example`](.env.example) are non-secret development defaults. Neon URLs and pooled hosted database URLs are secrets.
- Before sharing logs, PR descriptions, screenshots, or generated docs, redact values for `DATABASE_URL`, `DATABASE_URL_POOLED`, R2 keys, Cloudflare tokens, Neon connection strings, and any access token.

## Change Management

When making edits:

- Avoid unrelated refactors in the same PR.
- Update docs when workflow or conventions change.
- Preserve comments that document non-obvious framework or platform workarounds.
- Do not remove devtools, CI steps, or config exceptions casually; many are there for concrete TanStack Start or Windows reasons.

## Maintainer Expectations

Contributors and agents should assume maintainers value:

- Small PRs with a single clear purpose
- Predictable file placement and naming
- Evidence that the relevant checks were considered
- Updated tests when behavior changes
- Updated docs when contributor-facing behavior changes
- Avoidance of speculative architecture

If a change is technically valid but makes the repo harder to reason about, prefer the simpler option.

## PR Scope

Good pull requests in this repo usually:

- Solve one problem or ship one cohesive improvement
- Avoid mixing formatting churn with product or architecture changes
- Include tests or an explanation for why tests were not added
- Keep commit diffs readable and intentional
- Mention follow-up work separately instead of bundling it into the same PR

Avoid PRs that combine:

- tooling changes plus feature work
- broad file moves plus behavior changes
- design rewrites plus unrelated cleanup

If a change needs multiple phases, split it into follow-up PRs.

## Backward Compatibility

When the app gains more routes, components, or data flows, contributors should preserve compatibility where practical.

- Do not break existing routes, navigation, or primary calls to action without a clear product reason.
- Treat public URLs and major user-visible flows as stable unless the change explicitly redefines them.
- If a refactor changes shared APIs, props, helpers, or route contracts, update all current call sites in the same change.
- Prefer additive changes before destructive ones when introducing new patterns.

For early-stage apps, backward compatibility does not mean freezing the design. It means avoiding accidental breakage and communicating intentional change clearly.

## Community Norms

This repository should be approachable to new contributors.

- Write code and docs that can be understood without insider context.
- Prefer plain language over team-specific shorthand.
- Leave concise comments only where they prevent real confusion.
- Be explicit when something is generated, temporary, or intentionally constrained.
- When reviewing or handing off work, call out risks directly and respectfully.

Assume future contributors may be unfamiliar with TanStack Start, Tailwind v4, or the repo’s visual direction. Good docs should help them succeed quickly.

## Safe Refactor Boundaries

These changes are usually safe when covered by tests:

- Extracting repeated JSX into a shared component
- Adding new route files
- Extending CSS tokens and shared layout classes
- Adding route-local tests
- Tightening TypeScript types

These changes need extra caution:

- Editing [`src/routes/__root.tsx`](src/routes/__root.tsx)
- Changing router creation in [`src/router.tsx`](src/router.tsx)
- Modifying generated-file behavior
- Changing Drizzle schema, generated migrations, database client behavior, or tenant-scoped service helpers
- Changing Vite, Vitest, Playwright, Biome, or CI configuration
- Reworking the Kelsier visual system in [`src/styles/kelsier.css`](src/styles/kelsier.css)

## Scalable Feature Pattern

For new product features, prefer this progression:

1. Start with a route file under `src/routes`.
2. Keep one-off sections local until a second use case appears.
3. Extract reusable UI into `src/components/<feature>` or `src/components`.
4. Move shared helpers into `src/lib`.
5. Add unit tests alongside source and one E2E test only for the most important flow.

This keeps the repo lightweight early while still creating clean seams for future growth.

## Definition Of Done

A change is ready to hand off when:

- The implementation matches the request.
- The code follows the routing and styling conventions above.
- Generated files were not manually edited.
- Relevant checks were run, or skipped checks were called out explicitly.
- Claims of completion are backed by exact command results, not assumptions from partial checks.
- Tests were added or updated where behavior changed.
- Docs were updated if contributors or agents would otherwise guess.
- The PR scope remains focused enough for an open source maintainer to review efficiently.

## Handoff Template

When summarizing work, include:

- What changed
- Any important assumptions
- Which checks were run
- Any checks not run
- Any follow-up risk or recommended next step

This keeps human and agent collaboration predictable as the repo grows.
