# Database storage

Timely keeps its data in the browser by default (localStorage). It can instead save to Supabase (Postgres with auth and row level security). This folder holds the SQL for that mode.

Two designs exist. The **snapshot** (this step) stores the whole `PlannerState` as one JSON document per user, using the same versioning rule as localStorage: a version mismatch or invalid data is discarded and replaced by the seed. The **normalised schema** (`schema.sql` with its ERD and data model, on the `docs/database-model` branch, not yet merged) is the later path: one table per entity with constraints. Moving to it means a one-off import of the snapshot. The snapshot is the first step because it reuses the existing store and validation unchanged.

## Choosing the storage

| Mode | `NUXT_PUBLIC_STORAGE` | Where data lives | Needs |
| --- | --- | --- | --- |
| Local (default) | unset or `local` | This browser's localStorage | Nothing. No network calls, no auth code loaded. |
| Supabase | `supabase` | `public.planner_state`, one row per signed-in user | `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_ANON_KEY`, the auth setup below |

Set the variables in `.env` (see `.env.example` at the repository root) and restart the dev server. A Supabase mode with missing settings falls back to local storage. In Supabase mode the topbar shows a small status (Loading, Saving, Saved, Not saved). Saves are debounced by 600 ms and flushed when the page is hidden. If the first load fails, nothing is written, so the remote copy is never overwritten; reload to try again.

Only the anon key goes to the browser. Row level security limits every request to the signed-in user's own row.

### Supabase, local quick start

Requires Docker and the Supabase CLI. Run these in a scratch folder outside the repository, because `supabase init` creates a `supabase/` folder.

```bash
mkdir ~/scratch/timely-db && cd ~/scratch/timely-db
supabase init                                   # creates supabase/config.toml
supabase start                                  # starts the local stack
cp <repo>/spec/database/snapshot.sql supabase/migrations/20261027000000_planner_state.sql
supabase db reset                               # applies the migration to the local database
supabase status                                 # prints API URL and anon key
```

Then in `.env` at the repository root:

```bash
NUXT_PUBLIC_STORAGE=supabase
NUXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NUXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
```

### Auth setup (interim: anonymous sign-in)

Until the email login lands, the adapter signs each browser in anonymously, so each browser has its own data. Enable it in the project: Authentication, Sign In / Providers, Anonymous sign-ins. For the local stack set `enable_anonymous_sign_ins = true` under `[auth]` in `supabase/config.toml`, then run `supabase stop && supabase start`.

## Files

| File | What it is |
| --- | --- |
| `snapshot.sql` | `planner_state` with a foreign key to `auth.users` and four own-row RLS policies (select, insert, update, delete). |
| `README.md` | This file. |
