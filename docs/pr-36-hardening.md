# PR 36 hardening plan

Work proceeds in reviewable phases. A phase is complete only after its checks pass; this checklist does not certify the application free of security defects. Hosted changes and launch approval remain separate from local hardening.

Per maintainer instruction, do not change the app version unless explicitly requested. Phase 1's proposed version/changelog bump was removed before commit.

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
- Phases 3–5: pending.

Phase 1 changes do not modify UI or Worker configuration. Production/Storybook builds, browser tests, coverage, and Worker dry run are reserved for the later phases and final gate; they have not yet been rerun. No hosted migration, deployment, push, or review-thread resolution was performed. Before hosted application of the unique index, check for existing duplicate unfinished attempts; the migration deliberately fails rather than silently deleting data.

## Review findings that should not be applied as suggested

- Global database-client caching and disabling prepared statements contradict current [Cloudflare Postgres.js guidance](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/postgres-js/).
- Seven-day deletion of completed guest results and owner-requested deletion are intentional product decisions, not completion-immutability bypasses.
- Merely changing the incomplete-attempt progress comparison to the final question index can incorrectly display completion before submission; phase 2 will test the entire recovery contract.
