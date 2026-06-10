# Changelog

All notable changes to Project Kelsier will be documented in this file.

This project follows semantic versioning while it moves toward MVP. Versions below `1.0.0` may still include breaking product or API changes when they are called out here.

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
