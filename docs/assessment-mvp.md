# Assessment MVP Decisions

Status: Approved for implementation on 2026-08-11. Decisions marked provisional may change after the flow can be tested in practice.

## Purpose

The first assessment slice exists to prove the product machinery with a disposable questionnaire. The seeded items and their scoring are provisional demonstration content with no established measurement claims. The implementation should make later refinement possible without pretending that every future response format fits the MVP engine.

## Approved Decisions

### Personal ownership

Guest and claimed assessment attempts are personal records. Creating an account must not automatically route behavioural data to an employer, organisation, or team.

- A guest attempt has a guest session owner and no user, organisation, or team owner.
- A claimed personal attempt has a user owner and no guest session, organisation, or team owner.
- Organisation or team sharing will be an explicit later action that creates a separate shareable or owner-approved artefact.
- “Guest” is the product term. The data is pseudonymous, not anonymous, because a browser credential links the person to a server-side record.

The schema must enforce exactly one attempt owner: a guest session or a user, never both and never neither.

### Attempt-level authorization

The assessment attempt is the authorization boundary for its answers and result.

- Answer and result access must be authorized by loading the owning attempt.
- Answers and results should not duplicate user or organisation ownership columns.
- A result retains its assessment version for provenance, and the database must prevent that version from disagreeing with the attempt’s version.
- Tests must prove that one guest session cannot load, answer, complete, delete, or view another guest session’s attempt.

This is a deliberate normalization of the assessment aggregate. It is narrower than the repository’s usual denormalized tenant-key convention because these records are personal before any sharing decision exists.

### Guest persistence and data minimization

Guest attempts are persisted on the server so progress can survive page reloads.

- Do not attach names, email addresses, analytics identifiers, raw IP addresses, or user-agent strings to attempts.
- Transient abuse-control state may use a request-derived key such as a hashed IP address, provided it is not linked to attempt data and has its own short time-to-live.
- Do not add third-party analytics to the assessment flow during the MVP.

### One-sitting intent and single resume

The assessment should ideally be completed in one sitting so its demonstration output represents one reasonably continuous snapshot of the person’s current patterns and context. Persistence exists for resilience, not to encourage a questionnaire to span multiple states or occasions.

- Before starting, explicitly advise the guest to reserve enough uninterrupted time to complete the assessment.
- When an owned incomplete attempt is found, offer a clear choice to continue it or start a fresh snapshot. Advise starting fresh if the person’s circumstances, mood, or context have materially changed.
- An attempt may be explicitly resumed only once. Record the successful resume atomically with a nullable `resumedAt` timestamp; merely viewing the choice or retrying a failed request must not consume the allowance.
- Each live questionnaire instance uses an opaque continuation capability. Keep the raw value only in client memory, store only its hash on the attempt, and rotate it when the single resume succeeds so a stale page cannot continue writing.
- The owning, unexpired guest cookie authorizes the first resume after reload. That request supplies a new continuation capability because reload discards the old memory-only value. Retries must use the same new capability; a different guest cookie cannot resume the attempt.
- After the single resume has been consumed, a later interruption cannot resume that attempt. Starting fresh deletes the old incomplete attempt before creating its replacement so unfinished records do not accumulate.
- Retention remains fixed from creation and is separate from resume eligibility.
- Describe the output as a current snapshot. Do not imply that a changed response means the person has a different personality or that the demonstration instrument measures stable traits.

### Guest credential and deletion

- Generate an opaque, high-entropy guest token on the server.
- Store the raw token only in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie outside local development.
- Store only a cryptographic hash of the token in the database.
- Attempt IDs are non-secret UUIDs and never authorize access by themselves.
- A valid guest cookie may delete its own attempt, but may not access any other attempt.

The MVP will not add a recovery code. If the cookie is lost, the person cannot identify or delete the record directly; automatic expiry is the remaining deletion mechanism. Public-facing copy must state this limitation plainly before persistence begins. The seven-day pilot retention period is approved; the final privacy wording still requires review before public launch.

### Retention

Implemented expiry is fixed on the guest session when it is first created. Attempts started or replaced within that session inherit its existing deadline and may have less than seven days remaining; activity never extends it. This avoids retaining an answer-by-answer activity trail merely to refresh retention.

- Pilot retention: a seven-day guest-session window. Access is denied at expiry; physical deletion follows during scheduled cleanup and can occur after expiry. Failed cleanup can delay physical deletion and requires monitoring.
- The fixed period is approved for the initial public pilot and must be reconsidered if the data collected or product use changes materially.
- Expired attempts and their dependent records must be removed by a scheduled cleanup job.
- Cleanup success and failure require operational visibility; configuring a schedule is not evidence that it continues to run.

### Response model

The MVP engine supports single-select questions with explicit requiredness.

- One selected option per attempt and question.
- Required and optional questions are supported.
- Seed nine required questions and one optional question so optional completion behavior is exercised immediately.
- Completion validates all required questions, not all questions.
- Ranking, multi-select, branching, free-text responses, and open-text confirmation are deferred response formats that may require schema and engine migrations.

The disposable part is the questionnaire content. The single-select response model is an intentional MVP constraint, not a promise that arbitrary questionnaires can be swapped in unchanged.

### Demonstration scoring and results

- Use a deterministic per-dimension arithmetic-mean demonstration algorithm.
- Store the stable algorithm identifier `dimension-mean-v1` independently from the application release version.
- Store the assessment version, per-dimension numeric values, and contributing-question counts needed to explain provenance.
- Keep confidence `null` until there is a defensible method for calculating it.
- Present results as a plain accessible table, not a radar chart or diagnostic personality profile.
- Label the result clearly as a demonstration and avoid validated, predictive, clinical, hiring, or diagnostic claims.

Change the scoring algorithm identifier when arithmetic or interpretation changes, including dimension meaning changes that would make old and new scores incomparable.

### Public launch gate

The top-level `workers.dev` deployment may remain publicly reachable as staging. Do not present it as production or actively promote it as the public pilot while any row marked **Blocked** remains unresolved. Update this table in place so launch readiness has one source of truth.

The maintainer explicitly confirmed **no public launch yet** on 2026-09-12. Staging-only checks, prepared monitoring queries, access limits, and the independent review procedure are recorded in [staging-operations.md](staging-operations.md). Passing technical checks does not remove that hold.

| Requirement | Status | Evidence or required action | Launch blocker? |
| --- | --- | --- | --- |
| Cross-session authorization covers read, answer, completion, deletion, and result access. | Ready | Service and route tests prove that one guest credential cannot operate on another guest's attempt. | No |
| Cookie-authorized deletion is independently exercised end to end. | Blocked | A reviewer other than the implementer must complete and record the deletion exercise. | Yes |
| Native rate limiting protects the first public write endpoint. | Ready | `ASSESSMENT_ATTEMPT_RATE_LIMITER` is configured and its fail-closed creation path is covered by tests. | No |
| Scheduled expiry cleanup is deployed and monitored. | Blocked | Hosted logs confirm successful runs on 2026-09-11 and 2026-09-12 under the previous Worker. The new bounded-cleanup Worker was deployed 2026-09-12; verify its first 03:17 UTC invocation. | Yes |
| Cleanup failure notifications reach a responsible person. | Blocked | `curiousphreak@gmail.com` is the approved recipient. The Cloudflare policy list was empty on 2026-09-12; configure and test notification delivery before production promotion. | Yes |
| The pre-persistence notice, privacy wording, retention period, and contact details are approved. | Blocked | `curiousphreak@gmail.com` and seven-day fixed retention are approved; complete the remaining privacy-wording review before public launch. Staging deployment was separately authorized. | Yes |
| Production cookie behavior, bindings, and absence of development bypasses are verified. | Ready for staging | Hosted Chromium checks on 2026-09-12 verified Secure/HttpOnly/SameSite=Lax cookies with seven-day expiry, no-store responses, and rejected cross-site/anonymous writes. Live version metadata contains only Hyperdrive and the two rate-limit bindings, with no demo identity binding. Repeat if promoting a different environment. | No |
| Save failures, reload/resume behavior, keyboard operation, focus management, disabled states, and live announcements have proportionate coverage. | Ready | Vitest and cross-browser Playwright coverage exercise the critical questionnaire states and the single-resume contract. | No |

## Phased Delivery

1. Record these decisions and keep the hardcoded questionnaire running.
2. Add PostgreSQL-backed CI infrastructure and useful multi-owner fixtures as a standalone tooling change.
3. Migrate attempt ownership and normalize answer/result ownership, then add requiredness, expiry, and scoring provenance in a separate additive migration.
4. Replace hardcoded questionnaire data with the active database version and its ordered questions and options.
5. Add guest sessions, attempt creation, cookie-authorized deletion, native rate limiting, privacy copy, and cross-session authorization tests.
6. Add answer persistence, the explicit single-resume or fresh-snapshot choice, accessible step transitions, and end-to-end coverage. This includes additive `resumedAt` provenance on attempts.
7. Add atomic completion, versioned scoring, immutable raw results, and the accessible result table.
8. Add scheduled cleanup, monitoring, production assertions, and complete the public launch gate.
9. Pilot the guest flow; introduce authentication and claiming only when durable accounts have demonstrated product value.
10. Add explicit sharing and owner-approved artefacts before any organisation or team receives behavioural output.
11. Refine the instrument and consider TanStack Form, AI-assisted workflows, or other packages only when concrete product needs justify them.

Each numbered item may be split into smaller pull requests. Tooling changes, schema changes, and feature work should remain independently reviewable where practical.

Implementation status as of 2026-08-17: phases 1 through 7 and the technical portion of phase 8 are implemented on the assessment MVP branch. Guest answers persist before navigation, and an interrupted attempt offers one explicit resume or a fresh replacement snapshot. The final answer, `completedAt` transition, deterministic `dimension-mean-v1` calculation, and immutable raw result are created in one database transaction. Refresh restores the completed result through the owning guest credential, and the UI presents ordered dimension scores and contributing-question counts in an accessible table.

Public-staging evidence as of 2026-08-17: Cloudflare Worker version `22b0f905-551f-4b58-84ee-90f1f942f89e` was active at `https://project-kelsier.mindphreak.workers.dev` with the expected Hyperdrive and native rate-limit bindings and the `17 3 * * *` schedule. The committed migrations were applied to the verified Neon database behind Hyperdrive, the idempotent seed completed twice, and fresh hosted requests returned `200` for the database-backed questionnaire, privacy page, and terms page. At that checkpoint, the hosted browser walkthrough and real scheduled-invocation evidence were pending; the September update below supersedes that status.

Public-staging update, 2026-09-12: following the maintainer's explicit deployment instruction, commit `24fb6ad` was deployed as Worker version `7f3fde5d-777d-438d-afa0-f814ec8b12a5` at the same staging URL; app version remains `0.4.0`. Before deployment the Hyperdrive origin matched the local hosted credential, all 12 migration hashes/timestamps matched repository history, and guest sessions/attempts/results and duplicate unfinished groups were empty. Applied only additive migration `0012_furry_shiva`; the resulting ledger contains all 13 migrations and the unique index is present. No existing rows were discarded and no hosted seed was needed.

Hosted Chromium checks passed page responses for `/`, `/privacy`, and `/terms`, secure cookie flags/expiry, private/no-store behavior, cross-site and opaque-origin write rejection (403), anonymous rejection (404), owner retry (200), completion, result reload, owner-authorized deletion, persisted answers, and exactly one explicit resume. The completed and resumed test attempts were deleted through the UI. An initial test-harness failure on HTTP/2 pseudo-headers left one disposable incomplete attempt, which remains subject to normal seven-day expiry; no completed test results remain. This implementer-run exercise does not replace the independent deletion review required above.

Cloudflare telemetry records `assessment_cleanup_completed` on 2026-09-11 at 03:17:53 UTC and 2026-09-12 at 03:17:11 UTC, each deleting zero sessions, under the previous Worker version. The current schedule remains `17 3 * * *`; the first scheduled run of the newly deployed bounded implementation is still pending. The account notification policy list is empty. Public launch remains gated by the outstanding rows above; staging deployment is not launch approval.

The active assessment version, questions, options, dimensions, and score weights are treated as immutable scoring inputs once responses exist. Future editing tools must create a new assessment version rather than mutate an active version in place. A changed arithmetic or interpretation contract requires a new scoring algorithm identifier. The database enforces one result per attempt; the service layer exposes creation and owner-scoped reads but no result update path.

Phase 8 schedules cleanup daily at 03:17 UTC. The scheduled Worker deletes expired guest sessions in indexed batches of at most 100; database cascades remove their guest-owned attempts, answers, and results atomically within each batch. Each batch has a two-second lock timeout and a ten-second statement timeout. Between batches the handler checks a 60-second or 100-batch work limit; reaching either limit marks the invocation failed so an unfinished backlog is visible. Earlier batches remain committed and a later invocation can safely continue. It emits structured `assessment_cleanup_completed` or `assessment_cleanup_failed` logs, including deleted-session counts on partial failure, and rethrows a generic error so Cloudflare records a failed invocation without logging raw database errors. A failure needs investigation and a subsequent invocation; automatic immediate retries are not assumed. Workers Logs capture all cleanup events during the pilot. Run `pnpm worker:check` to validate the deployment configuration without deploying, and invoke `/cdn-cgi/handler/scheduled?format=json` against local Vite to exercise the scheduled handler.

Public launch remains blocked until the privacy wording is approved, a Cloudflare failure notification recipient is configured, and cookie-authorized deletion is independently exercised end to end. Completing technical phase 8, configuring the contact address, and approving seven-day retention do not themselves approve deployment.

## Deferred Decisions

These decisions are intentionally postponed until evidence or a later phase makes them necessary:

- The final privacy wording and whether later product changes require a different retention period.
- Whether account creation is offered, when it is offered, and how a guest attempt is claimed safely.
- How conflicting, expired, already-claimed, or concurrently active claim attempts behave.
- The signal or threshold that justifies building durable accounts; an explicit product review may be used if no numeric threshold is defensible.
- The shape and consent model for organisation or team sharing.
- Evidence-based questionnaire development, scoring interpretation, and uncertainty assessment; the MVP demonstration makes no measurement claims.
- Additional response formats and the migrations they require.
- Turnstile or other bot challenges if native rate limits prove insufficient.

## Dependency Policy

The core MVP requires no new npm package. Use the existing TanStack Start, React, Drizzle, PostgreSQL, Vitest, and Playwright stack together with platform-native Web Crypto, Workers Rate Limiting, Cron Triggers, and logging.

Research and add dependencies only at the phase where their need becomes concrete:

- Evaluate an authentication provider before account claiming.
- Evaluate Turnstile only if observed abuse warrants a challenge.
- Evaluate TanStack Form when form complexity exceeds the current single-select flow.
- Evaluate TanStack AI or database-layer additions only for a defined later feature, not as foundation work.

Any dependency addition must follow the repository dependency-change quality gate.

## Changing These Decisions

These decisions are a starting constraint, not a permanent product doctrine. When testing reveals a better direction, update this document, the affected tests, and any contributor-facing conventions in the same focused change. Schema changes should make the changed assumption explicit rather than hiding it behind a generic abstraction.
