# Build plan: new structure (Home · Goals · Planner · Visualization)

Source of truth for what to build: `spec/weekly_planner_prd_and_design_doc.md` (v3). Source of truth for how it looks: `spec/frontend-design.md`. This file says in which order, with which checks, and who does what. Update the status column as slices ship.

## Rules for every slice

- **Branch:** `feat/home-and-new-structure` (from `feat/harada-goals`). One slice at a time, one commit per slice (more if a slice is large and splits cleanly). Never push; the owner decides.
- **Executor:** a `doer` agent per slice, given the slice section below plus the PRD requirement IDs. The lead session reviews screenshots and the report before the next slice starts.
- **Order is sequential.** Slices share the store, `app/utils/planner.ts`, `main.css`, the shell and the page switch, so parallel branches would conflict. Do not start a slice before the previous one is committed and reviewed.
- **Storage:** no migrations. Bump `PLANNER_STATE_VERSION` whenever the stored shape changes (the stored state resets to the seed). Keep the seed a good test dataset.
- **Definition of done (every slice):**
  - `npx nuxi typecheck` exits 0 and `npm run build` is clean (see `.claude/agent.md` for the vue-tsc note).
  - The acceptance criteria of every requirement in the slice pass, checked in the browser (not only by reading code). Date and computation logic is checked with a throwaway node script against fixture dates; report the cases.
  - Production build screenshots with headless Edge + `puppeteer-core` (installed in the session scratchpad, never in the repo): every screen the slice touches at 1280 and 400 px, light and dark. No horizontal overflow, no console errors or warnings (including hydration), focus visible on every new control, text contrast >= 4.5:1 and control borders >= 3:1 using the tokens in `frontend-design.md`.
  - UI follows `frontend-design.md` (one font, tokens only, no uppercase micro-labels, nothing under 12px, sentence case) and the FR-UX rules (see only once, view then edit, progressive disclosure).
  - No dead code left behind by the slice; no new dependencies without asking the owner.
  - The slice's doc updates are done (below).
- **Docs per slice:** update the PRD statuses of the requirements shipped (Planned to Done, Superseded to removed), `spec/frontend-design.md` where components or screens changed (catalogue 4.x, layout 3.x), refresh the affected `spec/screens/` images, and the status table here and the "Current state" section of `.claude/agent.md`.
- **Report format from the doer:** files changed, requirement IDs done or partial (with evidence), deviations and why, verification results, screenshot paths, anything unverified, `git status --short`, commit hash.

## Slices

| # | Slice | PRD requirements | Size | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| 0 | Date foundation | FR-DATE-1 to 6 | M | none | Done (commit "feat: date foundation (real today, ISO weeks, year switcher, effective template)"); FR-DATE-6 partial until Home |
| 1 | New shell, URL state, Visualization | FR-UX (routing), FR-VIZ-* | M | 0 | Not started |
| 2 | Planner: activities and the 24x7 grid | FR-PLAN-13 to 21 | L | 1 | Not started |
| 3 | Goals: vision, Harada map, category detail | FR-GOALS-13 to 22 | M-L | 1 (2 for activity links) | Not started |
| 4 | Home: Day, Week, Month | FR-HOME-1 to 14 | M | 0, 2, 3 | Not started |
| 5 | Cleanup, docs, screenshots | v3 "Impact on existing build" | S | 0 to 4 | Not started |
| 6 | Journal experiment | FR-HOME journal items | S | 4 | Not started |

### Slice 0: date foundation

Goal: Home and Visualization can know what "today", "this week" and "the year" are. Fixes the defects the new screens depend on.

- Real date logic: today, ISO weeks (a year can have 53), any year, a year switcher on the year grid; remove `WEEK_DATES_2026` and the hard-coded `CURRENT_WEEK_INDEX`.
- One shared function for the effective template of a date: the applied week's template, otherwise the active template (PRD FR-DATE-2).
- Seed the applied weeks for the current year, not a fixed 2026.
- Remove `ensureDefaultWeek` (it writes today's date as a week start under a fixed id on every load).
- Projections use the effective template per week (PRD section 17); remove the always-zero "excluded weeks" notion.
- Remove week status, overrides, notes and `excludedWeekStatuses` from the model (decided: Q5); the unused Configuration note goes with them.
- Client-only rendering for any date-dependent content (no hydration mismatch).
- Bump `PLANNER_STATE_VERSION`.
- Verify with a node script: ISO week boundaries (including the 53-week year and dates near New Year), effective template cases, projection totals.

### Slice 1: shell, URL state, Visualization

- Tabs become Home, Goals, Planner, Visualization; Home is the default. Tab, selected item and edit mode live in the route query (FR-UX); an Edit link can open an item on another screen.
- Home and Goals can start as thin placeholders that keep working until their slices ship; Configuration stays reachable until slice 3 removes it; Insights is replaced by Visualization in this slice.
- Visualization (read-only): year metrics with a projection horizon, the week-by-week and monthly stacked chart from effective templates (unassigned weeks drawn lighter), the category breakdown, the goals-vs-planned overview if it fits. The old Insights element mapping is PRD section 11.8.

### Slice 2: Planner

- Activity list, selection, detail view with an Edit mode (name, short code, category, colour), add and delete with inline confirmation (no `confirm()`).
- The 24x7 activity grid edits the active template: paint across days and hours, release to apply; a taken hour is reassigned only after explicit acceptance; no overlaps; an activity counted once; keyboard operable.
- With no activity selected, the grid shows the whole template read-only.
- Template switcher and the year grid stay in the Planner (placement per the PRD); template delete with inline confirmation.
- Activity colour becomes independent after creation; recolouring a category no longer overwrites activity colours (assumption A6).
- Activities leave the Configuration tab. The old drag-select grid is retired in slice 5; until then keep it reachable only if needed to avoid a broken screen.

### Slice 3: Goals

- Vision section first (edit the ambition; auto-growing textarea), then the read-only Harada map (ambition in the centre, eight cells showing only order, name, colour and the "To define" flag; selecting a cell selects the category), then the category list (colour, name, counts) with a detail panel in view mode and an Edit mode.
- Detail: activities (read-only rows with Edit links to the Planner), habits (view rows, Edit mode with frequency, minutes, activity link; the habit's own category first, show the linked activity's category), 1-year target, 5-year goal, and the goals-vs-planned bar as the primary signal.
- Category management (add, rename, recolour, reorder, remove with move-and-remove) lives here. Remove the Configuration tab.

### Slice 4: Home

- Day, Week, Month selector (current periods only, assumption Q4). Day: today's blocks in time order with projected time, activity, category and an Edit link. Week and Month: activities sorted by hours.
- Time-per-category bar for the selected period, totals, one-line "below habit target" signal.
- Month uses the calendar-day rule (assumption A1). Client-only rendering for date content.

### Slice 5: cleanup

- Remove the old drag-select week grid, action bar, resize handles, dead CSS and dead store actions; remove stale docs; update `frontend-design.md` catalogue, breakpoints and screenshots (add Home and Visualization shots).

### Slice 6: journal experiment (low priority)

- A small Journal card on Home: one plain-text note per local date saved in the state (bump the version), a key message derived from the ambition and a different category's 1-year target each day, and a readings placeholder. No habit check-ins, no AI, no dictation. Mark it as an experiment in the UI copy and the PRD.

## Risks and notes

- The Planner slice is the largest and riskiest (new grid component, reassign flow, keyboard support). If it overruns, split it: (2a) activity list, detail and edit; (2b) the 24x7 grid.
- No test runner exists. Date logic is the riskiest pure code; if the owner approves a dev dependency, add Vitest in slice 0 and turn the node scripts into tests.
- Each slice must leave the app fully working. Placeholders are allowed; broken screens are not.

## Status log

| Date | Event |
| --- | --- |
| 2026-10-25 | Plan written from PRD v3. |
| 2026-10-25 | Slice 0 (date foundation) done in one commit. FR-DATE-1 to 5 done; FR-DATE-6 partial until the Home placeholder (slice 4). |
