# Changelog

All notable changes to Project Kelsier will be documented in this file.

This project follows semantic versioning while it moves toward MVP. Versions below `1.0.0` may still include breaking product or API changes when they are called out here.

## [0.3.4] - 2026-08-11

### Added

- Documented the approved guest-first assessment MVP boundaries, dependency policy, phased delivery, and public-launch gate.
- Added a dedicated PostgreSQL CI job that applies migrations and verifies the development seed is idempotent.
- Added stable same-organisation and cross-organisation development fixtures for future ownership-isolation tests.

### Changed

- Replaced organisation-owned assessment attempts with personal guest-session or user ownership enforced by an exactly-one-owner database constraint.
- Normalized assessment answers and results to derive authorization through their owning attempt, and updated service helpers to enforce user ownership through that boundary.
- Added explicit question requiredness, fixed guest-session expiry metadata, and result scoring provenance with database-enforced assessment-version consistency.
- Routed the Cloudflare Worker database client through a cache-disabled Hyperdrive binding while preserving direct local PostgreSQL access for Node tooling.
- Replaced the landing-page questionnaire constant with the active PostgreSQL-backed assessment version, ordered questions, and ordered options through a TanStack Start server function.
- Added database-backed browser-test infrastructure and explicit optional-question progression behavior.

### Security

- Pinned patched transitive Undici, Nano ID, and JS-YAML releases for newly disclosed high-severity advisories.

## [0.3.3] - 2026-08-17

### Added

- Added an on-demand, review-only Claude GitHub workflow that maintainers can invoke with `@claude` in pull request conversations.

### Security

- Limited the Claude workflow to repository read access plus pull request and issue feedback, and pinned its GitHub Actions dependencies to reviewed commits.

## [0.3.2] - 2026-08-03

### Changed

- Aligned generated-route handling with TanStack Router guidance by committing `src/routeTree.gen.ts` as runtime source while keeping it excluded from manual formatting and tests.

## [0.3.1] - 2026-08-01

### Changed

- Updated the pinned pnpm package manager from 11.11.0 to 11.18.0.
- Upgraded compatible application and tooling dependencies, including React 19.2.8, Vite 8.2.0, Tailwind CSS 4.3.3, Storybook 10.5.5, Playwright 1.62.1, the TanStack packages, and the Cloudflare Vite plugin 1.50.0 with Wrangler 4.118.0.

### Security

- Resolved the high-severity PostCSS, Sharp, and `brace-expansion` advisories through patched dependency resolutions, with no release-age policy exceptions.

## [0.3.0] - 2026-08-01

### Added

- Added four selectable dark Kelsier color themes—Ember Gold, Phthalo Green, Signal Coral, and Volt Lime—with locally persisted user selection.

### Changed

- Replaced embedded Kelsier UI and data-visualization colors with semantic theme tokens so future palettes can be added without component rewrites.
- Made Volt Lime the default Kelsier color theme while preserving locally saved theme choices.
- Centralized theme metadata and restored saved themes before first paint, with contract coverage keeping selectable themes aligned with their CSS token blocks.

## [0.2.5] - 2026-07-23

### Changed

- Added Storybook with React Vite, an accessibility addon, component-specific baseline Kelsier stories, and a CI build smoke check for the lightweight visual workbench.
- Pinned patched `js-yaml` 4.3.0 for TanStack Start's transitive XML tooling and documented the remaining development-only Sharp advisory blocked by Miniflare's exact dependency pin.

## [0.2.4] - 2026-07-11

### Changed

- Updated safer same-major dependencies: `@tailwindcss/vite` and `tailwindcss` 4.3.2, `@tanstack/react-router` 1.170.17, `@tanstack/react-start` 1.168.27, `@tanstack/router-plugin` 1.168.19, `lucide-react` 1.24.0, `@biomejs/biome` 2.5.3, `@types/node` 24.13.3, `vitest` and `@vitest/coverage-v8` 4.1.10, `tsx` 4.23.0, `vite` 8.1.4, `@cloudflare/vite-plugin` 1.44.0, `wrangler` 4.110.0, and `typescript` 7.0.2.
- Updated the pinned pnpm package manager from 11.9.0 to 11.11.0.

## [0.2.3] - 2026-06-26

### Changed

- Updated the pinned pnpm package manager from 11.5.3 to 11.9.0.
- Tightened agent-facing dependency maintenance guidance to require policy-compatible upgrades, narrow overrides, and exact command results in handoffs.
- Documented future release SBOM generation as a release artifact, without adding it to normal CI or committing generated SBOM files.

## [0.2.2] - 2026-06-25

### Changed

- Updated dependencies to latest policy-compatible versions: `tailwindcss` + `@tailwindcss/vite` 4.3.1, `vite` 8.1.0, `@cloudflare/vite-plugin` 1.42.2, `wrangler` 4.104.0, `@biomejs/biome` 2.5.1, `@playwright/test` 1.61.1, `@tanstack/react-router` 1.170.16, `@tanstack/react-start` 1.168.26, `@tanstack/react-devtools` 0.10.8, `@tanstack/devtools-vite` 0.8.1, `vitest` + `@vitest/coverage-v8` 4.1.9, `@vitejs/plugin-react` 6.0.3, `lucide-react` 1.21.0.
- Migrated `biome.json` to the 2.5.1 schema (`recommended` → `preset: "recommended"`).
- Tightened temporary transitive dependency overrides for current npm advisories while keeping direct TanStack pins exact.
- Ignored local Claude Code settings under `.claude/`.

## [0.2.1] - 2026-06-10

### Changed

- Updated all direct dependencies to latest compatible versions: Tailwind CSS 4.3.0, Vite 8.0.16, Wrangler 4.99.0, `@cloudflare/vite-plugin` 1.40.1, TanStack Router 1.170.15, TanStack Start 1.168.25, `@tanstack/router-plugin` 1.168.18, `@tanstack/react-router-ssr-query` 1.167.1, Playwright 1.60.0, Biome 2.4.16, and assorted minor bumps to React, lucide-react, tsx, and `@types/*` packages.
- Excluded `.claude/` directory from Biome's check scope to prevent false positives on Claude Code's space-indented settings files.

## [0.2.0] - 2026-05-28

### Added

- Added a Drizzle/PostgreSQL foundation with schema modules, relations, migrations, local seed data, and thin service-layer query helpers.
- Added Docker Compose local PostgreSQL development on `localhost:55432` for migrations, seed testing, and destructive resets.

### Changed

- Documented local database setup, Drizzle migration workflow, and the local Docker PostgreSQL default separate from hosted Neon environments.

## [0.1.3] - 2026-05-24

### Added

- Added a Kelsier-styled invalid route page for unknown URLs.

## [0.1.2] - 2026-05-18

### Added

- Added visible GitHub repository links to the Kelsier navigation and footer.

## [0.1.1] - 2026-05-17

### Changed

- Completed follow-up hardening for GHSA-g7cv-rxg3-hmpx / CVE-2026-45321 by normalizing TanStack packages to clean post-incident releases.
- Updated direct TanStack dependencies to clean post-incident versions and removed temporary transitive pnpm overrides.
- Reworked security hardening documentation into a standing baseline with historical incident context.
- Synchronized contributor, versioning, and README checklists with the current pnpm install and signature-audit workflow.
- Added CI enforcement for release-relevant PRs to update both `package.json` version and `CHANGELOG.md`.
- Included repository tooling scripts in the release-relevant version metadata check.

## [0.1.0] - 2026-05-10

### Added

- Initial MVP version marker for Project Kelsier.
- App version metadata exposed in the Kelsier footer.
- Versioning workflow notes for future release preparation.
