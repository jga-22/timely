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

Screenshots in `screens/` (regenerated on 27 October 2026 from the production build of `feat/polish-v3`, generic sample data, no test paint):

| File | Size | Notes |
| --- | --- | --- |
| `home-desktop-light.png` | 1280 px wide | Today, light: title and date, the hour timeline with 9h, 12h, 18h and 22h, the activities list, the journal |
| `home-desktop-dark.png` | 1280 px wide | Today, dark |
| `home-mobile-light.png` | 400 px wide | Today, light, full page |
| `goals-desktop-light.png` | 1280 px wide | Goals, light: vision, the Harada map, the category list with the needed-and-planned bar and status text under each target |
| `goals-desktop-dark.png` | 1280 px wide | Goals, dark |
| `goals-ambition-prompt-desktop-light.png` | 1280 px wide | Goals, light, Start empty: "Ambition, 5 years" with the prompt "Write your 5-year ambition" and "Save ambition" (disabled while blank) |
| `goals-mobile-light.png` | 400 px wide | Goals, light: the category list with the bars, full page |
| `goals-detail-desktop-light.png` | 1280 px wide | Goals, light: Spiritual, the needed-and-planned bar with "2 h planned of 1.5 h needed", and the quiet "Not linked" habit |
| `goals-detail-edit-desktop-light.png` | 1280 px wide | Goals, light: Spiritual in edit mode |
| `planner-desktop-light.png` | 1280 px wide | Planner, light, full page, clean seed: title "Planner", week grid, activities, year grid |
| `planner-schedule-desktop-light.png` | 1280 px wide | Week, light: the "Schedule in the week" block under Training, three days at 6PM for 1 h, with the result line and Undo (FR-PLAN-25) |
| `planner-schedule-mobile-light.png` | 400 px wide | The same block at 400 px: one column of days, duration and start |
| `planner-new-week-type-vacation-desktop-light.png` | 1280 px wide | New week type panel, light, Start from Vacation: the time-off note and the Sleep mapping row (FR-TPL-8) |
| `planner-new-week-type-vacation-mobile-light.png` | 400 px wide | The same panel at 400 px |
| `planner-desktop-dark.png` | 1280 px wide | Planner, dark, full page |
| `planner-one-type-desktop-light.png` | 1280 px wide | Planner, light, one week type, full page: the "Week type" bar with no delete, the week grid, and the Year section collapsed (closed by default, FR-YEAR-7) |
| `planner-one-type-year-open-desktop-light.png` | 1280 px wide | The same with the Year section open: the one line "Every week of 2026 uses My week.", the year nav, the painter, and the Weeks row |
| `planner-activity-edit-desktop-light.png` | 1280 px wide | Week, light: Reading in the activity editor, with Done in the panel head (Escape and Done close it and return focus to Edit, FR-PLAN-26) |
| `planner-template-edit-desktop-light.png` | 1280 px wide | Week, light: Edit week type with Done in the panel head (Escape and Done close it, FR-TPL-9) |
| `planner-mobile-light.png` | 400 px wide | Planner, light, full page at 400 px |
| `insights-desktop-light.png` | 1280 px wide | Insights, light: one year by month, stacked by category, categories with hours and share |
| `insights-desktop-dark.png` | 1280 px wide | Insights, dark |
| `insights-mobile-light.png` | 400 px wide | Insights, light, full page |
| `insights-mobile-dark.png` | 400 px wide | Insights, dark, full page |

Onboarding screens (feat/polish-v3, 27 October 2026, local storage, a fresh user; step 2 offers the eight default life areas):

| File | Size | Notes |
| --- | --- | --- |
| `onboarding-welcome-desktop-light.png` | 1280 px wide | Welcome dialog over the empty Home: the idea, Guide me, Start empty, Explore with sample data |
| `onboarding-ambition-desktop-light.png` | 1280 px wide | Step 1 of 5, Your 5-year ambition: the framing text and the one field, filled in |
| `onboarding-goals-desktop-light.png` | 1280 px wide | Step 2 of 5, Goals and habits with one goal: the Physical chip, the habit Run, "Add a second goal" |
| `onboarding-goals-two-desktop-light.png` | 1280 px wide | Step 2 of 5 with two goals: the chip the first goal uses is disabled in the second; Remove on goal 2 |
| `onboarding-tour-plan-desktop-light.png` | 1280 px wide | Step 3 of 5 on Planner: "Timely placed 3 h for Physical" and the week the build placed |
| `onboarding-tour-insights-desktop-light.png` | 1280 px wide | Step 4 of 5 on Insights: the planned-time bars of the new week |
| `onboarding-tour-plan-mobile-light.png` | 400 px wide | Step 3 of 5 on Planner at 400 px: the card at the bottom |
| `login-gate-desktop-light.png` | 1280 px wide | Sign-in page in Supabase mode, signed out, light: one centred column: the headline and its supporting line, the intro player (scene 1 of 5, paused behind a Play button, frameless), the Google sign-in button and the consent line |
| `login-gate-desktop-dark.png` | 1280 px wide | Sign-in page, dark, the same layout |
| `login-gate-mobile-light.png` | 400 px wide | Sign-in page, light, one column: the copy, the intro player, the sign-in button, the consent line |
| `login-gate-mobile-dark.png` | 400 px wide | Sign-in page, dark, one column |
| `onboarding-intro-scene-1-desktop-light.png` | 1280 px wide | Intro scene 1 of 5, Ambition: the caption band at the top, the ambition in the centre of the grid and the life areas around it (stage only) |
| `onboarding-intro-scene-3-desktop-light.png` | 1280 px wide | Intro scene 3 of 5, Plan the week: the caption band, the week grid, the three planned hours fill in (stage only) |
| `onboarding-intro-scene-5-desktop-light.png` | 1280 px wide | Intro scene 5 of 5, Insights and daily follow-up: the year's stacked bars and the share of each life area (stage only) |
| `onboarding-intro-dialog-mobile-{light,dark}-scene-{1..5}.png` | 390 by 700 px | The intro dialog at a phone size, light and dark, every scene: the stage and its caption band whole, the controls inside the dialog |
| `goals-add-habit-desktop-light.png` | 1280 px wide | Goals, a category with the "+ Add habit" form open (name, times and period, minutes each, linked activity) |
| `goals-add-habit-mobile-light.png` | 390 px wide | The same add form at phone width |
| `onboarding-ambition-long-desktop-light.png` | 1280 px wide | Guided step 1 with a 228-character ambition: the field wraps and grows, nothing is cut |
| `goals-vision-long-desktop-light.png` | 1280 px wide, full page | Goals with the long ambition in the vision and the Harada map centre |
| `goals-vision-long-mobile-light.png` | 400 px wide, full page | The same at phone width |
| `onboarding-tour-last-mobile-light.png` | 400 px wide | Step 5 of 5, Daily follow-up, with "Watch the intro again" at phone width |
| `reset-confirm-desktop-light.png` | 1280 px wide | Reset my data confirmation over the sample data: "Reset my data?", the exact copy, Cancel focused and Delete my data |

Legal pages (feat/legal-pages, 27 October 2026, the browser checks run with local storage and with a signed-out Supabase build):

| File | Size | Notes |
| --- | --- | --- |
| `legal-privacy-desktop-light.png` | 1280 px wide | Privacy Policy: title, "Last updated", the short summary, the reading column, the footer |
| `legal-terms-mobile-dark.png` | 400 px wide, dark | Terms of Use at phone width in dark mode, full page |
| `legal-login-consent-desktop-light.png` | 1280 px wide | Sign-in page with the consent line under the sign-in button (the current page, as in `login-gate-desktop-light.png`) |
| `legal-login-consent-mobile-dark.png` | 400 px wide, dark | Sign-in page at phone width in dark mode, with the consent line and the intro player below |

Onboarding and sign-in screens use the names above; the Goals and Planner screens are regenerated on the same date with the generic seed.

Desktop captures are 1280 px wide. The Planner captures and the phone captures are full page. Regenerate with the scratchpad capture script (not in the repo) after a UI change.

## How the spec is used

- Product questions: read the PRD. Section 9 lists every requirement with its status and evidence; section 20 gives the impact on the build and the slice order; section 21 is the backlog; section 23 lists decisions, assumptions and open questions.
- UI work: read `frontend-design.md` sections 1, 8 and 9 first, then PRD section 11 (UX concept and edit pattern). Use the tokens; do not add colours or fonts.
- Data changes: the data model is in `app/types/planner.ts` (summarised in PRD section 14). Bump `PLANNER_STATE_VERSION` in `app/utils/planner.ts` when the saved shape changes. In development a mismatch resets saves to the seed.
- Keep `spec/` out of the Nuxt build. It is plain Markdown and HTML.

---

## 1. Status summary

Built: a local-first Nuxt 4 app with four tabs, Home, Goals, Planner and Visualization. Data lives in `localStorage`; no backend, no login. One stylesheet, blue accent, IBM Plex Sans, light and dark themes.

The journal on Home (FR-HOME-11 to 13) keeps one note a day; the key message, the readings placeholder and the experiment label are gone (UX polish). Reset my data is built (FR-ONB-10); export and import are not built yet (FR-APP-5). Insights (the former Visualization) is the planned-hours chart and category shares; Configuration is removed.

## 2. Changelog

### Year and close (2026-10-28, branch `fix/week-year-and-close`)

- Year (FR-YEAR-7): the Year section exists with one week type as well, collapsed by default. Its body starts with "Every week of <year> uses <name>."; the Weeks row and the painter work as with two or more week types.
- Closing (FR-PLAN-26, FR-TPL-9): the activity editor, the Add activity form, Edit week type and New week type close with Done, Cancel or Escape, and focus returns to the control that opened them. Focus after Done in the activity editor was lost before (it looked for a class that did not exist). Opening Edit week type leaves an open activity editor.
- Screens: `planner-one-type-desktop-light.png` is the collapsed Year section; `planner-one-type-year-open-desktop-light.png` is it open.

### Week types (2026-10-28, branch `feat/week-types`, stacked on `feat/ux-simplify`)

- Presets (FR-TPL-8): New week type has a "Start from" choice: Empty, a copy of a week type (FR-TPL-6, Duplicate), or Standard, Deep work, Light or Vacation. A preset maps its sleep, work and exercise blocks to activities: the one with the same name, a new one, or none. "Keep my habit sessions" keeps the hours of habit-linked activities (on for the working presets, off for Vacation).
- Time off: a week type can be marked "Time off" in its edit panel. Goals then compares against the working week type (`goalsTemplate`), with a quiet "Compared with <week type>" line under the category's hours bar (FR-GOALS-16). Home, Planner and Insights are unchanged.
- Year (FR-YEAR-7): a Weeks row applies a week type, or none, to a range of weeks; shown in the Year section with any number of week types, which is collapsed by default (fix/week-year-and-close).
- Planner (FR-PLAN-25): "Schedule in the week" in the activity detail paints the activity on chosen days at a chosen start and duration, replacing other activities as the grid does, with a replaced-hours message and Undo.
- Storage: `kind` on a week type is optional; the version stays 8.
- Known: on returning saves the "+ New week type" button can take the EditButton's class after hydration (see `.claude/agent.md`, hydration warning).

### UX simplify (2026-10-28, branch `feat/ux-simplify`)

- Vocabulary: "Categories" is "Life areas" in the UI, "vision" is "ambition", the Planner tab is "Week" (route `planner` and the URL stay), "Template" in Planner is "Week type". Code identifiers, routes and stored fields are unchanged.
- Start empty creates no data but assigns the empty week type to every week of the year, so Insights and the Planner have weeks. A new user with no ambition gets the prompt in Goals; typing one saves it.
- Planner: the red delete in the bar is gone (delete stays in the week type edit panel); the year section is closed by default; with one week type it is one line, "Every week of <year> uses <name>.". The add-activity short code is derived from the name until it is typed by hand; it is not required to enable Add.
- Topbar: no tab numerals; Tour is "Replay tour" in the Account menu (both modes). Home header: date and ISO week, no template name.
- Onboarding: Guide me goes straight to step 1; "Watch the short intro" is a link on Welcome and returns to Welcome. The form steps read "Step n of 2"; the tour cards have no counter.

### Polish v4 (2026-10-27, branch `feat/polish-v4`)

- One commit per item, from `origin/main` (fe5082c). The sign-in headline has no product label above it (the topbar shows the name).
- "+ Add habit" is in the category detail in view mode too; it opens the same fields as a habit's edit form (`HabitForm.vue`). Save adds the habit; Cancel and Escape leave nothing behind.
- The 5-year ambition is written in full: step 1 is an auto-growing textarea (Enter is Next), and the Goals vision and the map centre do not clip it.
- The intro dialog fits a phone (360 to 430 px, 390 by 700 px), in light and dark: 16 px padding on phones, the caption band grows instead of clipping its text, the caption fades in without moving up.
- The intro does not autoplay. It opens on scene 1 (static, with a Play button over the stage); the first Play starts it. The sign-in page loops once started. "Start with my ambition" is always in the dialog.

### Sign-in page with the intro (2026-10-27, branch `feat/onboarding-flow-v2`)

- The sign-in page (Supabase mode, signed out) has a two-column hero from 900 px: the product line "Your goals decide your week", one sentence, the Google card and the consent line on the left; the intro player on the right, autoplay and looping, with the same Play or Pause, Back, Next and five segments. One column on phones (copy, card, then the player). The footer shows on the page too. FR-APP-11.
- The intro player is one component (`IntroPlayer.vue`) shared with the first-run dialog. It pauses while the tab is hidden or the stage is out of view, and has no timer on reduced motion.

### Guided path v2 (2026-10-27, branch `feat/onboarding-flow-v2`)

- The guided path follows the owner's order: 1 Your ambition (one required field), 2 Goals and habits (one or two life areas, each with a habit, times a week and hours each time; a second goal is added on request), then the build, then three tour cards: 3 Plan your week (what the planner placed, and that Goals shows each area as on target), 4 Insights, 5 Daily follow-up. Goals has no tour card. Each step shows "Step N of 5". "Start with my ambition" leads from the intro to step 1. FR-ONB-4 to 7.
- The intro scenes are about 9 seconds each (about 45 seconds). Each caption sits inside the stage in a band across its top 28 percent, and the graphics are laid out below it. A visually hidden live caption keeps the text for screen readers. FR-ONB-9.
- Replay from the Tour button starts at step 3 when the user has an ambition and a life area.

### First-run intro (2026-10-27, branch `feat/reset-and-intro`)

- Guide me opens a short intro of five scenes (about 28 seconds) that explains the idea before the form: why, habits, time, compare and see. Play and Pause, Back and Next, a five-part progress bar and Skip intro; Escape goes to the form. On the tour's last card, "Watch the intro again" replays it and returns to the tour. Reduced motion shows the scenes still, with no timer. FR-ONB-9.

### Reset my data (2026-10-27, branch `feat/reset-and-intro`)

- An Account menu in the top bar (in local mode too) with "Reset my data": a confirmation dialog says what is deleted, and Delete replaces the planner with the empty first-run state, saves it at once (Supabase: the user's row; the sign-in stays) and opens Welcome. A failed save is shown and the data is kept. The Privacy Policy now says planner erasure is self-service. FR-ONB-10.

### Google-only sign-in (2026-10-27, branch `feat/remove-email-link`)

- The email magic-link sign-in is removed; Google is the only sign-in method in Supabase mode. The sign-in card shows the title and the Continue with Google button, with the error text when the start fails. Supabase's built-in email sender allows about 2 emails an hour and delivers only to team addresses, so the link was not usable for friends. Storage version unchanged (8). Setup is in `spec/database/README.md`.

### Legal pages (2026-10-27, branch `feat/legal-pages`)

- Terms of Use (`/terms`) and Privacy Policy (`/privacy`, GDPR), both reachable without a session in Supabase mode. The sign-in card gets a consent line with both links; a quiet "Terms · Privacy" footer appears in local mode and for signed-in users (FR-LEGAL-1 to 6, PRD 9.14). The operator details (name, contact, country, Supabase region, governing law) are filled in `app/utils/legal.ts`.

### First-run onboarding (2026-10-27, branch `feat/onboarding`)

- A new user (nothing valid saved) sees Welcome over an empty app: Guide me, Start empty or Explore with sample data. Guide me asks four short questions (5-year ambition, first life area, one habit, times a week and hours each time) and builds one life area, habit, activity and week from them, then a five-step tour walks Goals, Planner, Insights and Home with that data. The tour is skippable; a Tour button in the topbar replays it (FR-ONB-1 to 8, PRD 9.13).
- The saved state gains an optional `onboarding` field; the version stays 8, so existing saves (the owner's included) open as before.

### Storage adapter (2026-10-27, branch `feat/storage-adapter`)

- Persistence is pluggable: `app/utils/storage/` picks `local` (default, localStorage, unchanged) or `supabase` (one `planner_state` row per user, debounced saves, status in the topbar) from `NUXT_PUBLIC_STORAGE`. The snapshot SQL is `spec/database/snapshot.sql`; setup in `spec/database/README.md`. The PRD has FR-APP-9 (storage modes) and FR-APP-10 (Google sign-in in Supabase mode; the email link was removed on 27 October 2026). Browser checks used a fake Supabase server; a real project run is still open.

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
