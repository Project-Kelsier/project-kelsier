# Hosted staging and dummy-production operations

The maintainer explicitly placed public launch on hold on 2026-09-12. These operations cover staging and dummy production; neither label authorizes public launch or promotion. The decision table remains in [assessment-mvp.md](assessment-mvp.md#public-launch-gate). The repository version in [`package.json`](../package.json) may be newer than the last recorded hosted deployment.

## Hosted targets

The maintainer confirmed these roles and approved temporarily sharing the existing Neon database on 2026-10-16. See [the database decision and separation triggers](database.md#temporary-shared-hosted-database). Worker names are `project-kelsier` in both accounts; always select the account explicitly.

| Target | URL | Cloudflare account ID | Hyperdrive ID | Scheduled cleanup |
| --- | --- | --- | --- | --- |
| Staging | <https://project-kelsier.mindphreak.workers.dev/> | `91a80a519a166e4f74105b8868ab2c4f` | `280a2e296ce34b2796b63a6ed11f568a` | `17 3 * * *` for the shared database |
| Dummy production | <https://project-kelsier.curiousphreak.workers.dev/> | `6015d7a8e1e0a004f327dc612cdd50b1` | `fb35dd8042e34e078d63b3f15f315c07` | None; staging owns cleanup |

Both Hyperdrive configurations disable query caching. Dummy production uses an origin connection limit of five to limit its additional pool demand. No credentials belong in this table or a committed deployment config.

Deployment evidence on 2026-10-16: merged commit `1b369ae` (app `0.4.4`) is active at 100% on staging as Worker version `93095658-3eec-44c4-8d14-7e7050a043a0` and dummy production as `272b20c5-89d6-4df3-ae2b-9986e249d5fc`. Both sites passed hosted checks for page responses, no-store headers, secure guest cookies, cross-site/anonymous write rejection, completion and reload, exactly one resume, and deletion. Disposable test attempts were removed. The shared database already had all 13 reviewed migrations; no hosted migration or seed was needed. API verification confirmed staging's daily cron and an empty dummy-production schedule. This verifies configuration, not execution of the next scheduled cleanup or the independent reviewer launch gate.

### Deploying the same build to both accounts

`wrangler.jsonc` remains the staging configuration. Build once with `pnpm build`, then validate with `pnpm worker:check` and preview the result. After verifying the authenticated account, deploy staging with `CLOUDFLARE_ACCOUNT_ID` set to its ID. Preserve dashboard variables with `--keep-vars`.

Dummy production needs a derived config because Hyperdrive IDs belong to their Cloudflare account and it must not duplicate the shared cleanup cron. After every build, regenerate an ignored config from `dist/server/wrangler.json`, retaining the built Worker/module settings and rate-limit bindings. The following Node command works from the repository root:

```bash
node --input-type=module -e "import fs from 'node:fs'; import path from 'node:path'; const c=JSON.parse(fs.readFileSync('dist/server/wrangler.json','utf8')); c.account_id='6015d7a8e1e0a004f327dc612cdd50b1'; c.main=path.resolve('dist/server',c.main); c.assets.directory=path.resolve('dist/server',c.assets.directory); c.hyperdrive=[{binding:'HYPERDRIVE',id:'fb35dd8042e34e078d63b3f15f315c07'}]; c.triggers={crons:[]}; c.workers_dev=true; delete c.configPath; delete c.userConfigPath; fs.mkdirSync('.wrangler/dummy-production',{recursive:true}); fs.writeFileSync('.wrangler/dummy-production/wrangler.json',JSON.stringify(c,null,2));"
```

Use a Wrangler login with access to the dummy-production account. Locally, the `curiousphreak` auth profile holds that login; profile credentials remain in Wrangler's credential store. Clear any staging `CLOUDFLARE_ACCOUNT_ID` override before running:

```bash
pnpm exec wrangler deploy --profile curiousphreak --config .wrangler/dummy-production/wrangler.json --dry-run
pnpm exec wrangler deploy --profile curiousphreak --config .wrangler/dummy-production/wrangler.json --keep-vars
```

Do not deploy the unmodified staging build config to the second account. Record the previous and new Worker version IDs, verify the active deployment and bindings, and smoke-test each hostname using only disposable guest attempts. Check pages, secure cookies, persistence, deletion, and cross-site/anonymous write rejection. Apply any reviewed shared-schema migration once, not once per account. Do not promote either site publicly through this procedure.

## Cleanup verification

Historical deployment evidence (2026-09-12): Worker `project-kelsier`, app version `0.4.0`, was deployed as `7f3fde5d-777d-438d-afa0-f814ec8b12a5`. Its first scheduled invocation was due 2026-09-13 at 03:17 UTC; verification of that run has not been recorded here. This historical snapshot does not establish the currently deployed version or ongoing cleanup health; the latest deployment checkpoint is under [hosted targets](#hosted-targets).

Before each check, identify the active Worker version and its deployed schedule. The repository config specifies `17 3 * * *` (daily at 03:17 UTC). Check a recent expected invocation and allow a 15-minute investigation window for execution and log ingestion; do not report a missed run before it is due.

The definitions in [staging-monitoring.json](staging-monitoring.json) are saved-query creation bodies for `POST /accounts/{account_id}/workers/observability/queries`. Check existing names before creating duplicates. For read-only verification, pass a definition's `parameters` to `POST /accounts/{account_id}/workers/observability/telemetry/query`, with `dry: true`, `view: "events"`, a query ID, and explicit `timeframe.from`/`timeframe.to` Unix milliseconds. Account ID: `91a80a519a166e4f74105b8868ab2c4f`. Use an authenticated connector or approved credential store; never commit tokens.

Verify the success belongs to the current Worker version and expected scheduled day. Record UTC time, version ID, deleted-session count, and duration. Zero deletions is valid when nothing has expired. A missing success needs investigation even if failures are zero: a missing invocation or unavailable telemetry cannot log a failure. Inspect scheduled invocation exceptions too, since an early failure may not reach the structured logger.

On failure, inspect sanitized `deletedGuestSessions` and `batches`; earlier batches remain committed. Investigate connectivity, lock contention, backlog, and invocation limits before retrying. Do not change expiry dates, discard guest records, or repeatedly trigger a failing job to make the check green. Any rollback should use the actual preceding Worker version; leave additive migration 0012 in place.

## Notification acceptance

Proposed staging conditions to configure once supported access is available:

- At least one `assessment_cleanup_failed` event for this Worker within 15 minutes; also cover scheduled invocation exceptions before the logger.
- No success by 03:32 UTC after the daily scheduled run, with telemetry availability checked before concluding cleanup failed.
- Notify the approved recipient, `curiousphreak@gmail.com`, with Worker name, UTC time, event category, partial-deletion count if available, and a dashboard link. Exclude SQL, cookies, credentials, request bodies, and answers.

A notification destination does not define an alert condition. A saved query does not schedule evaluation or deliver alerts. A provider test email proves delivery only; a controlled rule test is also required. Use a synthetic test isolated from real cleanup rather than causing a hosted database error. Enabling delivery and sending a test require explicit authorization to send messages; none were sent during this preparation.

On 2026-09-12 the runtime available-alerts response exposed `workers_observability_alert` with `FIRING_FAILED` and `NORMAL` statuses, but the public OpenAPI notification enum omitted that type and exposed no Workers alert-rule creation endpoint. This is a dated access finding; verify the currently supported dashboard or API workflow before enabling a destination. Do not substitute an unfiltered account-wide policy for a Worker-specific rule.

## Independent deletion exercise

A reviewer other than the implementer should use a fresh staging browser session, start a disposable attempt, complete it, then reload to verify persistence. Open deletion confirmation, cancel once, then confirm deletion. Reload and verify the result is gone and the start action returns. Repeat deletion on an incomplete attempt after reload without consuming its resume. Record date, browser, reviewer, and observed results, without cookies or answers. Implementer smoke tests do not satisfy this independent-review gate.

## Evidence and access limits

The exact query filters ran successfully on 2026-09-12 over the preceding and current day: two cleanup successes under the previous Worker version and zero structured failures. Saving through the Cloudflare connector returned `10000: Authentication error`; no saved-query IDs were returned. Notification policies were empty at the deployment check. Definitions are prepared locally; saved queries, active alert rules, and delivery remain unverified.

References: [Workers Query Builder](https://developers.cloudflare.com/workers/observability/query-builder/) and [Workers API](https://developers.cloudflare.com/api/resources/workers/).
