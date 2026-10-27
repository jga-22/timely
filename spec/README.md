# Timely specification

This folder holds the product and design specification for Timely. The code is the source of truth for what is built. These documents explain intent, describe the current product and list open work.

## Contents

| Path | What it is | How to use it |
| --- | --- | --- |
| `README.md` | This index, plus a short changelog. | Start here. |
| `weekly_planner_prd_and_design_doc.md` | The product requirements and design document (v3): the four-screen product (Home, Goals, Planner, Visualization). Requirements have IDs and a status (Done, Partial, Not built, Planned (v3), Superseded, Dropped) with evidence for each Done or Partial item. Includes the UX rules, the see-only-once matrix, the old-Insights mapping, the implementation slices, assumptions and open questions. | Read before changing behaviour. Update statuses and the backlog when a feature ships or a decision changes. |
| `frontend-design.md` | The current visual style, derived from the code: tokens, layout, breakpoints, component catalogue (sections 4.9 to 4.17 cover the current screens), accessibility, voice, do and don't, verification, known gaps. | Read before any UI change. Update it with the code in the same change. |
| `build-plan.md` | Slice-by-slice plan to build the v3 structure: rules every slice follows, definition of done, slice scopes, status log and what remains. | Read before starting or reviewing a slice; update the status log as slices ship. |
| `references/grille-harada-meilleure-version.html` | The standalone Harada prototype; origin of the blue palette and the 3x3 layout. Not part of the build. | Visual and content reference for the Goals Harada map. Tokens in `app/assets/css/main.css` remain the source of truth. |
| `screens/` | Reference screenshots of the current build (list below), from the production build at 1280 and 400 px. | Compare before and after a UI change. Keep the names; replace the files when a screen changes on purpose. |
| `database/` | Draft design for storing the data in PostgreSQL or Supabase instead of localStorage (not built): data model, `schema.sql`, ERD (draw.io and Mermaid) and the effort evaluation. | Read before any storage change. The app does not depend on it yet; the storage decision is pending with the owner. |

Screenshots in `screens/` (regenerated on 26 October 2026 from the production build of `feat/ux-polish`, clean seed, no test paint):

| File | Size | Notes |
| --- | --- | --- |
| `home-desktop-light.png` | 1280 px wide | Today, light: title and date, the hour timeline with 9h, 12h, 18h and 22h, the activities list, the journal |
| `home-desktop-dark.png` | 1280 px wide | Today, dark |
| `home-mobile-light.png` | 400 px wide | Today, light, full page |
| `goals-desktop-light.png` | 1280 px wide | Goals, light: legend, vision, Harada map with attention outlines, list with attention rows, first category detail |
| `goals-desktop-dark.png` | 1280 px wide | Goals, dark |
| `goals-mobile-light.png` | 400 px wide | Goals, light: the category list with the legend, full page |
| `goals-detail-desktop-light.png` | 1280 px wide | Goals, light: Spiritual, needed and allocated bars, verdict "On track" |
| `goals-detail-edit-desktop-light.png` | 1280 px wide | Goals, light: Spiritual in edit mode |
| `planner-desktop-light.png` | 1280 px wide | Planner, light, full page, clean seed: title "Planner", week grid, activities, year grid |
| `planner-desktop-dark.png` | 1280 px wide | Planner, dark, full page |
| `planner-mobile-light.png` | 400 px wide | Planner, light, full page at 400 px |
| `insights-desktop-light.png` | 1280 px wide | Insights, light: one year by month, stacked by category, categories with hours and share |
| `insights-desktop-dark.png` | 1280 px wide | Insights, dark |
| `insights-mobile-light.png` | 400 px wide | Insights, light, full page |
| `insights-mobile-dark.png` | 400 px wide | Insights, dark, full page |

`goals-detail-mobile-light.png` predates this batch and was not regenerated (see the open items in `.claude/agent.md`).

Desktop captures are 1280 px wide. The Planner captures and the phone captures are full page. Regenerate with the scratchpad capture script (not in the repo) after a UI change.

## How the spec is used

- Product questions: read the PRD. Section 9 lists every requirement with its status and evidence; section 20 gives the impact on the build and the slice order; section 21 is the backlog; section 23 lists decisions, assumptions and open questions.
- UI work: read `frontend-design.md` sections 1, 8 and 9 first, then PRD section 11 (UX concept and edit pattern). Use the tokens; do not add colours or fonts.
- Data changes: the data model is in `app/types/planner.ts` (summarised in PRD section 14). Bump `PLANNER_STATE_VERSION` in `app/utils/planner.ts` when the saved shape changes. In development a mismatch resets saves to the seed.
- Keep `spec/` out of the Nuxt build. It is plain Markdown and HTML.

---

## 1. Status summary

Built: a local-first Nuxt 4 app with four tabs, Home, Goals, Planner and Visualization. Data lives in `localStorage`; no backend, no login. One stylesheet, blue accent, IBM Plex Sans, light and dark themes.

The journal on Home (FR-HOME-11 to 13) keeps one note a day; the key message, the readings placeholder and the experiment label are gone (UX polish). Not built yet: export, import and reset (FR-APP-5). Insights (the former Visualization) is the planned-hours chart and category shares; Configuration is removed.

## 2. Changelog

### Storage adapter (2026-10-27, branch `feat/storage-adapter`)

- Persistence is pluggable: `app/utils/storage/` picks `local` (default, localStorage, unchanged) or `supabase` (one `planner_state` row per user, debounced saves, status in the topbar) from `NUXT_PUBLIC_STORAGE`. The snapshot SQL is `spec/database/snapshot.sql`; setup in `spec/database/README.md`. The PRD has FR-APP-9 (storage modes) and FR-APP-10 (email sign-in in Supabase mode). Browser checks used a fake Supabase server; a real project run is still open.

### UX polish (2026-10-26, branch `feat/ux-polish`, on PR #10)

- One commit per item: Home is Today only (no period selector; hour timeline with 9h, 12h, 18h, 22h; journal plain); Goals compares needed and allocated hours per category with a verdict (Missing, over, On track, No time target), red attention outlines on rows and map cells, and a legend; activities can also count toward other categories (`alsoCategoryIds`, storage version 8, no migration); the Visualization tab is Insights (one planned-hours chart by year, quarter, month or week, categories in hours or weeks); the copy sweep removes intro and helper text. PRD sections 9.11 and 23.1 and the design spec are updated.
- Known issue, not fixed here: a saved state that differs from the seed keeps stale class bindings in Goals after a reload (the attention outline) until the list re-renders. Decision needed with the owner (see `.claude/agent.md`, open items).

### v3 build (2026-10-25 to 2026-10-26)

- UX improvements on `feat/ux-improvements` (one commit per item): Home shows the activities, then the hour timeline, then the journal (totals and category bar removed); Goals is list-first with Close and Escape, and the Harada matrix only from 1100 px; one planned-time palette (empty and planned fills, 3:1 rule, `utils/palette.ts`, design spec section 5); Visualization opens with the year recap, then Goals vs. planned, then Key insights. PRD statuses and 23.1 updated. Screenshots regenerated from a clean seed.
- Planner week grid restored to the original range-select interaction on `fix/restore-original-week-grid` (FR-PLAN-23, 24). It supersedes the slice 7 brush palette (FR-PLAN-17 to 20 and 22); Activities is a compact list under the week; storage is unchanged. Planner screenshots regenerated from a clean seed.

- Slices 0 to 6 are done (`build-plan.md`): date foundation, shell and Visualization, Planner activities, the 24x7 activity grid, Goals, Home, cleanup and this audit. The week grid paints at once with the brush (FR-PLAN-17, slice 7); Goals can open the Planner's add form with a category preselected (FR-GOALS-20).
- The old week grid, Insights, Configuration and the legend view are removed; their code and wording are gone from `app/` and this spec, except where the PRD keeps the history (superseded rows, the mapping in PRD 11.8).

### v3 draft (2026-10-25)

- **New navigation:** Home, Goals, Planner, Visualization; Home is the default. Insights and Configuration are removed; their content is mapped in PRD 11.8.
- **UX rules:** see only once (one primary place per fact), see then edit (view mode with an Edit button), see only what you need (overview, list, detail, edit). Inline edit on the owning screen; Edit elsewhere navigates there.
- **Home:** activities and time per category for Day, Week, Month; read-only with Edit links; journal card as an experiment (slice 6).
- **Goals:** vision section for the ambition, read-only Harada map, category list with detail and edit mode. Category management moves here.
- **Planner:** activity list with detail and editing; 24x7 activity grid editing the active template, with explicit reassignment of taken hours and keyboard operation. Templates and the year grid stay.
- **Visualization:** year metrics, week-by-week chart, year by category, the projection horizon and the goals-vs-planned overview.
- **Dates:** real "today", ISO weeks, any year (2026 has 53 weeks), effective template per week.
- **Data:** no change for the restructure; `journal` (one note per local date) added in slice 6; storage version 7.

### v2 (2026-10-25)

- Goals (Harada) tab added and made default; categories merged with goal dimensions; activities as a second level; measurable habits; Insights reworked around goals vs. planned; navigation Goals, Planner, Insights, Configuration; drag-selection authoring; versioned storage; single-font redesign. Not built from v1: week status, multi-day apply, weekday chart, template comparison, import and export.

### v1 (2026-04-15)

- Original plan: weekly templates, applied weeks with statuses, projections, Chart.js, JSON import and export. Text in git history.

## 3. Open items for the team

- Owner decisions still open are in PRD 23.3: the basis of goals vs. planned (Q3) and Home navigation beyond the current day, week and month (Q4). Assumptions to confirm are in 23.2.
- Decisions and checks from slice 5 that need the owner: the unused `timeGranularity` field (stored shape), the possibly unused packages (`@mdi/font`, `vuetify`, `vue-router`), and the Partial items FR-UX-2, FR-UX-3, FR-GOALS-15 and FR-GOALS-18. Details are in `build-plan.md` and `.claude/agent.md`.
- `frontend-design.md` must be updated with each UI change (see Contents).
- The root `README.md` still describes an older scaffold; a rewrite is out of scope for this spec.
