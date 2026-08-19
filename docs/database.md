# Database Setup And Runtime Strategy

## Current Decision

Kelsier uses PostgreSQL on Neon as the primary hosted database target and Drizzle ORM for schema definitions and migrations.

The app deploys to Cloudflare Workers, so runtime database access must be Workers-compatible. Plain Node TCP clients must not be imported into the Worker bundle.

## Runtime Boundaries

| Runtime | Driver | Purpose |
| --- | --- | --- |
| Cloudflare Worker | Postgres.js through Cloudflare Hyperdrive | App runtime |
| Node.js | postgres-js | Local scripts, seed, migration tooling |

## Current Implementation

- `src/db/client.worker.ts` is the Worker-safe database client.
- `src/db/client.node.ts` is Node-only.
- `src/db/client.ts` is a runtime-safe shared surface for environment parsing and `DbClient` typing.
- Worker-facing routes and services must not import `client.node.ts` or concrete database drivers. The Worker client is the only Worker-facing module that owns Postgres.js setup.
- `src/db/client-boundary.test.ts` statically checks that concrete drivers and the Node client do not escape their runtime client modules.
- `src/db/schema/*` contains Drizzle schema definitions.
- `drizzle/migrations/*` contains reviewed SQL migrations.
- Guest assessment creation stores only a hash of the browser credential in `guest_sessions`; the raw credential remains in an HttpOnly cookie.

## Why This Split Exists

Cloudflare Workers do not provide normal Node TCP sockets by default. Kelsier's Worker client connects through the `HYPERDRIVE` binding, while Node-only scripts connect directly with `DATABASE_URL`.

The Worker creates its lightweight Postgres.js client per request instead of storing request-scoped connection state globally. Hyperdrive owns the underlying connection pool. Query caching is disabled on the Hyperdrive configuration because assessments require predictable authorization checks and read-after-write behavior.

## Local Development

Local development uses Docker PostgreSQL on `localhost:55432`.

Use this local default unless intentionally targeting a hosted environment:

```bash
DATABASE_URL=postgres://kelsier:kelsier@localhost:55432/kelsier_dev
```

Do not run destructive development commands against Neon. Hosted Neon connection strings are secrets and must stay out of committed files, logs, screenshots, and PR descriptions.

`wrangler.jsonc` supplies the non-secret Docker URL as the Hyperdrive binding's `localConnectionString`. Local Worker requests therefore connect directly to Docker; they do not use the deployed Hyperdrive service or hosted Neon. An environment-specific `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` value can override it when needed.

## Daily Development

With Docker Desktop running and `.env` pointing at the local database, use:

```bash
pnpm dev
```

The development bootstrap starts the PostgreSQL service, waits for its health check, applies committed migrations, runs the idempotent seed, and then starts Vite. It refuses to automate preparation when `DATABASE_URL` is not the approved local database on `localhost:55432`. Use `pnpm dev:app` only to start Vite against an already-prepared local database.

## Migration Workflow

When changing schema:

```bash
pnpm db:generate
git diff drizzle/migrations
git diff drizzle/migrations/meta
pnpm check
pnpm typecheck
pnpm test
```

Before applying migrations locally:

```bash
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

Review generated SQL before applying it to any hosted database. Initial/fresh database setup must be reproducible from committed migrations, including required extensions such as `pgcrypto`.

CI runs migrations and the seed against a fresh PostgreSQL 17 service in a dedicated database job. It runs the seed twice so loss of idempotency fails before feature tests begin relying on fixture identities. The validation job owns a separate fresh PostgreSQL service for browser tests and overrides the Hyperdrive local connection string to CI's PostgreSQL port.

## Development Fixtures

The local seed includes three domain users across two organisations so ownership checks can prove both important boundaries:

- An owner and a colleague belong to `demo-organisation` and `leadership-circle`. This makes same-organisation, different-user isolation testable.
- A separate owner belongs to `second-organisation`. This makes cross-organisation isolation testable.

The fake auth IDs are stable lookup keys for development and tests. They do not represent real auth-provider records, and the seed remains development-only.

## Tenant Integrity

Tables that duplicate `organisation_id` for tenant-scoped lookup speed must still enforce that duplicated tenant key at the database level when they also reference a parent row.

Use this pattern when practical:

1. Add a composite unique key on the parent table, such as `(id, organisation_id)`.
2. Add a composite foreign key from the child table, such as `(parent_id, organisation_id)`.
3. Keep service-layer `organisationId` predicates, but do not rely on them as the only protection against cross-tenant rows.

Personal assessments deliberately use a different boundary. `assessment_attempts` must have exactly one owner: either a guest session or a domain user. Answers and results reference the attempt and do not duplicate user or organisation ownership. Service helpers authorize those child records by joining through the attempt. Organisation or team access will require a separate explicit sharing artefact rather than changing ownership of the personal attempt.

Guest attempt creation is protected by the `ASSESSMENT_ATTEMPT_RATE_LIMITER` Workers binding. Its key is a one-way hash derived from the request IP and exists only in Cloudflare's short-lived rate-limit state; neither the raw IP nor its hash is stored with guest sessions or attempts.

For source-scoped lookup helpers, include all columns that define the source identity. For AI insights, source lookups must filter by both `sourceEntityType` and `sourceEntityId`.

## Runtime Import Rules

- App runtime code should use `src/db/client.worker.ts` when it needs a concrete database client and pass the generated `Env` binding object.
- Shared services should depend on the `DbClient` type from `src/db/client.ts`, not the Node client.
- Scripts and Node-only test setup may import `src/db/client.node.ts`.
- Do not import `src/db/client.node.ts` from `src/routes`, Worker route handlers, or service modules used by the app runtime.
- Keep `src/db/client.ts` free of `node:*`, `postgres`, and `drizzle-orm/postgres-js` imports.

## Testing Query Boundaries

Service tests for tenant-scoped Drizzle helpers should assert the semantic query contract, not Drizzle internals.

For soft-delete and tenant visibility tests, assert specific schema columns are used, such as `organisations.deletedAt`, `teams.deletedAt`, and `teamMembers.deletedAt`. Avoid counting repeated `deleted_at` tokens from Drizzle predicate objects.

## Sources

- Drizzle Postgres.js driver docs: <https://orm.drizzle.team/docs/get-started-postgresql#postgresjs>
- Cloudflare Hyperdrive docs: <https://developers.cloudflare.com/hyperdrive/>
- Cloudflare Hyperdrive local development: <https://developers.cloudflare.com/hyperdrive/configuration/local-development/>
