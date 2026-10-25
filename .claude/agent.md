# Timely: agent context

Shared context for any Claude Code session working on this repo. Read it first, then the specs it points to. Keep it short and current: update it when a decision, convention or open item changes.

## What this is

Timely is a local-first planning app. It combines two ideas:

- **The why (goals):** a Harada grid. One 5-year ambition, 8 life areas (categories), each with a 5-year goal, a 1-year target and measurable daily habits.
- **The time (planner):** a weekly template of hour slots, applied across the 52 weeks of the year, with projections and insights.

The link between them is the product: a habit points at an activity, and Insights compares the time scheduled for those activities with the time the habits ask for.

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

- `app/app.vue`: app shell, topbar, tab list, theme toggle.
- `app/pages/index.vue`: switches the view by the `tab` route query (`useNav`, see URL state below).
- `app/components/harada/`: Goals view (`HaradaView.vue`, `HabitList.vue`).
- `app/components/AutoTextarea.vue`: shared auto-growing textarea.
- `app/components/planner/`: `PlannerView.vue` (template bar, activity list and detail, year grid), `ActivityGrid.vue` (the 24x7 activity grid, client only), `LegendView.vue` (the Configuration tab; categories only until slice 3). `app/components/viz/VisualizationView.vue` (charts, replaced Insights), `app/components/home/HomeView.vue` (placeholder), `app/components/YearNav.vue` (shared year switcher), `app/composables/useNav.ts` (URL state and nav helper).
- `app/types/planner.ts`: data model. `app/utils/planner.ts`: seed data, state validation, pure calculations, effective template. `app/utils/dates.ts`: calendar helpers (local today, ISO weeks, Monday of a date). `app/composables/usePlannerYear.ts`: today and the selected year, client-only. `app/stores/planner.ts`: Pinia store and actions.
- `app/utils/storage/` and `app/plugins/planner-persistence.client.ts`: localStorage persistence.
- `app/assets/css/main.css`: all design tokens and styles. `vuetify.config.ts`: Vuetify themes (`timely`, `timelyDark`).
- `spec/`: specifications (below). `design/` is an old gitignored design export with the previous look; do not use it.

## Specs (read before changing behaviour or UI)

- `spec/README.md`: index of the specs and what changed since the PRD.
- `spec/frontend-design.md`: the current visual style, tokens, components and rules. **Authoritative for any UI work.**
- `spec/weekly_planner_prd_and_design_doc.md`: the PRD (v3, target structure with requirement IDs and acceptance criteria). `spec/build-plan.md`: slice-by-slice build plan.
- `spec/references/grille-harada-meilleure-version.html`: the original Harada prototype; origin of the palette and the Goals layout.

## Target structure (in progress)

The product is moving to Home · Goals · Planner · Visualization (Insights and Configuration removed). The decisions, requirements and acceptance criteria are in `spec/weekly_planner_prd_and_design_doc.md` (v3); the slice-by-slice plan is `spec/build-plan.md`. Work on branch `feat/home-and-new-structure`, one slice at a time, one commit per slice. Sections below that describe the CURRENT build (navigation order, Configuration tab, drag-select week grid) are superseded slice by slice; update them as each slice ships.

## Model and decisions

- **One list of categories.** Goal dimensions and planner categories are the same thing. `Category` has `id, name, color, order` plus `goal5y, target1y, targetTbd`. The first 8 categories by `order` form the 3x3 Goals grid. Categories are managed only in the Configuration tab.
- **Activities are a separate level** under a category. **Habits** belong to a category, are measurable (frequency count per day/week/month plus optional `minutesPerOccurrence`) and may link to an activity.
- **Insights compares like with like:** per category, the hours scheduled through the activities its habits link to, against the hours those habits ask for. A quiet second line shows everything scheduled in the category. An activity is never counted in two categories.
- **Year:** the planner shows one ISO year, by default the current ISO year. It is set on mount, not persisted (a reload selects the current year again). Unassigned weeks use the active template everywhere (`effectiveTemplate`).
- **Navigation order is Home, Goals, Planner, Visualization, Configuration** (Configuration is transitional; slice 3 removes it). Home is the default tab. Templates are still managed in the Planner's template switcher, not in Configuration.
- **URL state.** Tab, selected item and edit mode live in the route query: `?tab=home|goals|planner|visualization|configuration&item=<id>&edit=1`. An unknown or missing tab shows Home. In code, `useNav()` gives `go(tab, { item, edit })` (pushes history) and `link(tab, { item, edit })` (a NuxtLink target, for Edit links to another screen). Nothing else is in the URL; the year and the Visualization Weekly or Monthly choice are view state.
- **Storage has no migrations.** The saved state carries `version` (`PLANNER_STATE_VERSION`). A version mismatch or an invalid or corrupt state is discarded and replaced by the seeded default. Bump the version whenever the stored shape changes. Keep the seed in `app/utils/planner.ts` a good test dataset (several categories with linked habits so Insights shows real bars).
- **UI language is English.** User-entered content can be in any language.
- **Style:** one font (IBM Plex Sans), calm blue palette, minimalist, light and dark themes. Details in `spec/frontend-design.md`. Do not reintroduce serif or mono fonts or the old terracotta accent.

## Working conventions

- **Delegate implementation to the `doer` agent** to save tokens, with explicit file paths, steps and verification. The lead session plans, reviews screenshots and reports. Give the doer a clear "commit / do not commit / push" instruction every time.
- **Commit and push only when the owner asks.** Never push to `main`. Stage specific files by name, never `git add -A`. Never touch the owner's untracked files.
- **Commit messages** are conventional (`feat:`, `fix:`, `style:`, `chore:`), and end with a blank line and these trailers:
  ```
  Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01F4QzgWo6pmyzMMJzrBAvTG
  ```
  (Use the trailers the session's system reminder gives if they differ.)
- **Line endings:** the working copy is CRLF and the repo stores LF. Keep CRLF on edited files.
- **Verify UI work visually.** Build for production, serve `.output/server/index.mjs`, and take headless-Edge screenshots with `puppeteer-core` installed in the session scratchpad, never in the repo. Check 1280px and 400px, light and dark, no horizontal overflow, no console errors. Look at the screenshots; do not trust only automated checks.
- **Permissions:** the owner's personal setup is in `.claude/settings.local.json` (gitignored): edits are accepted automatically, build/typecheck/read-only git are allowed, and `git push`, installs and `rm` still ask.
- **Tools on this machine:** Windows 11, Git Bash and PowerShell. The GitHub CLI (`gh`) is not installed, so PRs are opened by the owner through the compare link; PR text is handed over to paste.

## Current state

- Branch `feat/home-and-new-structure` (from `feat/harada-goals`) follows `spec/build-plan.md`, one slice per commit. Slice 0 (date foundation) is done: real today, ISO weeks (52 or 53), year switcher on the Planner year grid, effective template shared by Visualization and projections, week status removed, storage version 6.
- Slice 2a (Planner activities: list, detail, edit, add and delete; activities leave Configuration) is done in one commit. Selection and edit mode are in the URL (`item`, `edit`). Recolouring a category keeps hand-picked activity colours (A6). Slice 2b (the 24x7 activity grid; the old week grid is retired) is done in its own commit, so slice 2 is complete except the FR-PLAN-17 edit-mode question. Next: slice 3 (Goals).
- Slice 1 (shell, URL state, Visualization) is done in one commit: tabs Home (default), Goals, Planner, Visualization and a transitional Configuration; `VizVisualizationView` replaces Insights; the projection horizon moved from Configuration to Visualization. Storage version unchanged (6).
- Branch `feat/harada-goals` is open as PR #7 against `main` (`https://github.com/jga-22/timely`) with the earlier work: Goals tab, merged categories, measurable habits, English seed, auto-growing text boxes, calm single-font redesign, navigation order. All earlier fixes (`fix/mobile-version`, `fix/planner`) are already in `main`.

## Open items and ideas

- Move template management into Configuration (today it lives in the Planner's template switcher).
- Most seeded habits are not linked to activities yet; Economic and Social have no activities (Environment has Errands), so they show "No target yet". Add activities and link habits in the app or the seed.
- Hydration: "Hydration completed but contains mismatches" appears in the production build whenever the saved state differs from the seed (slice 2a: a changed ambition sentence on Goals is enough; fresh loads are clean). The server renders the seed and the client restores storage before hydrating. A client-only wrapper is the fallback, but it changes server output; decide with the owner.
- Year and saves: a reload selects the current year again, and a save from an earlier year is never re-seeded, so a new year starts with unassigned weeks (paint them or accept the active template).
- Annual and quarterly habits are approximated as monthly (frequency only supports day/week/month).
- The owner runs Node v24.12.0, which predates several 2026 security releases; they plan to update to the latest 24.x LTS. Optionally add `.nvmrc` and `engines` to pin a minimum.
- Not yet checked visually: the dark Visualization and the monthly chart at 400 px (slice 1 reviewed the light weekly chart at 1280 px and the light 400 px layout).
- PR #7's title and description are outdated; the owner updates them from text we provide.
