# Changelog

All notable changes to Project Kelsier will be documented in this file.

This project follows semantic versioning while it moves toward MVP. Versions below `1.0.0` may still include breaking product or API changes when they are called out here.

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
