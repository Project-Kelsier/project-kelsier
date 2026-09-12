# Versioning

Project Kelsier uses `package.json` as the source of truth for the app version.

## Current Version

```bash
pnpm version:show
```

## Version Policy

- Use semantic versioning: `MAJOR.MINOR.PATCH`.
- Stay below `1.0.0` until the MVP product contract is stable.
- Use minor bumps for meaningful MVP feature increments.
- Use patch bumps for bug fixes, copy updates, and low-risk tooling changes.
- Release-relevant pull requests must update both `package.json` `version` and [`CHANGELOG.md`](./CHANGELOG.md).
- The new `package.json` version must be greater than the base branch version.

The increase is evaluated across the PR against its base, not required again for every review-fix commit. Unreleased changelog notes may be added without changing the app version; explicit maintainer instructions control when the next bump or release occurs.

Assigning an app version and documenting its changes does not authorize tagging, publishing, or public launch. The assessment MVP and PR 36 hardening remain version `0.4.0`; the maintainer has authorized that version while keeping its public release on hold.

CI enforces this with `pnpm version:check`. The check compares a pull request with the base branch and fails when release-relevant files changed without a version increase and changelog update.

## Release Checklist

Before tagging a release:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm audit signatures
pnpm audit --audit-level high
pnpm rebuild
pnpm version:check
pnpm check
pnpm typecheck
pnpm test
pnpm coverage
pnpm build
pnpm worker:check
pnpm build-storybook
pnpm test:e2e
```

Then create a tag that matches the package version:

```bash
git tag v$(pnpm version:show)
```

Use `VERSION_CHECK_BASE_REF=<ref> pnpm version:check` to compare against a local base other than `origin/main`.
