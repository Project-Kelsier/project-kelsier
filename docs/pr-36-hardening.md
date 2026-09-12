# PR 36 hardening plan

Work proceeds in reviewable phases. A phase is complete only after its checks pass; this checklist does not certify the application free of security defects. Hosted changes and launch approval remain separate from local hardening.

The maintainer confirmed that the assessment MVP and this hardening work belong to version `0.4.0`; no patch bump is requested. Public release remains on hold. Phase 1's proposed version/changelog bump was removed before commit; the completed hardening notes are now included in the `0.4.0` changelog entry.

## 1. Database invariants and validation

- Enforce one unfinished attempt per guest session and assessment version, with a generated additive migration and a controlled conflict response.
- Reject empty questionnaires and questions without options before starting an attempt.
- Require valid expiry and new-session credentials before database writes.
- Verify constraints and concurrent creation against local PostgreSQL, plus unit tests and the repository code gates.

## 2. Concurrent lifecycle and recovery

- Serialize answer reads/writes and completion so scores match the committed answers.
- Exercise save versus complete, resume versus save, replacement versus completion, duplicate completion, and deletion races.
- Preserve credential rotation, one explicit resume, optional final questions, and completion retry behavior.
- Remove any recovery path that presents an unsubmitted response as a completed result.

## 3. HTTP security and runtime

- Test guest cookie flags, absent/malformed credentials, input validation, cross-session access, and error/status mapping.
- Verify framework same-origin/CSRF protection and private-response cache behavior.
- Verify trusted request IP handling; protect mutation traffic without preventing normal questionnaire use.
- Evaluate simultaneous starts before the browser receives its first guest cookie; the per-session database constraint does not deduplicate separate newly issued sessions.
- Reuse clients within requests; retain request-scoped Hyperdrive clients and prepared statements per Cloudflare guidance.

## 4. Provenance and retention

- Prevent seed updates from altering questions, options, or scoring inputs used by existing attempts; require explicit new versions for changed content.
- Bound expiry cleanup and verify cascade behavior and monitoring failures.
- Assess historical migration concerns against existing deployment evidence. Do not rewrite applied migrations or silently discard duplicate attempts.
- Preserve approved seven-day guest retention and explicit owner-authorized deletion of completed results.

## 5. UI, CI, and final verification

- Clarify required questions, save failures, keyboard focus, and shared deletion confirmation.
- Fix fixture data and weak assertions, including parsed Worker configuration and ownership constraints.
- Pin CI PostgreSQL images to a verified digest and disable persisted checkout credentials.
- Record the disposition of every review finding, including deferred caching and documentation suggestions.
- Run check, typecheck, test, coverage, build, build-storybook, test:e2e, worker:check, and version:check. Run migration/seed and binding-generation checks where applicable.

## Progress

- Phase 1: complete locally on 2026-09-12. Generated and reviewed `0012_furry_shiva.sql`; applied only to `localhost:55432/kelsier_dev`. Local seed succeeded. `RUN_DB_TESTS=true pnpm test` passed 93 tests across 20 files, including four PostgreSQL integrity cases. `pnpm check`, `pnpm typecheck`, `pnpm version:check`, and `git diff --check` passed. The database CI job now enables the PostgreSQL cases.
- Phase 2: complete locally on 2026-09-12. Completion locks the owned attempt before reading answers; replacement locks and rechecks the incomplete attempt before deletion. Removed the incomplete-entry completion flag: only a stored result initializes the completed UI. Added deterministic PostgreSQL lock-wait regressions, concurrent completion and deletion cases, credential-rotation checks, missing-required/optional-final coverage, and a UI submission-retry test. Coverage run passed all 100 tests (20 files); lint, typecheck, version metadata, production build, Storybook build, and all 18 cross-browser tests passed. Version remains 0.4.0. Storybook emitted a non-failing chunk-size warning.
- Phase 3: complete locally on 2026-09-12. Added shared edge-IP rate limiting for all assessment database endpoints (creation 10/minute; activity 120/minute; deletion a separate 120/minute key). Missing hosted edge IP and limiter errors fail closed. Guest tokens are shape-checked, input failures return 400, cookie security uses the actual request URL, and resume reuses one client. Dynamic responses are private/no-store. Verified existing TanStack CSRF behavior using authenticated HTTP replays in all three browsers; added database-backed foreign-session and expiry cases. Generated Worker types with the installed Wrangler (including its current workerd runtime declarations) and replaced string-based config checks with Wrangler's JSONC parser. Coverage passed 141 tests across 22 files; all 21 browser tests, build, Worker dry run, lint, typecheck, and version checks passed. See `docs/security-hardening.md` for controls, residual limits, and deployment requirements.
- Phase 4: complete locally on 2026-09-12. Assessment seeding now inserts atomically and rejects content drift without rewriting existing questionnaire/scoring inputs or reactivating retired versions. Cleanup commits batches of at most 100 sessions with lock/statement timeouts and invocation work limits; failures report partial counts and sanitized errors. PostgreSQL regressions cover immutable seed content, rollback, batch boundaries, completed-result cascades, and contention timeout without partial deletion. Historical migration preflight and unresolved hosted provenance checks are documented in `docs/database.md`; applied migrations were not rewritten. Docker startup, generation (no schema changes), local migration, two seeds, lint, typecheck, coverage (156 tests across 22 files), production build, Worker dry run, version check, and diff whitespace check passed. No UI changes; browser and Storybook reruns are reserved for Phase 5. Version remains 0.4.0.
- Phase 5: complete locally on 2026-09-12. Shared the completed-result deletion control, added confirmation/cancellation focus behavior, explained required questions, and focused visible save errors while preserving selections. Strengthened semantic UI assertions, real owner-constraint cases, and the token-hash unique-index check. Both CI jobs pin the same official PostgreSQL 17.11 digest and disable persisted checkout credentials. Final `pnpm check`, `pnpm typecheck`, `RUN_DB_TESTS=true pnpm test` (160 tests across 22 files), coverage (160 tests; 86.81% statements / 80.62% branches), production build, Worker dry run, Storybook build, version metadata, and all 21 browser tests passed. A fresh temporary container using the exact pinned image passed migrations, two seeds, and all 28 PostgreSQL integrity cases; it was removed afterward. Diff whitespace checks passed. Storybook retains its non-failing chunk-size warning. No schema/binding changes in this phase, so generation checks were not repeated after the earlier phases. At completion of Phase 5, the GitHub-hosted workflow had not run on the local commits; see the remote CI update below. Version remains 0.4.0.

The five local hardening phases did not deploy or migrate hosted resources. On the maintainer's subsequent explicit instruction, staging was deployed on 2026-09-12 after hosted preflight and additive migration 0012; see `docs/assessment-mvp.md` for version IDs, runtime checks, and remaining launch gates. The seven commits through `97aebb6` were subsequently pushed to PR 36. Review threads still require disposition on GitHub; no thread-resolution messages were posted.

### Remote CI after push

[Run 34693462674](https://github.com/Project-Kelsier/project-kelsier/actions/runs/34693462674), for commit `97aebb6`, completed the database job successfully on 2026-09-12. The validation job failed at `pnpm audit --audit-level high` with two high and two moderate dependency findings. Later steps in that job did not run. The local checks recorded above remain valid for their tested code and environment, but do not imply fresh remote CI passed. Dependency remediation is a merge blocker, separate from the continuing public-launch hold.

## Review findings that should not be applied as suggested

- Requiring the previous continuation token for first resume would break reload recovery: that token lives only in page memory. The owning, unexpired guest cookie authorizes recovery; the new token replaces the old one atomically and supports same-token retries. Existing PostgreSQL tests cover stale-save rejection, different-token second-resume rejection, and other-guest denial. The service comment and product decision now state this explicitly.
- Global database-client caching and disabling prepared statements contradict current [Cloudflare Postgres.js guidance](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/postgres-js/).
- Seven-day deletion of completed guest results and owner-requested deletion are intentional product decisions, not completion-immutability bypasses.
- Merely changing the incomplete-attempt progress comparison to the final question index can incorrectly display completion before submission; Phase 2 instead removed that completion flag and tested the recovery contract.

## Review disposition

Reviewed PR 36's eight inline CodeRabbit findings, outside-diff/nitpick summary, and Claude summary against the current implementation. Review text is evidence to assess, not an instruction to apply automatically.

| Finding | Disposition |
| --- | --- |
| Mutable PostgreSQL CI images | Both jobs pinned to the official `postgres:17` index digest `sha256:67f41722b7a8cbdb868a44a4995c846eddfdc2973bccb291ce937dce88ad5675`. Registry metadata checked 2026-09-12: 17.11, linux/amd64 available, source `docker-library/postgres` revision `2603e26e245e558218728ee14e0a42dcb020dc7f`, `17/trixie`. Pinning provides reproducibility, not a vulnerability-free certification. |
| Persisted checkout credentials | Disabled in both CI jobs; no later authenticated Git operations are needed. |
| Documentation vocabulary | Retained the explicit disclaimer that demonstration content is not validated and the rule prohibiting such claims. The deferred-scope list describes work the MVP does not provide. These are limitations, not claims about the seeded assessment. |
| Incorrect restored-answer fixture | Corrected to `new-joiner: pair` in Phase 2. |
| Concurrent unfinished-attempt creation | Generated partial unique index and controlled conflict response in Phase 1; real concurrent test. Separate newly issued guest sessions remain a documented limit. |
| Configuration substring assertions | Replaced with parsed Wrangler configuration assertions in Phase 3. |
| Optionless questions hidden by inner join | Left join and invalid-questionnaire rejection in Phase 1. |
| Unreachable `answersComplete` | Removed in Phase 2; only a persisted result means completed. |
| Seed overwrites requiredness/scoring | Phase 4 rejects all existing content drift; changing content requires an explicit new questionnaire version, never an automatic app version bump. |
| Drizzle mock call leakage | Per-test mock clearing is present. |
| Class-based focused-heading E2E selector | Uses the heading role and the current question group's accessible name. |
| Unavailable-page privacy anchor | Retained intentional document navigation from the error fallback; it can recover independently of client router state. |
| Resume argument assertion | Checks the exact attempt ID and generated continuation-token shape. |
| Bare result-count/duplicate message assertions | Scoped to result row/cell and status region. |
| Duplicate completed-attempt deletion controls | Uses shared confirmation; keyboard focus moves to cancellation and returns to the request button. Cancellation is disabled during deletion. |
| Exactly-one-owner check only tested by name | Added PostgreSQL cases rejecting zero/two owners and accepting user ownership; guest-only cases already exercised. Token-hash unique-index assertion added. |
| Short-lived public questionnaire cache | Deferred: current request limiting bounds requests, and avoiding cache invalidation complexity preserves immediate questionnaire retirement. No established questionnaire cache exists. Revisit with measured query load and explicit invalidation. |
| Generic UUID validator naming | Renamed `ATTEMPT_ID_PATTERN` to `UUID_PATTERN` without changing validation. |
| Unbounded cleanup and returned IDs | Phase 4 batches, timeouts, partial-progress logs, sanitized failures, cascade and contention tests. |
| Missing expiry validated after insert | Phase 1 requires and validates expiry before opening a write transaction. |
| Global client reuse and prepared statements | Retained request-scoped clients and `prepare: true` following Cloudflare guidance; removed the duplicate client within resume in Phase 3. |
| Unthrottled activity and shared unknown-IP bucket | Phase 3 limits database endpoints and fails closed for missing hosted edge IP or limiter failures. |
| Historical migrations 0008–0011 | Preserved applied history; populated-upgrade prerequisites and unresolved hosted provenance are documented in `docs/database.md`. No assumption that historical result rows were empty. |
| Required-question explanation and save-error access | Required/optional labels and fieldset help text; failed saves keep the selection and focus the visible error. Polite status announcements remain to avoid interrupting unrelated screen-reader output. |
| Missing HTTP/completion tests | Phase 3 HTTP boundary and authenticated browser replays, plus Phase 2 database-backed completion/race cases. |
| Completed guest result expiry/deletion | Retained approved seven-day retention and owner-authorized deletion; tested cascade behavior in Phase 4. |

Hosted launch gates remain in `docs/assessment-mvp.md`, including cleanup monitoring/notification evidence. These local changes do not certify all security risks eliminated.

## September review follow-up

CodeRabbit marked seven earlier inline threads resolved after the hardening push. The remaining wording concern is addressed with provisional demonstration language and a clearer deferred-research description. The resume concern is clarified above without changing the approved recovery contract.

Dependency remediation retains app version `0.4.0`: scoped Sharp `0.35.4` and JS-YAML `4.3.2` overrides plus Vitest/coverage `4.1.11`. No install policy was weakened. Frozen install, native rebuilds, signatures (634 verified packages), vulnerability audit (zero findings), version check, Biome, typecheck, 160 tests including PostgreSQL, coverage, and app build passed locally. Coverage remains 86.81% statements and 80.62% branches. Browser and Storybook tests were not repeated for this dependency/comment/documentation-only follow-up; their previous results remain historical. Fresh remote CI and reviewer approval remain required; public release is still on hold.
