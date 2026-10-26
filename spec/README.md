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

Screenshots in `screens/` (Planner files regenerated on 26 October 2026 from the production build of `fix/restore-original-week-grid`, clean seed; the other files from the production build after slice 6, fresh seeded state, 25 October 2026):

| File | Size | Notes |
| --- | --- | --- |
| `home-desktop-light.png` | 1280 px wide | Home, light, Day: totals, time per category with legend in two columns, the day blocks with Now |
| `home-week-desktop-light.png` | 1280 px wide | Home, light, Week: activities by hours |
| `home-month-desktop-light.png` | 1280 px wide | Home, light, Month: each template and its days in the header line |
| `home-desktop-dark.png` | 1280 px wide | Home, dark, Day |
| `home-mobile-light.png` | 400 px wide | Home, light, Day, full page |
| `home-week-mobile-light.png` | 400 px wide | Home, light, Week, full page |
| `home-month-mobile-light.png` | 400 px wide | Home, light, Month, full page |
| `home-journal-desktop-light.png` | 1280 px wide | Home, light, Day, with a long journal note (Experiment card, key message, Readings) |
| `goals-desktop-light.png` | 1280 px wide | Goals, light: vision, Harada map, list and the first category's detail |
| `goals-desktop-dark.png` | 1280 px wide | Goals, dark |
| `goals-detail-edit-desktop-light.png` | 1280 px wide | Goals, light: a category in edit mode |
| `goals-mobile-light.png` | 400 px wide | Goals, light: nothing selected, the list and map |
| `goals-detail-mobile-light.png` | 400 px wide | Goals, light: a category selected, detail full width with Back to list |
| `planner-desktop-light.png` | 1280 px wide | Planner, light, full page, clean seed: the week grid (range select, original interaction), the Activities chips under it, and the year grid at full width |
| `planner-desktop-dark.png` | 1280 px wide | Planner, dark, full page, clean seed, the same layout |
| `planner-mobile-light.png` | 400 px wide | Planner, light, full page at 400 px, clean seed: the week grid scrolls sideways inside its frame, Activities chips wrap under it, year closed |
| `visualization-desktop-light.png` | 1280 px wide | Visualization, light |
| `visualization-desktop-dark.png` | 1280 px wide | Visualization, dark |
| `visualization-mobile-light.png` | 400 px wide | Visualization, light, full page |

Desktop captures are 1280 px wide. The Planner captures and the phone captures are full page. Regenerate with the scratchpad capture script (not in the repo) after a UI change.

## How the spec is used

- Product questions: read the PRD. Section 9 lists every requirement with its status and evidence; section 20 gives the impact on the build and the slice order; section 21 is the backlog; section 23 lists decisions, assumptions and open questions.
- UI work: read `frontend-design.md` sections 1, 8 and 9 first, then PRD section 11 (UX concept and edit pattern). Use the tokens; do not add colours or fonts.
- Data changes: the data model is in `app/types/planner.ts` (summarised in PRD section 14). Bump `PLANNER_STATE_VERSION` in `app/utils/planner.ts` when the saved shape changes. In development a mismatch resets saves to the seed.
- Keep `spec/` out of the Nuxt build. It is plain Markdown and HTML.

---

## 1. Status summary

Built: a local-first Nuxt 4 app with four tabs, Home, Goals, Planner and Visualization. Data lives in `localStorage`; no backend, no login. One stylesheet, blue accent, IBM Plex Sans, light and dark themes.

The journal experiment on Home (FR-HOME-11 to 13, slice 6) is built and marked as an experiment. Not built yet: export, import and reset (FR-APP-5). Insights and Configuration are removed.

## 2. Changelog

### v3 build (2026-10-25 to 2026-10-26)

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
