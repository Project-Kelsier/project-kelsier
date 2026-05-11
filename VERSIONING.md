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
- Update [`CHANGELOG.md`](./CHANGELOG.md) in the same change as any version bump.

## Release Checklist

Before tagging a release:

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Then create a tag that matches the package version:

```bash
git tag v$(pnpm version:show)
```
