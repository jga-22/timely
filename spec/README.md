# Timely specification

This folder holds the product and design specification for Timely. The code is the source of truth for what is built. These documents explain intent, describe the current product, specify the next structure (v3) and list open work.

## Contents

| Path | What it is | How to use it |
| --- | --- | --- |
| `README.md` | This index, plus a short changelog. | Start here. |
| `weekly_planner_prd_and_design_doc.md` | The product requirements and design document, **v3 draft**: the built product plus the new four-screen structure (Home, Goals, Planner, Visualization). Requirements have IDs and a status (Done, Partial, Not built, Planned (v3), Superseded, Dropped); every Planned (v3) item has acceptance criteria. Includes the UX rules, the see-only-once matrix, the old-Insights mapping, the implementation slices, assumptions and open questions. | Read before changing behaviour. Update statuses and the backlog when a feature ships or a decision changes. |
| `frontend-design.md` | The current visual style, derived from the code: tokens, layout, breakpoints, component catalogue, accessibility, voice, do and don't, verification, known gaps. | Read before any UI change. **Its component catalogue (sections 4.9 to 4.13), breakpoints (3.4), phone behaviour (3.5) and screenshot table describe the v2 screens; update them as each v3 screen ships** (Home, Goals list and detail, activity grid, Visualization; remove Insights and Configuration entries). |
| `build-plan.md` | Slice-by-slice plan to build the v3 structure: rules every slice follows, definition of done, slice scopes, status. | Read before starting or reviewing a slice; update the status table as slices ship. |
| `references/grille-harada-meilleure-version.html` | The standalone Harada prototype; origin of the blue palette and the 3x3 layout. Not part of the build. | Visual and content reference for the Goals Harada map. Tokens in `app/assets/css/main.css` remain the source of truth. |
| `screens/` | Reference screenshots of the v2 build (list below). | Compare before and after a UI change. Replace them as the v3 screens ship. |

Screenshots in `screens/` (Goals and Planner from the v2 build; Home and Visualization from slice 1; Planner activities and Configuration from slice 2a):

| File | Size | Notes |
| --- | --- | --- |
| `goals-desktop-light.png` | 1280 px wide | Goals, light |
| `planner-desktop-light.png` | 1280 px wide | Planner, light, with an activity selected (slice 2a; the week grid below is still the old one) |
| `planner-activity-detail-desktop-light.png` | 1280 px wide | Activities section crop, detail view, light (slice 2a; a crop, not a viewport) |
| `home-desktop-light.png` | 1280 px wide | Home placeholder, light (slice 1) |
| `visualization-desktop-light.png` | 1280 px wide | Visualization, light (slice 1; replaces Insights) |
| `visualization-mobile-light.png` | 400 px wide | Visualization, light (slice 1) |
| `configuration-desktop-light.png` | 1280 px wide | Configuration, light: categories only (slice 2a; removed in slice 3) |
| `goals-mobile-light.png` | 400 px wide | Goals, light |
| `planner-mobile-light.png` | 400 px wide | Planner, light, activities list (slice 2a) |
| `planner-desktop-dark.png` | 1280 px wide | Planner, dark |

All screenshots are viewport-sized (900 px high on desktop, 860 px on phones). For v3, add `home-*` and `visualization-*` captures at 1280 and 400 px, light and dark.

## How the spec is used

- Product questions: read the PRD. Section 9 lists every requirement with its status; section 20 gives the impact on the build and the slice order; section 21 is the backlog; section 23 lists decisions, assumptions and open questions.
- UI work: read `frontend-design.md` sections 1, 8 and 9 first, then PRD section 11 (UX concept and edit pattern). Use the tokens; do not add colours or fonts.
- Data changes: the data model is in `app/types/planner.ts` (summarised in PRD section 14). Bump `PLANNER_STATE_VERSION` in `app/utils/planner.ts` when the saved shape changes. In development a mismatch resets saves to the seed.
- Keep `spec/` out of the Nuxt build. It is plain Markdown and HTML.

---

## 1. Status summary

Built (v2): a local-first Nuxt 4 app with four tabs, Goals, Planner, Insights and Configuration. Data lives in `localStorage`; no backend, no login. One stylesheet, blue accent, IBM Plex Sans, light and dark themes.

Specified (v3, not built): four screens, **Home** (default; today, week and month in projected hours, plus a small journal experiment), **Goals** (vision, read-only Harada map, category list and detail), **Planner** (activity list and detail, 24x7 activity grid, templates, year grid) and **Visualization** (read-only charts). Insights and Configuration are removed.

## 2. Changelog

### v3 draft (2026-10-25)

- **New navigation:** Home, Goals, Planner, Visualization; Home is the default. Insights and Configuration are removed; their content is mapped in PRD 11.8.
- **UX rules:** see only once (one primary place per fact), see then edit (view mode with an Edit button), see only what you need (overview, list, detail, edit). Inline edit on the owning screen; Edit elsewhere navigates there.
- **Home:** projected activities and time per category for Day, Week, Month; read-only with Edit links; journal card as a low-priority experiment (one note per day, a key message derived from the ambition and targets, a readings placeholder).
- **Goals:** vision section for the ambition, read-only Harada map, category list with detail (goals, target, habits, activities, goals vs. planned) and edit mode. Category management moves here.
- **Planner:** activity list with detail and editing (name, code, category, colour); 24x7 activity grid editing the active template, with explicit reassignment of taken hours and keyboard operation. Templates and the year grid stay.
- **Visualization:** year metrics, week-by-week chart, year by category, full projection list with the horizon setting, goals-vs-planned overview.
- **Dates:** real "today", ISO weeks, any year (2026 has 53 weeks), effective template per week; hard-coded 2026 and week 16 to be removed.
- **Data:** no change for the restructure; `journal` entries added with the experiment.

### v2 (2026-10-25)

- Goals (Harada) tab added and made default; categories merged with goal dimensions; activities as a second level; measurable habits; Insights reworked around goals vs. planned; navigation Goals, Planner, Insights, Configuration; drag-selection authoring; versioned storage; single-font redesign. Not built from v1: week status, multi-day apply, weekday chart, template comparison, import and export.

### v1 (2026-04-15)

- Original plan: weekly templates, applied weeks with statuses, projections, Chart.js, JSON import and export. Text in git history.

## 3. Open items for the team

- Owner decisions still open are in PRD 23.3 (retire the drag-select grid, unassigned weeks, basis of goals vs. planned, Home period navigation, week status, cross-category habit links). Assumptions to confirm are in 23.2.
- `frontend-design.md` must be updated slice by slice as the v3 screens are built (see Contents).
- The root `README.md` still describes an older scaffold; a rewrite is out of scope for this spec.
