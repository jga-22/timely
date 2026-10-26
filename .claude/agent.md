# Timely: agent context

Shared context for any Claude Code session working on this repo. Read it first, then the specs it points to. Keep it short and current: update it when a decision, convention or open item changes.

## What this is

Timely is a local-first planning app. It combines two ideas:

- **The why (goals):** a Harada grid. One 5-year ambition, 8 life areas (categories), each with a 5-year goal, a 1-year target and measurable daily habits.
- **The time (planner):** a weekly template of hour slots, applied across the 52 or 53 weeks of the year, with Home for today, this week and this month, and Visualization for the year.

The link between them is the product: a habit points at an activity, and Visualization and Goals compare the time scheduled for those activities with the time the habits ask for.

The owner is a solo developer. The app is still in dev mode: no production users, no backward compatibility needed.

## Stack and commands

Nuxt 4, Vue 3, Pinia, Vuetify (neutralised, see the style spec), TypeScript. State persists in browser `localStorage`; there is no backend.

```bash
npm run dev                 # dev server (dev-only 404s for Vuetify/mdi @fs CSS are known and harmless)
npm run build               # production build; must stay clean
npx nuxi typecheck          # must stay at 0 errors
```

If `npx nuxi typecheck` cannot resolve vue-tsc, run `npm i --no-save vue-tsc@3 @vue/language-core@3` (never commit that to `package.json` or the lockfile).

## Where things are

Four screens, one page component that switches on the `tab` query:

- **Home** (`app/components/home/HomeView.vue`, pure calculations in `app/utils/home.ts`): Day, Week and Month for the period selector; activity rows, then a timeline of the same hours (no totals, no category bar). Read-only except the period selector and the journal card (`app/components/home/JournalCard.vue`; key message in `app/utils/journal.ts`).
- **Goals** (`app/components/harada/`): `HaradaView.vue` (vision, category list, the Harada map from 1100px only), `CategoryDetail.vue` (category detail, view and edit, "+ Add activity"), `HabitList.vue` (habit rows).
- **Planner** (`app/components/planner/`): `PlannerView.vue` (template bar, the week grid, the Activities list with detail and the add form, the year grid), `ActivityGrid.vue` (the week grid: range select, action bar, activity menu, edit handles, undo; client only).
- **Visualization** (`app/components/viz/VisualizationView.vue`): the year recap (two headline numbers and the category bar), goals vs. planned, then key insights (horizon, weekly and monthly chart).

Shell and shared code:

- `app/app.vue`: app shell, topbar, tab list, theme toggle. `app/pages/index.vue`: switches the view by the `tab` route query.
- `app/composables/useNav.ts`: URL state (`tab`, `item`, `edit`, `add`, `category`) and the `go` / `link` / `setSelection` helpers. `app/composables/usePlannerYear.ts`: today and the selected year, client only. `app/composables/usePlannerMaps.ts`.
- `app/components/AutoTextarea.vue`: shared auto-growing textarea. `app/components/YearNav.vue`: shared year switcher.
- `app/types/planner.ts`: data model. `app/utils/planner.ts`: seed data, state validation, pure calculations, effective template. `app/utils/dates.ts`: calendar helpers (local today, ISO weeks, Monday of a date). `app/stores/planner.ts`: Pinia store and actions.
- `app/utils/storage/` and `app/plugins/planner-persistence.client.ts`: localStorage persistence.
- `app/utils/palette.ts` and `app/composables/usePlannerFill.ts`: the one planned-fill rule (3:1 on the surface), used by the year grid, week grid, Home and Visualization. Colour semantics: `spec/frontend-design.md` section 5.
- `app/assets/css/main.css`: all design tokens and styles. `vuetify.config.ts`: Vuetify themes (`timely`, `timelyDark`).
- `spec/`: specifications (below). `design/` is an old gitignored design export with the previous look; do not use it.

## Specs (read before changing behaviour or UI)

- `spec/README.md`: index of the specs and what changed since the PRD.
- `spec/frontend-design.md`: the current visual style, tokens, components and rules. **Authoritative for any UI work.**
- `spec/weekly_planner_prd_and_design_doc.md`: the PRD (v3, requirement IDs and acceptance criteria, with each requirement's status and evidence). `spec/build-plan.md`: slice-by-slice build plan and status log.
- `spec/screens/`: reference screenshots from the production build, named in the README.
- `spec/references/grille-harada-meilleure-version.html`: the original Harada prototype; origin of the palette and the Goals layout.

## Model and decisions

- **One list of categories.** Goal dimensions and planner categories are the same thing. `Category` has `id, name, color, order` plus `goal5y, target1y, targetTbd`. The first 8 categories by `order` form the 3x3 Goals grid. Categories are managed in Goals (list and detail edit mode); activities are managed in Planner.
- **Activities are a separate level** under a category. **Habits** belong to a category, are measurable (frequency count per day/week/month plus optional `minutesPerOccurrence`) and may link to an activity.
- **Insights compares like with like:** per category, the hours scheduled through the activities its habits link to, against the hours those habits ask for. A quiet second line shows everything scheduled in the category. An activity is never counted in two categories. (The Insights tab is now Visualization and Goals.)
- **Editing rules (PRD 11.2, 11.6):** inline edit on the owning screen, one item in edit mode per screen. The week grid is the original range-select grid (FR-PLAN-23): drag or tap to select hours, then apply, edit or clear them from its action bar; it is always editable for an hourly template. Activities are edited inline in the Activities list (`edit=1`).
- **Year:** the planner shows one ISO year, by default the current ISO year. It is set on mount, not persisted (a reload selects the current year again). Unassigned weeks use the active template everywhere (`effectiveTemplate`).
- **Navigation order is Home, Goals, Planner, Visualization.** Home is the default tab. Templates are managed in the Planner's template switcher.
- **URL state.** `?tab=home|goals|planner|visualization&item=<id>&edit=1`, plus `add=1&category=<id>` to open the Planner's add-activity form with a category preselected (from Goals, FR-GOALS-20). An unknown or missing tab shows Home; an unknown category falls back to the first. In code, `useNav()` gives `go(tab, target)` (pushes history), `link(tab, target)` (a NuxtLink target) and `setSelection(target)`. Nothing else is in the URL: the Home period is session state (Nuxt `useState`), the year and the Visualization view settings are in memory.
- **Storage has no migrations.** The saved state carries `version` (`PLANNER_STATE_VERSION`, currently 7). A version mismatch or an invalid or corrupt state is discarded and replaced by the seeded default. Bump the version whenever the stored shape changes. Keep the seed in `app/utils/planner.ts` a good test dataset (several categories with linked habits so the charts show real bars).
- **UI language is English.** User-entered content can be in any language.
- **Style:** one font (IBM Plex Sans), calm blue palette, minimalist, light and dark themes. Details in `spec/frontend-design.md`. Do not reintroduce serif or mono fonts or the old terracotta accent.

## Working conventions

- **Delegate implementation to the `doer` agent** to save tokens, with explicit file paths, steps and verification. The lead session plans, reviews screenshots and reports. Give the doer a clear "commit / do not commit / push" instruction every time.
- **Commit and push only when the owner asks.** Never push to `main`. Stage specific files by name, never `git add -A`. Never touch the owner's untracked files.
- **Commit messages** are conventional (`feat:`, `fix:`, `style:`, `chore:`, `docs:`), and end with a blank line and these trailers:
  ```
  Claude-Session: https://claude.ai/code/session_01F4QzgWo6pmyzMMJzrBAvTG
  Co-Authored-By: <the model that wrote the change, as the session's attribution reminder gives it>
  ```
- **Line endings:** the working copy is CRLF and the repo stores LF. Keep CRLF on edited files.
- **Verify UI work visually.** Build for production, serve `.output/server/index.mjs`, and take headless-Edge screenshots with `puppeteer-core` installed in the session scratchpad, never in the repo. Check 1280px and 400px, light and dark, no horizontal overflow, no console errors. Look at the screenshots; do not trust only automated checks.
- **Permissions:** the owner's personal setup is in `.claude/settings.local.json` (gitignored): edits are accepted automatically, build/typecheck/read-only git are allowed, and `git push`, installs and `rm` still ask.
- **Tools on this machine:** Windows 11, Git Bash and PowerShell. The GitHub CLI (`gh`) is not installed, so PRs are opened by the owner through the compare link; PR text is handed over to paste.

## Current state

- Branch `feat/ux-improvements`, cut from `fix/restore-original-week-grid`. PRs #7 and #8 are merged into `main`; PR #9 (`fix/restore-original-week-grid`) is open and unmerged. Nothing pushed from this branch.
- The Planner week is the original range-select grid again (FR-PLAN-23, 24). It replaces the week-first brush palette of slice 7; FR-PLAN-17 to 20 and 22 are Superseded. Storage version is unchanged (7).
- UX improvements (one commit per item): Home order and timeline, Goals list-first with Close and Escape and the matrix from 1100px, one planned-time palette, Visualization recap first. Specs updated (PRD 23.1, design spec section 5). Storage unchanged (7).
- A local `main` can lag `origin/main` (it did at beb6f93, before PR #7). Branch from `origin/main`.
- Slice 6 (journal experiment on Home, FR-HOME-11 to 13) is done as an experiment. Slice 7 is this week-grid fix. The remaining and later ideas are at the end of `spec/build-plan.md`.

## Open items and ideas

- **Hydration warning:** "Hydration completed but contains mismatches" appears when the saved state differs from the seed (for example after a rename on Goals). Fresh loads are clean. The server renders the seed and the client restores storage before hydrating. A client-only wrapper is the fallback, but it changes server output; decide with the owner.
- **Unused `timeGranularity` field** in `settings` (type and seed). Nothing reads it. Removing it changes the stored shape, so it needs a version bump that resets saved local data. Owner to decide.
- **Possibly unused packages:** `@mdi/font` (loaded through the Vuetify icon config; no icon is rendered by Vuetify), `vuetify` (only `VApp` and `useTheme`), `vue-router` (Nuxt provides it; not imported directly). Not removed; ask first.
- **Template Edit button** (FR-UX-2 Partial): templates are renamed by double-click, recoloured from the chip dot and deleted inline. Habit rows have no per-row Edit (FR-GOALS-18 Partial).
- Template management lives in the Planner's template switcher; Configuration no longer exists, so decide whether it moves anywhere else.
- Week grid keyboard path: the original grid had no keyboard support. The arrow, Shift-range, Enter and Escape path is an addition to keep FR-PLAN-19 operable. Confirm with the owner.
- Most seeded habits are not linked to activities yet; Economic and Social have no activities (Environment has Errands), so they show "No target yet". Add activities and link habits in the app or the seed.
- Year and saves: a reload selects the current year again, and a save from an earlier year is never re-seeded, so a new year starts with unassigned weeks (paint them or accept the active template).
- Annual and quarterly habits are approximated as monthly (frequency only supports day/week/month).
- The owner runs Node v24.12.0, which predates several 2026 security releases; they plan to update to the latest 24.x LTS. Optionally add `.nvmrc` and `engines` to pin a minimum.
