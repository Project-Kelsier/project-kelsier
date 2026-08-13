# Assessment MVP Decisions

Status: Approved for implementation on 2026-08-11. Decisions marked provisional may change after the flow can be tested in practice.

## Purpose

The first assessment slice exists to prove the product machinery with a disposable questionnaire. The seeded items and their scoring are demonstration content, not validated psychometrics. The implementation should make later refinement possible without pretending that every future response format fits the MVP engine.

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
- After the single resume has been consumed, a later interruption cannot resume that attempt. Starting fresh deletes the old incomplete attempt before creating its replacement so unfinished records do not accumulate.
- Retention remains fixed from creation and is separate from resume eligibility.
- Describe the output as a current snapshot. Do not imply that a changed response means the person has a different personality or that the demonstration instrument measures stable traits.

### Guest credential and deletion

- Generate an opaque, high-entropy guest token on the server.
- Store the raw token only in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie outside local development.
- Store only a cryptographic hash of the token in the database.
- Attempt IDs are non-secret UUIDs and never authorize access by themselves.
- A valid guest cookie may delete its own attempt, but may not access any other attempt.

The MVP will not add a recovery code. If the cookie is lost, the person cannot identify or delete the record directly; automatic expiry is the remaining deletion mechanism. Public-facing copy must state this limitation plainly before persistence begins. The final retention period and copy require privacy review before public launch.

### Retention

Expiry is fixed from attempt creation rather than extended on activity. This avoids retaining an answer-by-answer activity trail merely to refresh retention.

- Development default: seven days from creation.
- Public value: provisional until privacy review.
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

Do not expose the writable guest assessment publicly until all of these conditions pass:

- Cross-session authorization tests cover read, answer, completion, deletion, and result access.
- Cookie-authorized deletion has been exercised end to end by someone other than its implementer.
- Native rate limiting protects the first public write endpoint.
- Scheduled expiry cleanup is deployed and monitored.
- The pre-persistence notice and privacy wording have been reviewed.
- Production cookie behavior, runtime bindings, and the absence of development bypasses have been verified.
- Save failures, reload/resume behavior, keyboard operation, focus management, disabled states, and live status announcements are covered proportionately by tests.

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

Implementation status as of 2026-08-13: phases 1 through 7 are implemented on the assessment MVP branch. Guest answers persist before navigation, and an interrupted attempt offers one explicit resume or a fresh replacement snapshot. The final answer, `completedAt` transition, deterministic `dimension-mean-v1` calculation, and immutable raw result are now created in one database transaction. Refresh restores the completed result through the owning guest credential, and the UI presents ordered dimension scores and contributing-question counts in an accessible table.

The active assessment version, questions, options, dimensions, and score weights are treated as immutable scoring inputs once responses exist. Future editing tools must create a new assessment version rather than mutate an active version in place. A changed arithmetic or interpretation contract requires a new scoring algorithm identifier. The database enforces one result per attempt; the service layer exposes creation and owner-scoped reads but no result update path.

## Deferred Decisions

These decisions are intentionally postponed until evidence or a later phase makes them necessary:

- The public retention period and final privacy wording.
- Whether account creation is offered, when it is offered, and how a guest attempt is claimed safely.
- How conflicting, expired, already-claimed, or concurrently active claim attempts behave.
- The signal or threshold that justifies building durable accounts; an explicit product review may be used if no numeric threshold is defensible.
- The shape and consent model for organisation or team sharing.
- Validated questionnaire content, scoring interpretation, confidence, and psychometric claims.
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
