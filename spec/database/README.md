# Database storage

This folder holds the design and the SQL for storing Timely's data in Supabase (Postgres with auth and row level security) instead of browser `localStorage`. The owner chose Supabase only (plain PostgreSQL is out of scope). The first step, the **snapshot** with email sign-in, is built into the app; the normalised schema below is the later path.

## Contents

| File | What it is |
| --- | --- |
| `README.md` | This index, how to open the diagram, how to apply the schema, and the summary. |
| `data-model.md` | The data model: each table with columns, types, constraints, keys, delete rules, the mapping from the TypeScript model, the invariants the database must keep, and sample queries (planned hours, needed against allocated time). |
| `snapshot.sql` | The snapshot table used by the app today: `planner_state` with a foreign key to `auth.users` and four own-row RLS policies. |
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

1. Owner decisions that remain are in `effort-evaluation.md` section 8 (hosting, offline level, ids, import of existing data).
2. Phase 0 spike: apply `schema.sql` on a local Supabase, read the seed from the app, measure a 168-slot paint.
3. Then the phases in `effort-evaluation.md`.

Related: `../weekly_planner_prd_and_design_doc.md` (product requirements), `../../app/types/planner.ts` (the model this schema mirrors), `../../app/utils/planner.ts` (seed and validation).


Two designs exist. The **snapshot** (this step) stores the whole `PlannerState` as one JSON document per user, using the same versioning rule as localStorage: a version mismatch or invalid data is discarded and replaced by the seed. The **normalised schema** (`schema.sql` with its ERD and data model) is the later path: one table per entity with constraints. Moving to it means a one-off import of the snapshot. The snapshot is the first step because it reuses the existing store and validation unchanged.

## Choosing the storage

| Mode | `NUXT_PUBLIC_STORAGE` | Where data lives | Needs |
| --- | --- | --- | --- |
| Local (default) | unset or `local` | This browser's localStorage | Nothing. No network calls, no auth code loaded. |
| Supabase | `supabase` | `public.planner_state`, one row per signed-in user | `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_ANON_KEY`, the auth setup below |

Set the variables in `.env` (see `.env.example` at the repository root) and restart the dev server. A Supabase mode with missing settings falls back to local storage.

In Supabase mode:

- Nothing is loaded or written before a signed-in session exists. The page shows a sign-in card instead.
- Sign-in is by email link. The session is kept by supabase-js in the browser, so a reload stays signed in.
- The topbar shows the save status (Loading, Saving, Saved, Not saved) and an Account menu with the email and Sign out.
- Sign-out returns the screen to the seed without writing it to the database. Another user signing in on the same browser never sees the previous user's data.
- Saves are debounced by 600 ms and sent when the page is hidden. If the first load fails, nothing is written, so the remote copy is never overwritten; reload to try again.

Only the anon key goes to the browser. Row level security limits every request to the signed-in user's own row.

### Supabase, local quick start

Requires Docker and the Supabase CLI. Run these in a scratch folder outside the repository, because `supabase init` creates a `supabase/` folder.

```bash
mkdir ~/scratch/timely-db && cd ~/scratch/timely-db
supabase init                                   # creates supabase/config.toml
supabase start                                  # starts the local stack
cp <repo>/spec/database/snapshot.sql supabase/migrations/20261027000000_planner_state.sql
supabase db reset                               # applies the migration to the local database
supabase status                                 # prints the API URL and the anon key
```

Then in `.env` at the repository root:

```bash
NUXT_PUBLIC_STORAGE=supabase
NUXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NUXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
```

### Auth setup (Google)

The sign-in screen offers **Continue with Google** first and the email link second. Google needs no email sending, so the built-in email rate limit does not apply.

1. In Google Cloud Console create an OAuth client of type Web application. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. Authorized JavaScript origins: `http://localhost:3000` and the deployed origin.
2. Set the consent screen audience to External and publish it, otherwise only listed test users can sign in.
3. In Supabase, **Authentication, Sign In / Providers, Google:** enable it and paste the Client ID and Client Secret there. The secret stays in the Supabase dashboard; it never goes in `.env` or Vercel.
4. The Site URL and Redirect URLs are the same as for the email link (below). The app sends `redirectTo = window.location.origin`.

### Auth setup (email magic link)

1. **Authentication, Sign In / Providers, Email:** enabled (the default).
2. **Authentication, URL configuration:** Site URL `http://localhost:3000` (the Nuxt dev port). Under Redirect URLs add `http://localhost:3000/**`. Use your deployed URL for production.
3. **Local stack:** the local stack does not send real mail. Open Inbucket at `http://localhost:54324`, find the message and click the link. For the Site URL and redirects in the local stack, set them in `supabase/config.toml` (`site_url`, `additional_redirect_urls` under `[auth]`) and run `supabase stop && supabase start`.

Anonymous sign-in is not used. A user who signs in on a new browser sees only the data of that account.
