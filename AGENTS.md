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
- Styling: Tailwind CSS v4 plus authored CSS in [`src/styles.css`](/C:/Users/magmi/Repos/organization/project-kelsier/src/styles.css).
- Testing: Vitest for unit tests and Playwright for end-to-end coverage.
- Quality gate: Biome for formatting, linting, and import organization.
- Package manager: `pnpm`
- Runtime target: Node `24.x`

Current app shape is intentionally small:

- One root shell in [`src/routes/__root.tsx`](/C:/Users/magmi/Repos/organization/project-kelsier/src/routes/__root.tsx)
- One route file in [`src/routes/index.tsx`](/C:/Users/magmi/Repos/organization/project-kelsier/src/routes/index.tsx)
- One shared component in [`src/components/Header.tsx`](/C:/Users/magmi/Repos/organization/project-kelsier/src/components/Header.tsx)
- Global design tokens and layout styles in [`src/styles.css`](/C:/Users/magmi/Repos/organization/project-kelsier/src/styles.css)

This guide assumes the repo will grow from that starting point, so several sections below define conventions for scale before they are strictly required.

## Source Of Truth

When instructions disagree, use this order of precedence:

1. Explicit user request
2. This `AGENTS.md`
3. [`README.md`](/C:/Users/magmi/Repos/organization/project-kelsier/README.md)
4. [`CONTRIBUTING.md`](/C:/Users/magmi/Repos/organization/project-kelsier/CONTRIBUTING.md)
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

- [`src/routes`](/C:/Users/magmi/Repos/organization/project-kelsier/src/routes): Route files and route-owned page composition.
- [`src/components`](/C:/Users/magmi/Repos/organization/project-kelsier/src/components): Reusable presentational components shared by multiple routes or sections.
- [`src/styles.css`](/C:/Users/magmi/Repos/organization/project-kelsier/src/styles.css): Global design tokens, global element styles, shared utility classes, and route-agnostic page patterns.
- [`src/router.tsx`](/C:/Users/magmi/Repos/organization/project-kelsier/src/router.tsx): Router creation only.
- [`e2e`](/C:/Users/magmi/Repos/organization/project-kelsier/e2e): End-to-end tests that validate cross-page user-visible behavior.
- [`public`](/C:/Users/magmi/Repos/organization/project-kelsier/public): Static assets that should be served directly.

When the app grows, prefer adding these folders rather than overloading existing files:

- `src/components/<feature>` for reusable feature-level UI
- `src/lib` for framework-agnostic helpers and utilities
- `src/hooks` for custom React hooks
- `src/server` for server-only helpers used by TanStack Start routes or loaders
- `src/test` for shared test utilities, mocks, and render helpers

Add folders only when there is a real second use case. Do not pre-build a large architecture for a small feature.

## Routing Rules

TanStack Router file-based routing is the organizing backbone of the app.

- Add new pages under [`src/routes`](/C:/Users/magmi/Repos/organization/project-kelsier/src/routes).
- Keep route files focused on route concerns: page composition, route metadata, loaders, and route-local state.
- If a route grows past a reasonable reading size, move repeated or dense UI blocks into `src/components`.
- Keep shared document-level concerns in [`src/routes/__root.tsx`](/C:/Users/magmi/Repos/organization/project-kelsier/src/routes/__root.tsx), not duplicated across routes.

### Generated Route Tree

[`src/routeTree.gen.ts`](/C:/Users/magmi/Repos/organization/project-kelsier/src/routeTree.gen.ts) is generated by TanStack Router.

- Do not hand-edit it.
- Do not add tests that assert against its implementation details.
- If route changes require regeneration, use the normal app/tooling workflow instead of manual edits.

## Component Conventions

- Prefer function components with explicit, readable props.
- Keep components small enough that their purpose is obvious from one screen of code.
- Co-locate tiny route-specific subcomponents with the route until reuse is proven.
- Promote a component into [`src/components`](/C:/Users/magmi/Repos/organization/project-kelsier/src/components) when it is shared, reused, or represents an important design primitive.
- Avoid deeply nested prop drilling when a route can compose sections more directly.

For this repo specifically:

- [`src/components/Header.tsx`](/C:/Users/magmi/Repos/organization/project-kelsier/src/components/Header.tsx) is part of the persistent shell, so changes there affect the whole site.
- The root document currently owns the header and devtools. Preserve that separation unless there is a strong product reason to move layout ownership.

## Styling Rules

The current styling approach is hybrid: Tailwind v4 is available, but much of the visual system is defined in authored CSS.

- Reuse the tokens and patterns in [`src/styles.css`](/C:/Users/magmi/Repos/organization/project-kelsier/src/styles.css) before introducing new one-off values.
- Prefer CSS custom properties for reusable colors, surfaces, shadows, and visual identity decisions.
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

The current app is mostly static. As data needs grow:

- Keep route data fetching close to the route when the data is route-owned.
- Move shared transformation logic into `src/lib` rather than embedding it in JSX.
- Separate server-only logic from client components as soon as that distinction matters.
- Avoid introducing a global client state library without a concrete need.

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

### E2E Tests

- Put browser tests under [`e2e`](/C:/Users/magmi/Repos/organization/project-kelsier/e2e).
- Prefer stable role- and text-based selectors over brittle implementation selectors.
- Keep smoke coverage fast and focused. Add deeper scenarios only when a feature introduces real interaction risk.

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
pnpm test:e2e
```

If you cannot run a check locally, say so explicitly in your handoff and explain why.

## Tooling Guardrails

### Biome

- Biome is the formatter and linter.
- Prefer `pnpm check` for validation and `pnpm format` for formatting fixes.
- Keep import organization compatible with Biome’s automatic behavior.

### Vite And Vitest

- [`vitest.config.ts`](/C:/Users/magmi/Repos/organization/project-kelsier/vitest.config.ts) intentionally does not reuse the full Vite app plugin stack.
- Do not pull Nitro, TanStack Start, or unrelated long-lived app plugins into Vitest config unless there is a proven test need.

### Playwright

- [`playwright.config.ts`](/C:/Users/magmi/Repos/organization/project-kelsier/playwright.config.ts) starts Vite directly for Windows-friendly cleanup.
- Preserve that behavior unless you have validated a replacement across local and CI execution.

### TypeScript Paths

- `#/*` and `@/*` both resolve to `src/*`.
- Prefer one alias style consistently within a file. Avoid mixing aliases and long relative traversals in the same area without a reason.

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

- Editing [`src/routes/__root.tsx`](/C:/Users/magmi/Repos/organization/project-kelsier/src/routes/__root.tsx)
- Changing router creation in [`src/router.tsx`](/C:/Users/magmi/Repos/organization/project-kelsier/src/router.tsx)
- Modifying generated-file behavior
- Changing Vite, Vitest, Playwright, Biome, or CI configuration
- Reworking the global visual system in [`src/styles.css`](/C:/Users/magmi/Repos/organization/project-kelsier/src/styles.css)

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
