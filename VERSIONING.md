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

CI enforces this with `pnpm version:check`. The check compares a pull request with the base branch and fails when release-relevant files changed without a version increase and changelog update.

## Release Checklist

Before tagging a release:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm audit signatures
pnpm rebuild
pnpm version:check
pnpm check
pnpm typecheck
pnpm test
pnpm coverage
pnpm build
pnpm test:e2e
```

Then create a tag that matches the package version:

```bash
git tag v$(pnpm version:show)
```

Use `VERSION_CHECK_BASE_REF=<ref> pnpm version:check` to compare against a local base other than `origin/main`.
