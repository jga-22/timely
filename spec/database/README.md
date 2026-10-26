# Database storage

Timely keeps its data in the browser by default (localStorage). It can instead save to Supabase (Postgres with auth and row level security). This folder holds the SQL for that mode.

Two designs exist. The **snapshot** (this step) stores the whole `PlannerState` as one JSON document per user, using the same versioning rule as localStorage: a version mismatch or invalid data is discarded and replaced by the seed. The **normalised schema** (`schema.sql` with its ERD and data model, on the `docs/database-model` branch, not yet merged) is the later path: one table per entity with constraints. Moving to it means a one-off import of the snapshot. The snapshot is the first step because it reuses the existing store and validation unchanged.

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

### Auth setup (email magic link)

1. **Authentication, Sign In / Providers, Email:** enabled (the default).
2. **Authentication, URL configuration:** Site URL `http://localhost:3000` (the Nuxt dev port). Under Redirect URLs add `http://localhost:3000/**`. Use your deployed URL for production.
3. **Local stack:** the local stack does not send real mail. Open Inbucket at `http://localhost:54324`, find the message and click the link. For the Site URL and redirects in the local stack, set them in `supabase/config.toml` (`site_url`, `additional_redirect_urls` under `[auth]`) and run `supabase stop && supabase start`.

Anonymous sign-in is not used. A user who signs in on a new browser sees only the data of that account.

## Files

| File | What it is |
| --- | --- |
| `snapshot.sql` | `planner_state` with a foreign key to `auth.users` and four own-row RLS policies (select, insert, update, delete). |
| `README.md` | This file. |
