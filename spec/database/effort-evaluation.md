# Effort evaluation: moving Timely to Supabase or PostgreSQL

Status: **estimate, not a commitment**. Written 26 October 2026 for the owner's decision. Sizes are T-shirt sizes (S, M, L) with rough working days for one solo developer using Claude Code, on the current codebase (Nuxt 4, Pinia, one JSON state, localStorage, no backend). Days are focused days, not calendar days. Confidence is medium: the largest uncertainty is the offline and sync work (WP 7), which depends on how far the owner wants local-first to go.

## 1. Summary

- **Effort:** about **23 to 46 focused days** for everything in the table (roughly 5 to 9 calendar weeks solo). The first usable multi-device version (phases 0 to 2) is about **13 to 24 days**.
- **Recommendation:** Supabase (hosted for deployment, the local Docker stack for development), with supabase-js in the browser under RLS. Keep the Pinia store as the API and put the database behind a thin repository layer. Plain PostgreSQL with Drizzle and Nuxt server routes is a credible alternative (section 5); it costs more work in auth and in server code.
- **Start with a spike** (phase 0, 1 to 2 days) before committing: it tests the schema, the seed and the round-trip time from the browser.

## 2. Work packages

| # | Work package | Size | Days | What it covers |
| --- | --- | --- | --- | --- |
| 0 | Spike | S | 1 to 2 | Local Supabase (Docker), apply `schema.sql`, seed one user, read categories and templates with supabase-js, measure a 168-slot paint round trip. Exit: go or no-go on the stack. |
| 1 | Schema, RLS and seed | S | 1 to 2 | Apply the schema as a migration; run the seed function; negative tests that user B cannot read or change user A's rows; confirm the generated columns and deferrable constraint on the target Postgres version. |
| 2 | Supabase client and auth | S to M | 2 to 4 | `@supabase/supabase-js` plugin with env config; local keys for dev; sign-in with email magic link; session restore; a sign-in screen and a signed-out state (new UI: follow `spec/frontend-design.md` and update it). |
| 3 | Repository layer | M | 4 to 7 | Replace `planner-persistence.client.ts` and `utils/storage/` with a repository: row to `PlannerState` mapping (including `slots` to rows and back), per-action writes for the 30 store actions, and the same public store API so views do not change. Remove the JSON save watcher. |
| 4 | Loading and SSR | M | 2 to 4 | Load data after sign-in on the client with a loading state, or on the server with the session cookie. This removes the "Hydration completed but contains mismatches" warning (the server renders the seed today; the client restores storage before hydrating). Planner grid stays client-only. |
| 5 | Nuxt server routes or direct supabase-js | S to M | 1 to 3 | Decision and wiring. Direct supabase-js with RLS is the simpler path. Server routes (with `@supabase/ssr` cookies) are needed only if the owner wants server rendering of data or secrets off the client. Includes the choice between PostgREST calls and one RPC per action. |
| 6 | Optimistic updates and errors | M | 2 to 4 | Update the store first, write in the background, roll back and show a message on failure; retry rules; what happens when a write is refused by RLS or a constraint (the trigger and the FK errors need readable messages). |
| 7 | Offline and local-first | M to L | 3 to 8 | Keep the localStorage copy as a read cache; queue writes while offline and replay them. M if a simple queue is enough; L if a sync engine (PowerSync, ElectricSQL or similar) is wanted, which adds a dependency and a new hosting piece. |
| 8 | Import of existing localStorage data | S | 1 | One-off export (JSON download) and import (paste or file) in Settings or Planner, mapped through `isPlannerState` and inserted row by row. Ids stay the same (text ids), so no translation table. |
| 9 | Painting performance and batching | M | 2 to 3 | Replace a grid change with one database call: a PL/pgSQL function that deletes and inserts the template's rows in one transaction (or an upsert of the changed hours). Measure with 168 cells. Debounce the drag-select. |
| 10 | Deployment and environments | S to M | 1 to 3 | Local Docker stack for development; Supabase cloud project for the deployed app; env files and secrets; Nuxt deploy target (Node server, Vercel or similar); backups and a restore test. |
| 11 | Testing | S to M | 2 to 4 | SQL tests for RLS and constraints (pgTAP or a script with two users); unit tests for the row mapping (add Vitest only with the owner's approval, as it is a new dependency); one browser smoke test of sign-in and a paint. |
| 12 | Docs and spec | S | 1 | `spec/database/` kept current; `frontend-design.md` for the sign-in screen; `build-plan.md` and `.claude/agent.md`. |

**Totals.** Low: 23 days. High: 46 days. Packages 7 and 3 carry most of the spread.

## 3. Phased plan

| Phase | Scope | Packages | Days | Exit criteria |
| --- | --- | --- | --- | --- |
| 0. Spike | Local Supabase, schema applied, read-only app against the seed | 0 | 1 to 2 | Round trip acceptable; the schema loads on a clean database. |
| 1. Single user, read and write | App reads and writes the database for one signed-in dev user (auto sign-in in local dev); import of the current localStorage data | 1, 3, 8 (partly 9) | 6 to 10 | Every store action persists; reload shows the same data; the seed and an import both work. |
| 2. Auth and RLS | Magic-link sign-in; RLS verified with two users; loading state; hydration warning gone | 2, 4, 5, 10 (dev and cloud) | 6 to 12 | Two accounts see only their own data; no hydration warning on a fresh load with data; a deployed build works. |
| 3. Polish | Optimistic updates, error messages, batching, tests, offline cache (and sync only if wanted) | 6, 7, 9, 11, 12 | 9 to 21 | No visible wait on a paint; offline behaviour decided and tested. |

Phases 0 to 2 are the first version a second device can use. Phase 3 can be cut to the offline cache alone, which is the cheapest useful form of local-first.

## 4. Costs

These are order-of-magnitude figures from public pricing at the time of writing. **Check the current prices before deciding.**

- **Local development:** free (PostgreSQL or the Supabase CLI). The Supabase local stack runs several Docker containers and needs a few GB of RAM. Docker Desktop has its own licence terms; check them for the owner's use.
- **Supabase hosted, free plan:** no card needed; a small database size limit; a project is paused after a period without activity, which matters for a personal app that is used only some days.
- **Supabase hosted, paid plan:** a monthly base fee for the organisation (roughly USD 25 per month) plus usage. Backups and no pausing are typical reasons to pay.
- **Self-hosted PostgreSQL on a small VPS:** roughly USD 5 to 10 per month plus backup storage and the owner's time for updates and backups. Supabase self-hosting is possible but heavier than plain PostgreSQL.
- **Nuxt hosting:** unchanged by the database choice; the app is static-friendly except for server routes if chosen.

## 5. Supabase versus plain PostgreSQL (Drizzle or Prisma, Nuxt server routes)

| Topic | Supabase | Plain PostgreSQL + Drizzle (or Prisma) + Nuxt server routes |
| --- | --- | --- |
| Auth | Built in (magic link, providers). Works with RLS through `auth.uid()`. | Must be built (sessions, magic link or OAuth, e.g. Auth.js). Several days more. |
| Authorisation | RLS policies in SQL, enforced by the database for every client. Schema is already written for it. | Enforced in server code; RLS optional. Every action needs a server route. |
| API | Generated REST (PostgREST) and RPC; the browser talks to it directly. | Hand-written routes (h3 in Nuxt). More code, one place for validation. |
| Migrations | Supabase CLI migrations in `supabase/migrations/`. | Drizzle Kit or Prisma migrations. Both are fine. |
| Local dev | Docker stack, several containers, Studio UI. | One PostgreSQL container or a local install; lighter. |
| Hosting | Managed; pausing on the free plan. | Any PostgreSQL host or a VPS. More control, more operation. |
| Lock-in | Medium: auth and the client SDK. The SQL is standard PostgreSQL. | Low. |
| Effort (phases 0 to 2) | About 13 to 24 days. | About 18 to 32 days (auth and route layer are the extra). |

**Recommendation: Supabase.** The schema already relies on `auth.uid()` and RLS; auth, RLS and local development come as one package; the effort is lower. The risk is the vendor coupling in auth and the client, which is contained if the repository layer is the only place that calls supabase-js. Choose plain PostgreSQL if the owner wants no vendor, self-hosting from the start, or server-side logic for every action. Confidence: medium-high.

## 6. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Data loss at cutover** | Existing localStorage data lost or half-imported. | Export JSON before every migration step; import is idempotent per id (insert, then verify counts); keep localStorage until phase 2 is verified. |
| **Version resets** | Today any version mismatch wipes saves (no migrations). With a database, a schema change without a migration breaks the app. | Versioned SQL migrations from phase 0; the app checks the schema version on start (one query) and shows a clear message if it is behind. |
| **Conflicts between devices** | Two devices editing the same template last-write-wins, or a whole-grid replace overwrites a concurrent paint. | Per-hour upserts instead of whole-grid writes where possible; keep last-write-wins for single rows; an updated_at check if conflicts appear. |
| **RLS mistake** | A table without a policy leaks rows or blocks writes. | Every table has four policies (already in `schema.sql`); negative tests (WP 1); no service-role key in the browser. |
| **Local stack weight** | Docker and RAM for each development session. | Plain PostgreSQL option for quick work; the spike measures this first. |
| **Latency of the grid** | Painting 168 cells as separate requests feels slow. | One RPC per grid change (WP 9); debounce; measure in phase 0. |
| **Hydration and SSR** | Server render needs data it cannot get without a session. | Load after sign-in on the client (simplest), or server routes with cookies (WP 4 and 5). |
| **Free-plan pausing** | The app is unavailable after inactivity. | Paid plan when the app is used daily, or self-hosting. |
| **Scope creep into sync** | Offline sync engines add cost and a dependency. | Decide the offline level first (owner decision 3). |
| **Dependencies** | New packages (supabase-js, @supabase/ssr, possibly Vitest, Drizzle) need the owner's approval. | Listed here so they are approved once, up front. |

## 7. Testing approach

- **Schema:** the SQL in `schema.sql` run on an empty database; then tests that (a) user B cannot select, insert, update or delete user A's rows, (b) a composite foreign key rejects a habit that points at another user's category, (c) the extra-category trigger rejects the primary category, (d) the slot primary key rejects a second activity in the same hour, (e) the seed produces 8 categories, 9 activities, 65 habits and the expected slot count.
- **Repository:** round-trip tests: `PlannerState` to rows and back equals the input for the seed and for a painted template.
- **Browser:** one smoke test per phase: sign in, paint an hour, reload, the hour is still there.

## 8. Decisions the owner must make

1. **Stack:** Supabase or plain PostgreSQL (section 5).
2. **Hosting:** local only for now, Supabase cloud, or self-hosted.
3. **Offline level:** online only; localStorage as a read cache; or a write queue; or a sync engine.
4. **Accounts:** one owner account (magic link) or open sign-up. The schema supports both.
5. **Ids:** keep text ids (the recommendation, for import) or switch to uuid.
6. **timeGranularity:** remove it (a storage change, needs a version bump and resets local data) or keep it.
7. **Existing data:** import the current localStorage data, or start empty (the app is still in development with no users).
8. **30-minute granularity:** needed or not. If needed, `template_slots` changes to half-hour slots.
9. **Server rendering of data:** client-only load after sign-in (simpler) or server routes with cookies.
10. **Approval for new dependencies:** supabase-js, @supabase/ssr, and optionally Vitest or Drizzle.

## 9. Assumptions

- One developer; Claude Code does the bulk of the code; the owner reviews and verifies.
- The app stays a single Nuxt app; no separate API service.
- Data volume is small (a few thousand rows per user at most), so performance is driven by round trips, not by query cost.
- Pricing and plan limits are as at the time of writing; verify them before deciding.
- Estimates were not checked against a running Supabase instance (Docker is not running on the machine used to write this; the schema was checked structurally only). The spike (phase 0) is the first real measurement.
