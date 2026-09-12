# Staging operations

The maintainer explicitly placed public launch on hold on 2026-09-12. This checklist covers existing staging only. Completing it does not authorize public launch, promotion, or a version bump. The decision table remains in [assessment-mvp.md](assessment-mvp.md).

## Cleanup verification

Worker `project-kelsier` is deployed as `7f3fde5d-777d-438d-afa0-f814ec8b12a5`. The daily cron is `17 3 * * *` (UTC). Its first scheduled invocation after deployment is due **2026-09-13 at 03:17 UTC**. Allow a 15-minute investigation window for execution and log ingestion; do not report a missed run before it is due.

The definitions in [staging-monitoring.json](staging-monitoring.json) are saved-query creation bodies for `POST /accounts/{account_id}/workers/observability/queries`. Check existing names before creating duplicates. For read-only verification, pass a definition's `parameters` to `POST /accounts/{account_id}/workers/observability/telemetry/query`, with `dry: true`, `view: "events"`, a query ID, and explicit `timeframe.from`/`timeframe.to` Unix milliseconds. Account ID: `91a80a519a166e4f74105b8868ab2c4f`. Use an authenticated connector or approved credential store; never commit tokens.

Verify the success belongs to the current Worker version and expected scheduled day. Record UTC time, version ID, deleted-session count, and duration. Zero deletions is valid when nothing has expired. A missing success needs investigation even if failures are zero: a missing invocation or unavailable telemetry cannot log a failure. Inspect scheduled invocation exceptions too, since an early failure may not reach the structured logger.

On failure, inspect sanitized `deletedGuestSessions` and `batches`; earlier batches remain committed. Investigate connectivity, lock contention, backlog, and invocation limits before retrying. Do not change expiry dates, discard guest records, or repeatedly trigger a failing job to make the check green. Any rollback should use the actual preceding Worker version; leave additive migration 0012 in place.

## Notification acceptance

Proposed staging conditions to configure once supported access is available:

- At least one `assessment_cleanup_failed` event for this Worker within 15 minutes; also cover scheduled invocation exceptions before the logger.
- No success by 03:32 UTC after the daily scheduled run, with telemetry availability checked before concluding cleanup failed.
- Notify the approved recipient, `curiousphreak@gmail.com`, with Worker name, UTC time, event category, partial-deletion count if available, and a dashboard link. Exclude SQL, cookies, credentials, request bodies, and answers.

A notification destination does not define an alert condition. A saved query does not schedule evaluation or deliver alerts. A provider test email proves delivery only; a controlled rule test is also required. Use a synthetic test isolated from real cleanup rather than causing a hosted database error. Enabling delivery and sending a test require explicit authorization to send messages; none were sent during this preparation.

On 2026-09-12 the runtime available-alerts response exposed `workers_observability_alert` with `FIRING_FAILED` and `NORMAL` statuses, but the public OpenAPI notification enum omitted that type and exposed no Workers alert-rule creation endpoint. Verify the supported dashboard workflow before enabling a destination. No connected browser was available in this session. Do not substitute an unfiltered account-wide policy for a Worker-specific rule.

## Independent deletion exercise

A reviewer other than the implementer should use a fresh staging browser session, start a disposable attempt, complete it, then reload to verify persistence. Open deletion confirmation, cancel once, then confirm deletion. Reload and verify the result is gone and the start action returns. Repeat deletion on an incomplete attempt after reload without consuming its resume. Record date, browser, reviewer, and observed results, without cookies or answers. Implementer smoke tests do not satisfy this independent-review gate.

## Evidence and access limits

The exact query filters ran successfully on 2026-09-12 over the preceding and current day: two cleanup successes under the previous Worker version and zero structured failures. Saving through the Cloudflare connector returned `10000: Authentication error`; no saved-query IDs were returned. Notification policies were empty at the deployment check. Definitions are prepared locally; saved queries, active alert rules, and delivery remain unverified.

References: [Workers Query Builder](https://developers.cloudflare.com/workers/observability/query-builder/) and [Workers API](https://developers.cloudflare.com/api/resources/workers/).
