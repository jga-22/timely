# Database storage (draft)

This folder holds the design for storing Timely's data in PostgreSQL, either hosted through Supabase or plain PostgreSQL, instead of browser `localStorage`. **Nothing here is built into the app yet.** The owner has not decided on the storage; see the open item in `.claude/agent.md`. The app code is unchanged.

## Contents

| File | What it is |
| --- | --- |
| `README.md` | This index, how to open the diagram, how to apply the schema, and the summary. |
| `data-model.md` | The data model: each table with columns, types, constraints, keys, delete rules, the mapping from the TypeScript model, the invariants the database must keep, and sample queries (planned hours, needed against allocated time). |
| `schema.sql` | Runnable PostgreSQL / Supabase DDL: extensions, enum, tables, constraints, indexes, `updated_at` trigger, the invariant triggers, row level security, and an optional seed function that mirrors the app seed. |
| `erd.drawio` | Entity relationship diagram, uncompressed draw.io (diagrams.net) file. |
| `erd.mmd` | The same entities and foreign keys in Mermaid (renders on GitHub, see below). |
| `effort-evaluation.md` | Effort estimate by work package, phased plan, costs, risks, Supabase versus plain PostgreSQL, and the decisions the owner must make. |

## Summary

- **The model** has ten tables plus `auth.users` at the edge. Goals: `ambitions`, `categories`, `habits`. Planning: `activities`, `activity_extra_categories`, `templates`, `template_slots`, `applied_weeks`. Journal and settings: `settings`, `journal_entries`.
- **Multi-user ready:** every table carries `user_id` (default `auth.uid()`), composite keys `(user_id, id)`, composite foreign keys, and row level security with four policies per table.
- **Template slots** are one row per painted hour (`day` 0 to 6, `hour` 0 to 23), not the app's 168-item array. This keeps one activity per hour enforced by the primary key and gives foreign keys to activities. The trade-off is in `data-model.md` section 4.
- **Effort:** about 23 to 46 focused days for the full move, about 13 to 24 days to a first multi-device version (phases 0 to 2). Recommendation: Supabase with supabase-js under RLS, after a one-to-two-day spike. Details in `effort-evaluation.md`.
- **Validation status:** the SQL was checked structurally (quotes, parentheses, dollar quotes, statement count) but **not executed**, because no PostgreSQL or Docker daemon was running on the machine that wrote it. The first run on a real database is the check; see "Applying the schema" below.

## Opening the diagram

**draw.io (diagrams.net):**

1. Open `https://app.diagrams.net` (or the desktop app or the VS Code draw.io extension).
2. File, Open, choose `spec/database/erd.drawio`. The file is uncompressed XML and opens without conversion.
3. The legend is at the bottom: group colours, key markers, and how to read the crow's-foot notation.

**Mermaid:** `erd.mmd` renders on GitHub when you open the file. Locally, any Mermaid viewer with `erDiagram` support works. Mermaid cannot show the group colours or the composite-key detail, so the draw.io file is the reference.

## Applying the schema

`schema.sql` is written for PostgreSQL 15 or later (the `ON DELETE SET NULL (column)` form needs 15). Run it on an empty database. It is not idempotent.

### Option 1: Supabase CLI (local, with Docker)

Requires Docker Desktop running and the Supabase CLI. The commands create a `supabase/` folder; run them in a scratch folder outside the repository so the repo is not changed.

```bash
mkdir ~/scratch/timely-db && cd ~/scratch/timely-db
supabase init                       # creates supabase/config.toml and supabase/
supabase start                      # starts the local stack (Postgres on 54322 by default)
cp <repo>/spec/database/schema.sql supabase/migrations/20261026000000_timely_schema.sql
supabase db reset                   # drops and re-applies all migrations on the local database
```

Create a user and seed it. Local Studio (`http://127.0.0.1:54323`) can add a user under Authentication; or insert a row into `auth.users` directly:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -c "insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001') on conflict do nothing;" \
  -c "select public.seed_planner_defaults('00000000-0000-0000-0000-000000000001', 2026);"
```

Check the seed: `select count(*) from public.categories;` gives 8, and `select count(*) from public.habits;` gives 65. (The `auth.users` insert is a direct row; the Supabase local `auth.users` may need more columns when created through Auth. The direct insert works for the schema check.)

Use `supabase status` to see the local URLs and keys for the app later.

### Option 2: Plain PostgreSQL with psql

Requires PostgreSQL 15+ and `psql` (for example a local install or a container). The schema creates the `auth` schema, an `auth.users` table, `auth.uid()` and the `anon` and `authenticated` roles only when they are missing, so it runs on plain PostgreSQL.

```bash
createdb timely
psql -d timely -v ON_ERROR_STOP=1 -f spec/database/schema.sql
psql -d timely -c "insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');"
psql -d timely -c "select public.seed_planner_defaults('00000000-0000-0000-0000-000000000001', 2026);"
```

Notes for plain PostgreSQL:

- The table owner bypasses row level security. To test RLS, connect as a role that is not the owner and set the JWT subject: `set request.jwt.claim.sub = '<user uuid>'; set role authenticated;`.
- The schema grants the `authenticated` role table access. The application role needs its own grants if it is different.
- `auth.uid()` in the shim reads `request.jwt.claim.sub`, the same setting Supabase uses.

### Checking the file without a database

The repository has no PostgreSQL tooling and no new dependencies were added for this work. If a parser is wanted later, `pglast` (Python) or `pg_query` can parse `schema.sql` without a server.

## Regenerating the seed

The seed block in `schema.sql` was generated from the app's seed (`createInitialState(2026)` in `app/utils/planner.ts`). If the seed changes, regenerate it or edit the function by hand, and keep the counts above in step.

## Status and next steps

1. Owner decision: Supabase or plain PostgreSQL, and hosted or local (`effort-evaluation.md` section 8).
2. Phase 0 spike: apply `schema.sql` on a local Supabase, read the seed from the app, measure a 168-slot paint.
3. Then the phases in `effort-evaluation.md`.

Related: `../weekly_planner_prd_and_design_doc.md` (product requirements), `../../app/types/planner.ts` (the model this schema mirrors), `../../app/utils/planner.ts` (seed and validation).
