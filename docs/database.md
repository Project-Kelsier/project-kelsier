# Database Setup And Runtime Strategy

## Current Decision

Kelsier uses PostgreSQL on Neon as the primary hosted database target and Drizzle ORM for schema definitions and migrations.

The app deploys to Cloudflare Workers, so runtime database access must be Workers-compatible. Plain Node TCP clients must not be imported into the Worker bundle.

## Runtime Boundaries

| Runtime | Driver | Purpose |
| --- | --- | --- |
| Cloudflare Worker | Neon HTTP / serverless Drizzle driver | App runtime |
| Node.js | postgres-js | Local scripts, seed, migration tooling |
| Future Worker optimization | Cloudflare Hyperdrive | Connection pooling and routing |

## Current Implementation

- `src/db/client.worker.ts` is the Worker-safe database client.
- `src/db/client.node.ts` is Node-only.
- `src/db/client.ts` is a runtime-safe shared surface for environment parsing and `DbClient` typing.
- Worker-facing routes and services must not import `client.node.ts`, `postgres`, or `drizzle-orm/postgres-js`.
- `src/db/client-boundary.test.ts` statically checks that postgres-js and the Node client do not enter Worker-facing modules.
- `src/db/schema/*` contains Drizzle schema definitions.
- `drizzle/migrations/*` contains reviewed SQL migrations.

## Why This Split Exists

Cloudflare Workers do not provide normal Node TCP sockets by default. A plain `postgres-js` client is appropriate for Node scripts but can fail in Workers unless explicitly wired through Cloudflare sockets or Hyperdrive.

For the Worker runtime, Kelsier uses a serverless/edge-compatible database path. Drizzle supports Neon HTTP/WebSocket drivers, and Cloudflare documents Neon and Hyperdrive as Workers-compatible PostgreSQL options.

Hyperdrive is not wired yet because this repo does not currently define a Hyperdrive binding in `wrangler.jsonc`. Add Hyperdrive only with the corresponding Cloudflare binding and refreshed generated Worker types.

## Local Development

Local development uses Docker PostgreSQL on `localhost:55432`.

Use this local default unless intentionally targeting a hosted environment:

```bash
DATABASE_URL=postgres://kelsier:kelsier@localhost:55432/kelsier_dev
```

Do not run destructive development commands against Neon. Hosted Neon connection strings are secrets and must stay out of committed files, logs, screenshots, and PR descriptions.

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

## Tenant Integrity

Tables that duplicate `organisation_id` for tenant-scoped lookup speed must still enforce that duplicated tenant key at the database level when they also reference a parent row.

Use this pattern when practical:

1. Add a composite unique key on the parent table, such as `(id, organisation_id)`.
2. Add a composite foreign key from the child table, such as `(parent_id, organisation_id)`.
3. Keep service-layer `organisationId` predicates, but do not rely on them as the only protection against cross-tenant rows.

Current assessment examples:

- `assessment_attempts` has a unique key on `(id, organisation_id)`.
- `assessment_answers` references attempts through `(attempt_id, organisation_id)`.
- `assessment_results` references attempts through `(attempt_id, organisation_id)`.

This prevents answer/result rows from referencing an attempt that belongs to a different organisation while still allowing tenant-scoped query helpers to filter by local `organisation_id`.

For source-scoped lookup helpers, include all columns that define the source identity. For AI insights, source lookups must filter by both `sourceEntityType` and `sourceEntityId`.

## Runtime Import Rules

- App runtime code should use `src/db/client.worker.ts` when it needs a concrete database client.
- Shared services should depend on the `DbClient` type from `src/db/client.ts`, not the Node client.
- Scripts and Node-only test setup may import `src/db/client.node.ts`.
- Do not import `src/db/client.node.ts` from `src/routes`, Worker route handlers, or service modules used by the app runtime.
- Keep `src/db/client.ts` free of `node:*`, `postgres`, and `drizzle-orm/postgres-js` imports.

## Testing Query Boundaries

Service tests for tenant-scoped Drizzle helpers should assert the semantic query contract, not Drizzle internals.

For soft-delete and tenant visibility tests, assert specific schema columns are used, such as `organisations.deletedAt`, `teams.deletedAt`, and `teamMembers.deletedAt`. Avoid counting repeated `deleted_at` tokens from Drizzle predicate objects.

## Sources

- Drizzle Neon driver docs: <https://orm.drizzle.team/docs/connect-neon>
- Cloudflare Workers Neon docs: <https://developers.cloudflare.com/workers/databases/third-party-integrations/neon/>
- Cloudflare Hyperdrive docs: <https://developers.cloudflare.com/hyperdrive/>
