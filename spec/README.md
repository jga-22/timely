# Timely specification

This folder holds the product and design specification for Timely. The code is the source of truth for what is built. These documents explain intent, describe the current product and list open work.

## Contents

| Path | What it is | How to use it |
| --- | --- | --- |
| `README.md` | This index, plus a short changelog. | Start here. |
| `weekly_planner_prd_and_design_doc.md` | The product requirements and design document (v3): the five-screen product (Home, Goals, Week, Year, Insights). Requirements have IDs and a status (Done, Partial, Not built, Planned (v3), Superseded, Dropped) with evidence for each Done or Partial item. Includes the UX rules, the see-only-once matrix, the old-Insights mapping, the implementation slices, assumptions and open questions. | Read before changing behaviour. Update statuses and the backlog when a feature ships or a decision changes. |
| `frontend-design.md` | The current visual style, derived from the code: tokens, layout, breakpoints, component catalogue (sections 4.9 to 4.17 cover the current screens), accessibility, voice, do and don't, verification, known gaps. | Read before any UI change. Update it with the code in the same change. |
| `build-plan.md` | Slice-by-slice plan to build the v3 structure: rules every slice follows, definition of done, slice scopes, status log and what remains. | Read before starting or reviewing a slice; update the status log as slices ship. |
| `references/grille-harada-meilleure-version.html` | The standalone Harada prototype; origin of the blue palette and the 3x3 layout. Not part of the build. | Visual and content reference for the Goals Harada map. Tokens in `app/assets/css/main.css` remain the source of truth. |
| `screens/` | Reference screenshots of the current build (list below), from the production build at 1280 and 400 px. | Compare before and after a UI change. Keep the names; replace the files when a screen changes on purpose. |
| `database/` | Draft design for storing the data in PostgreSQL or Supabase instead of localStorage (not built): data model, `schema.sql`, ERD (draw.io and Mermaid) and the effort evaluation. | Read before any storage change. The app does not depend on it yet; the storage decision is pending with the owner. |

Screenshots in `screens/` (regenerated on 27 October 2026 from the production build of `feat/polish-v3`, generic sample data, no test paint):

| File | Size | Notes |
| --- | --- | --- |
| `topbar-account-closed-desktop-light.png` | 1280 px wide | Topbar, Supabase mode, signed in: the avatar with the initials "JG" (Google name), no dot |
| `topbar-account-menu-desktop-light.png` | 1280 px wide | The Account menu open: name with "Saved" under it, the Dark mode switch, Replay tour, Reset my data, Sign out last |
| `topbar-account-menu-mobile-dark.png` | 400 px wide | The same menu at 400 px, dark |
| `topbar-account-not-saved-mobile-dark.png` | 400 px wide | Dot on the avatar and "Not saved" with the error text in the menu, dark |
| `topbar-account-local-desktop-dark.png` | 1280 px wide | Local mode: the person glyph, the header "Local mode, saved in this browser", dark |
| `topbar-account-local-mobile-light.png` | 400 px wide | Local mode menu at 400 px, light |
| `home-desktop-light.png` | 1280 px wide | Today, light, sleep hidden, nothing ticked yet: the hour bar (7h to 22h), the progress line "0 of 9 done" at the right end with the small day ring beside it (a green check when everything is done), the activities with their done checks, the Habits list with weekly progress (a weekly habit already met this week is left out), the journal card |
| `home-desktop-dark.png` | 1280 px wide | Today, dark, the same state with the adherence ring |
| `home-mobile-light.png` | 400 px wide | Today, light, full page: the progress line and the ring on one row at the right end |
| `home-mobile-dark.png` | 400 px wide | Today, dark, full page |
| `home-yesterday-desktop-light.png` | 1280 px wide | The previous day (Wednesday 28 October): the day label as title, "Today" button shown, its own ticks |
| `goals-desktop-light.png` | 1280 px wide | Goals, light, the default List view on sample data with nothing selected: the ambition, the category list with each 5-year goal (a target icon under the name) and each 1-year target status (no time comparison since 2026-10-29) |
| `goals-desktop-dark.png` | 1280 px wide | Goals, dark |
| `goals-ambition-prompt-desktop-light.png` | 1280 px wide | Goals, light, Start empty: "Ambition, 5 years" with the prompt "Write your 5-year ambition" and "Save ambition" (disabled while blank) |
| `goals-mobile-light.png` | 400 px wide | Goals, light: the category list at phone width, full page, each row with its 5-year goal (refreshed 2026-10-31) |
| `goals-detail-mobile-light.png` | 400 px wide | Goals, light, the category detail in view mode at phone width: the 5-year goal, the 1-year target, the entries with "Needs 6 h a week" (refreshed 2026-10-29) |
| `goals-detail-desktop-light.png` | 1280 px wide | Goals, light, the category detail in view mode on sample data: the 5-year goal, the 1-year target, "Activities and habits" with each habit's schedule and "Needs 6 h a week" (refreshed 2026-10-29) |
| `planner-grid-apply-edit-desktop-light.png` | 1280 px wide | Week, light: a 2-hour block applied to an empty run; its box is open with the handles, Change…, the word button Edit (label Edit activity, opens the entry's form), Delete, Save (disabled until an edge moves) and Cancel, and the undo line (2026-11-05; replaces `week-apply-edit-desktop-light.png`, retired) |
| `week-apply-menu-mobile-light.png` | 400 px wide | Week, light: the Apply menu at the bottom of the phone, fitted on screen, its list scrolled inside (fix/ux-batch-5) |
| `week-apply-menu-short-desktop-light.png` | 1280 px by 500 | Week, light: the Apply menu on a short desktop, fitted and its list scrolled (fix/ux-batch-5) |
| `goals-detail-edit-desktop-light.png` | 1280 px wide | Goals, light: Spiritual in edit mode |
| `goals-grid-desktop-light.png` | 1280 px wide, full page | Goals, light, Grid view: the Harada map with the ambition in the centre and Physical's detail below it; the list is hidden |
| `goals-start-empty-mobile-dark.png` | 400 px wide, full page | Goals, dark, Start empty: eight life areas as name rows, each with "No 5-year goal yet" under the name and "Add a goal" beside it, no target or bar lines; the List \| Grid toggle is hidden |
| `planner-grid-block-selected-desktop-light.png` | 1280 px wide | Week, light: a block tapped, its edge handles at once, and the action bar beside its day column (Change…, the word button Edit, Delete, Save disabled, Cancel) (2026-11-05) |
| `planner-grid-block-selected-mobile-light.png` | 400 px wide | Week, light: the same block on a phone; the action bar at the bottom of the screen and the handles on the block's edges (2026-11-05) |
| `planner-desktop-light.png` | 1280 px wide | Week, light, full page, sample data: the week type bar, the week grid, "+ Add activity" and "Sleep hours" (10 PM to 7 AM) under it, the Time split; no Activities list (2026-11-04) |
| `planner-new-week-type-vacation-desktop-light.png` | 1280 px wide | New week type panel, light, Start from Vacation: the time-off note and the Sleep mapping row (FR-TPL-8) |
| `planner-new-week-type-vacation-mobile-light.png` | 400 px wide | The same panel at 400 px |
| `topbar-five-tabs-mobile-light.png` | 400 px wide, top 110 px | Topbar, light: the five tabs Home, Goals, Week, Year, Insights on one row (feat/year-tab; `.tabs` overflow 0 at 400 and 360 px) |
| `year-desktop-light.png` | 1280 px wide | Year, light: the painter with its paint tools and the closed "Apply to several weeks" button, the planned hours by month stacked by life area with the available-time key, and the Life areas list ending in "Not planned" (sample data, the seed plus ticks) |
| `year-desktop-dark.png` | 1280 px wide | Year, dark, the same layout |
| `year-apply-several-desktop-light.png` | 1280 px wide | Year, light: "Apply to several weeks" open under the paint tools: "for weeks" 1 to 1, Apply, and the hint "Applies Standard Week to these weeks." (2026-11-04) |
| `year-apply-several-mobile-light.png` | 400 px wide | Year, light, the same options at phone width: the panel took focus, not the field (FR-UX-9) |
| `year-mobile-light.png` | 400 px wide, full page | Year, light, at phone width: the painter wraps, the chart and the Life areas list fit with no overflow |
| `year-mobile-dark.png` | 400 px wide, full page | Year, dark, at phone width |
| `year-vacation-preselected-desktop-light.png` | 1280 px wide | Year, light, opened from the Week tab link after Vacation was added: the new week type is chosen in Paint with and the options are open (`?tab=year&item=<id>`; this copy is named "Vacation 2" because the sample already has a Vacation) |
| `year-start-empty-desktop-light.png` | 1280 px wide | Year, light, Start empty: "0 of 53 weeks assigned", no planned hours, and "Plan the week in Week and the hours show here." with Open Week |
| `planner-vacation-added-desktop-light.png` | 1280 px wide | Week, light, after a new Vacation week type: the line "Vacation added. Choose its weeks in Year" with its link (feat/year-tab; the Week tab has no Year section) |
| `planner-desktop-dark.png` | 1280 px wide | Week, dark, full page, the same layout |
| `planner-activity-edit-desktop-light.png` | 1280 px wide | Week, light, opened from `?item=training&edit=1`: the one form under the buttons ("Edit Exercise", Save, Cancel, Delete). Escape and Cancel close it and return focus to the button that opened it (2026-11-04: the Week tab has no entry list; entries are edited from Goals) |
| `planner-add-activity-desktop-light.png` | 1280 px wide | Week, light: "+ Add activity" open, the form "New activity or habit" under the buttons with its name focused (2026-11-04) |
| `planner-sleep-hours-desktop-light.png` | 1280 px wide | Week, light: "Sleep hours" open, the Sleep form ("Edit Sleep") with the editor for every night (2026-11-04) |
| `planner-template-edit-desktop-light.png` | 1280 px wide | Week, light: Edit week type with Done in the panel head (Escape and Done close it, FR-TPL-9) |
| `planner-mobile-light.png` | 400 px wide | Week, light, full page at 400 px: the grid scrolls sideways inside its box, the two buttons wrap under it, no page overflow |
| `planner-time-split-desktop-light.png` | 1280 px wide | Week, light: the Time split under the entry buttons for Standard Week: the ring of the typical week's available time and the life areas list with hours and percent, Not planned last |
| `planner-time-split-desktop-dark.png` | 1280 px wide | Week, dark: the Time split |
| `planner-time-split-mobile-light.png` | 400 px wide | Week, light, at 400 px: the Time split |
| `planner-time-split-selected-desktop-light.png` | 1280 px wide | Week, light: the Time split with Professional selected: the others dimmed, the centre names it (40%, 42 h), its row marked |
| `insights-adherence-desktop-light.png` | 1280 px wide | Insights, light, Adherence view (month, one year): the headline "Done 5% of planned", the week bars with dashed future weeks, By life area, Habits, the journal nudge. Sample data: the seed plus ticks over the last three weeks (from 9 to 29 October 2026); the chart starts at the first tick and ends at the current week, so earlier weeks are not drawn |
| `insights-adherence-desktop-dark.png` | 1280 px wide | Insights, dark, Adherence view (month) |
| `insights-adherence-week-desktop-light.png` | 1280 px wide | Insights, light, Adherence view with Week: one bar per weekday, Monday to Sunday |
| `insights-adherence-mobile-light.png` | 400 px wide | Insights, light, Adherence view at phone width, full page |
| `insights-adherence-mobile-dark.png` | 400 px wide | Insights, dark, Adherence view at phone width, full page |
| `insights-adherence-empty-desktop-light.png` | 1280 px wide | Insights, light, Adherence view with no tick in the range: the empty state with "Open Home" |

Onboarding screens (feat/polish-v3, 27 October 2026, local storage, a fresh user; step 2 offers the eight default life areas):

| File | Size | Notes |
| --- | --- | --- |
| `onboarding-welcome-desktop-light.png` | 1280 px wide | Welcome dialog over the empty Home: the idea, Guide me, Start empty, Explore with sample data |
| `onboarding-ambition-desktop-light.png` | 1280 px wide | Step 1 of 5, Your 5-year ambition: the framing text and the one field, filled in |
| `onboarding-goals-desktop-light.png` | 1280 px wide | Step 2 of 5, Goals and habits with one goal: the Physical chip, the habit Run, "Add a second goal" |
| `onboarding-goals-two-desktop-light.png` | 1280 px wide | Step 2 of 5 with two goals: the chip the first goal uses is disabled in the second; Remove on goal 2 |
| `onboarding-tour-plan-desktop-light.png` | 1280 px wide | Card 3 Plan your week on Week, after Replay tour: "Timely placed 68 h for Physical and 0 h for Spiritual" and "Goals keeps the why" (refreshed 2026-10-29) |
| `onboarding-tour-year-desktop-light.png` | 1280 px wide | Card 2 "Your year" after Replay tour and Next, over the Year tab: the card names the planned hours stacked by life area and the week type each week uses |
| `onboarding-tour-plan-mobile-light.png` | 400 px wide | Step 3 of 5 on Planner at 400 px: the card at the bottom |
| `login-gate-desktop-light.png` | 1280 px wide | Sign-in page in Supabase mode, signed out, light: one centred column: the headline and its supporting line, the intro player (scene 1 of 5, paused behind a Play button, frameless), the Google sign-in button and the consent line |
| `login-gate-desktop-dark.png` | 1280 px wide | Sign-in page, dark, the same layout |
| `login-gate-mobile-light.png` | 400 px wide | Sign-in page, light, one column: the copy, the intro player, the sign-in button, the consent line |
| `login-gate-mobile-dark.png` | 400 px wide | Sign-in page, dark, one column |
| `onboarding-intro-scene-1-desktop-light.png` | 1280 px wide | Intro scene 1 of 5, Ambition: the caption band at the top, the ambition in the centre of the grid and the life areas around it (stage only) |
| `onboarding-intro-scene-3-desktop-light.png` | 1280 px wide | Intro scene 3 of 5, Plan the week: the caption band, the week grid, the three planned hours fill in (stage only) |
| `onboarding-intro-scene-5-desktop-light.png` | 1280 px wide | Intro scene 5 of 5, Insights and daily follow-up: the year's stacked bars and the share of each life area (stage only) |
| `onboarding-intro-dialog-mobile-{light,dark}-scene-{1..5}.png` | 390 by 700 px | The intro dialog at a phone size, light and dark, every scene: the stage and its caption band whole, the controls inside the dialog |
| `goals-add-habit-desktop-light.png` | 1280 px wide | Goals, Cognitive with the "+ Add" form open (the unified entry form, FR-ITEM-3): name Run, duration 30 min, the Life area preselected, Days, Start, Week types, More options closed (refreshed 2026-10-29; the earlier "+ Add habit" form and its linked-activity select are gone) |
| `goals-add-habit-mobile-light.png` | 390 px wide | The same unified add form at phone width (refreshed 2026-10-29) |
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

Sleep screens (feat/sleep-default, 2026-10-28, generic seed, light unless named): `sleep-week-1280-hidden.png` (the Week grid with sleep hidden: 15 rows and the two bands), `sleep-week-1280-shown.png` (all 24 rows), `sleep-week-1280-split.png` (a weekend nap in the split editor), `sleep-week-400-hidden.png` (phone), `sleep-editor-1280.png` (the Sleep form), `sleep-insights-1280-hidden.png` and `sleep-insights-1280-shown.png`.

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

### Week grid edit box (2026-11-05, branch `feat/grid-edit-box`, stacked on `feat/ux-round-3`, not pushed)

- The edge handles come with the selection: a run that holds an activity shows them at once (a click or tap on a block, a keyboard run, an Apply). There is no Edit range step (FR-PLAN-23). The action bar holds Change…, Edit (the entry's form, FR-ITEM-3), Delete, Save (enabled once an edge moved) and Cancel; it opens beside the run's day column, never over the run.
- Touch handles are 44px and reach out of the run, so a scroll that starts in a one-hour block still scrolls. The box and the entry form close each other.
- Checks: `npm test` 536 pass, typecheck 0 errors, production build clean. Headless Edge: 54 checks at 1280 (mouse) and 53 at 400 (touch), light and dark, all passing. The grid capture compared with the untouched build: differences only in steps that show the box or the handles; the saved state identical. Storage version unchanged (8).
- Screens: `planner-grid-block-selected-desktop-light.png` and `planner-grid-block-selected-mobile-light.png` are new, and `planner-grid-apply-edit-desktop-light.png` replaces `week-apply-edit-desktop-light.png`, which is retired (it showed Edit range).

### Time split and Home ring (2026-11-02, branch `feat/time-split-home-ring`, stacked on the Year tab, not pushed)

- The Week tab ends with a Time split (FR-PLAN-27): the typical week of the active week type as a ring of its available time and the life areas list, sleep left out unless Show sleep is on. The range donut moved here from Insights.
- Home shows the progress of the day shown as one ring beside "x of y done", turning into a green check with "All done for today" when all is done (FR-HOME-19). Week and overall adherence are no longer on Home (2026-11-03); the figures stay in Insights. The ring is `app/components/AdherenceRing.vue`, shared with Insights.
- Checks: `npm test` 528 pass, typecheck 0 errors, production build clean. Headless Edge at 1280 and 400 px, light and dark: 82 Home checks with ticks and 64 with none (each figure equal to an independent calculation from the saved state), no console errors, no overflow. The Adherence view DOM matches the build before the ring extraction, apart from the ring's inline width.
- Screens: `home-*` refreshed on the adherence seed, `planner-time-split-*` new, and the Week screens `planner-desktop-*` and `planner-mobile-light.png` re-shot. Storage version unchanged (8).

### Year tab (2026-11-01, branch `feat/year-tab`, from `main`, not pushed)

- A fifth tab, Year (route id `year`), holds the year painter and the Weeks row (FR-YEAR-7, FR-YEAR-8), the planned hours with their range controls (Month or Week, More options, the unit Hours, Days or Weeks) and the Life areas list. The Week tab loses its Year section: after a new week type it says "X added. Choose its weeks in Year", with a link to the Year tab (`item` is the week type id).
- Insights is the Adherence view only (FR-INS-P7), with its own range controls and no unit. The range donut moved to the Week tab's Time split (`planner/TimeSplitDonut.vue`, FR-PLAN-27).
- Tour card 2 is "Your year" and links to Year; intro scene 5 is "Your year and daily follow-up". Storage version unchanged (8).
- Screens: `year-*`, `topbar-five-tabs-mobile-light.png`, `planner-vacation-added-desktop-light.png`, `onboarding-tour-year-desktop-light.png`. The Insights bars, donut and tour-insights screens and the Schedule in the week screens are retired.

### Goals list and Planner defaults (2026-10-30, branch `feat/goals-week-defaults`, from `main`, not pushed)

- Goals list (FR-GOALS-25): every life area is listed; the fold ("N more life areas") is removed. Each row shows the 1-year target status ("Target set", "No target yet", "Target to define") and its entries as the detail counts them ("3 habits · 2 activities", or "No habits or activities yet"); "Add a goal" stays on an area with nothing in it.
- Planner (FR-PLAN-13, FR-YEAR-7): the Year section is open by default. The Week grid and "Activities and habits" are disclosures too, open by default, state in memory only; the Show sleep button sits beside the Week summary.
- Screens: `goals-desktop-light.png`, `goals-desktop-dark.png`, `goals-mobile-light.png`, `goals-start-empty-mobile-dark.png`, `planner-desktop-light.png`, `planner-desktop-dark.png`, `planner-mobile-light.png`, `planner-one-type-desktop-light.png`. `goals-list-collapsed-desktop-light.png` and `planner-one-type-year-open-desktop-light.png` are removed.
- Storage: no change; version 8.

### Insights adherence (2026-10-29, branch `feat/insights-adherence`, stacked on `feat/home-checks`, not pushed)

A third choice in the Insights chart header, "Adherence", beside Bars and Donut (FR-INS-P6). It compares what was planned with what was ticked on Home over the range shown: a headline ("Done N% of planned", counted in hours of planned blocks, or in habit target ticks when no block is planned), bars by weekday (Week), by ISO week (Month, one year) or by month (several years, Quarter, Year), trimmed to the periods from the first tick up to the current one, a "By life area" list, the habits kept up or slipping, and a journal nudge with a prompt. The pure rules are in `app/utils/adherence.ts`: counting starts at the first tick and runs up to today, sleep never counts, a habit with a block that day is judged through the block, and habit ticks are capped at their target. Nothing is stored; storage version unchanged (8). Checks: build clean, typecheck 0 errors, 65 tsx checks of the rules, 49 headless Edge checks at 1280 and 400 px, light and dark, with real mouse clicks, no console errors, no horizontal overflow. Screenshots: `screens/insights-adherence-*`.
### Home done ticks (2026-10-29, branch `feat/home-checks`, from `main`, not pushed)

Home ticks what really happened (FR-HOME-14 to 18): one checkbox per scheduled block and per habit, stored as the optional `done` map of the state (no durations, no timestamps, no storage version change). Habits that are not already a block of the day are listed under "Habits"; week and month habits show "2 of 3 this week". A progress line counts the day ("3 of 5 done", then "All done for today"). A previous and next day switch (Today; never a future day; 60 days back) lets yesterday be caught up. The Edit links on Home rows are removed (FR-HOME-8 superseded). Screens: `home-desktop-light.png`, `home-desktop-dark.png`, `home-mobile-light.png`, `home-mobile-dark.png`, `home-yesterday-desktop-light.png` (the old `sleep-home-400-dark.png` is removed: it showed the Edit links).

### Also counts toward removed (2026-10-29, branch `refactor/remove-plan-vs-need`, not pushed)

- The secondary categories (`alsoCategoryIds`, "Also counts toward") fed only the planned-against-needed comparison, which is gone, so they are removed: the Planner and Goals controls ("Also counts toward", "also counts here", the secondary Unlink), the store actions and the helpers (`cleanAlsoCategoryIds`, `AlsoCategories.vue`). The field is no longer in the type; a save that still carries it loads, and the value is ignored. FR-PLAN-P1 and FR-GOALS-P5 are removed in the PRD. Storage version unchanged (8).

### Planned against needed removed (2026-10-29, branch `refactor/remove-plan-vs-need`, not pushed)

- The owner removed the planned-against-needed comparison: it is circular, since both sides come from the same habits. Removed from Insights (the Needed and Planned bars and their status lines, `PlanComparison.vue`), from Goals (the yearly badge `PlanBadge.vue`, "Time against need", "See in Insights") and from the calculations (`categoryPlanVsNeed`, `yearPlanVsNeed`, `categoryAlignments`, `alignmentStatus`, `comparedActivityIds`, and the Goals-side hour sums). FR-GOALS-16, FR-GOALS-P1, FR-GOALS-P2 (both rows) and FR-INS-P4 are removed in the PRD.
- Kept: the Insights donut and available time (FR-INS-P5), each habit's plain need text, `goalsTemplate` (entries and presets read it), time off (`kind`). "Also counts toward" was removed the same day (see above).
- Copy: the tour's Plan card no longer mentions the comparison ("Goals keeps the why"); intro scene 4 is now "Goals" (a goal and a habit linked to an activity) instead of "Compare".
- A time budget per life area is the later idea, not built. Storage version unchanged (8).
- Screenshots: `insights-plan-vs-need-*` deleted; `insights-bars-*` added; `goals-*`, `goals-detail-*`, `insights-*` and the Plan card and intro scene 4 re-shot.

### Planned against needed (2026-10-29, branch `feat/insights-plan-vs-need`, not pushed)

- Insights donut selection (FR-INS-P5 follow-up, 2026-10-29): a click or tap on a donut slice (or the Not planned ring) selects it: the others dim, the selected one is drawn thicker, its list row is marked, and the centre shows its name, percent and hours. Clear with a second click, a click on the centre or Escape. Keyboard: Tab, Enter or Space, arrow keys. Session state. Dimmed slices fall below 3:1 (flagged for the owner).
- Insights (FR-INS-P5, 2026-10-29, owner request): the Life areas list has no share bar; its percentages are of the available time, with a "Not planned" last row, so the list adds to 100. A "Bars | Donut" choice in the chart header shows the same range as a ring (planned slices and a Not planned ring, centre: percent planned and hours). Bars stay the default; the choice is session state.
- Insights (FR-INS-P4): the Life areas list carries the comparison. Under the title, one caption (with the note on counting); each life area with a need gets the Needed and Planned bars (inline captions, on one scale) and one status line ("Needs 32 h more", "43 h over", "74 h planned of 80 h needed"), over the range shown, in the chosen unit. No separate section; nothing extra for life areas with no need. The two-bar component is `insights/PlanComparison.vue` (moved from `harada/NeededPlannedBar.vue`).
- Open point: a life area's status counts activities linked from its habits even when they belong to another life area, while its share counts only its own activities, so a row can read "0 h" beside a status with planned hours.
- Goals (FR-GOALS-P2): the weekly bars are gone. Each list row and the category detail show a yearly badge ("On track this year", "Short by 32 h this year", "Over by 43 h this year"; "in 2027" for another year), and the detail links "See in Insights". The habit lines show the need as a plain figure ("Needs 6 h a week").
- The comparison reads each week's governing week type (as Insights), so the Goals time-off read-around (FR-TPL-8) no longer applies. Owner to confirm.
- Checks: typecheck 0 errors; build clean; tsx checks of the calculations (per-habit need over 7, 52 and 53 weeks; the year map and the multi-year totals); headless Edge on the production build at 1280 and 400 px, light and dark: 42 checks, no console errors, no overflow.
- Storage: no change; version 8.

### Sleep as a default (2026-10-28, branch `feat/sleep-default`, not pushed)

Sleep is the activity whose code is SLP (FR-SLEEP-1 to 8). It is built in (not deletable, code locked), set to 10 PM to 7 AM every night in every new planner, new week type and preset, and set up in existing saves with "Set up sleep". The Week tab's Sleep row opens the editor per week type (every night, or weekdays and weekend). A "Show sleep" button (Home, Week, Insights; default off, remembered in this browser) hides it: Home leaves it out of the timeline and the day rows, the Week grid collapses the hour rows that are sleep on all seven days, and Insights and Goals leave it out of the planned hours and the available time. No data model change: storage version unchanged (8), no new field, no migration. Screens: `sleep-week-1280-hidden.png`, `sleep-week-1280-shown.png`, `sleep-week-1280-split.png`, `sleep-week-400-hidden.png`, `sleep-editor-1280.png`, `sleep-insights-1280-hidden.png`, `sleep-insights-1280-shown.png`.

### Unified item form (2026-10-28, branch `feat/unified-item-form`, not pushed)

One form and one list for activities and habits (FR-ITEM-1 to 5). The Week tab shows "Activities and habits": timed chips with their hours, a Habits list for entries with no time, and "+ Add". The Goals life area shows one list with the schedule, the week types and the time planned against the need; its rows and "+ Add" open the same form. `ActivityForm.vue` holds the fields (name, life area, duration, days or times, start and week types, More options) and saves through `saveEntry`; a repaint reports its result with Undo for 8 s. The separate schedule panel, the Activities add form, `HabitForm.vue` and `HabitList.vue` are removed. Storage version unchanged (8). Checks: build clean, typecheck 0 errors, 13 tsx checks of the store and rules, headless Edge at 1280 and 400 px, light and dark, 22 browser checks, no overflow, no console errors. New screenshots: `spec/screens/unified-week-add-1280.png`, `unified-week-add-400.png` (retired 2026-11-04), `unified-goals-detail-1280.png`, `unified-goals-form-dark-1280.png`, `unified-no-time-confirm-1280.png`.

### Account avatar (2026-10-28, branch `fix/ux-batch-5`, not pushed)

- The topbar shows one round avatar button instead of the "Account" text button, the save status and the theme toggle. Initials come from the Google name or the email (`app/utils/account.ts`); local mode shows a person glyph.
- A dot on the avatar shows while saving (quiet, still with reduced motion) and when not saved (danger). The menu says the same in text ("Saving...", "Not saved", "Saved", "Loading...").
- The Account menu, left aligned with an icon on each row: the name (no email; "Local mode, saved in this browser" in local mode) with the save status under it, a Dark mode switch (`role="switch"`, the same `timely.dark` key), Replay tour, Reset my data, and Sign out last (Supabase mode).
- Focus: a desktop focuses the first control on open; a phone focuses the panel (FR-UX-9). Escape closes and returns focus to the avatar; a click outside closes.
- Checks: typecheck 0 errors; build clean; the initials function (17 cases, `npx tsx`); headless Edge on the production build, 104 browser checks in local mode and against the fake Supabase server (names, initials, the dot states, the error and recovery, the theme persisting on reload, Escape, outside click, sign out) at 1280 and 400 px, light and dark. Not run against the real Supabase project, and not on a real phone.
- Storage version unchanged (8). Screenshots `topbar-account-*.png`.

### UX batch 5 (2026-10-28, branch `fix/ux-batch-5`, from `main`, not pushed)

- Goals (FR-GOALS-27): the category detail reads 5-year goal, 1-year target, the hours comparison, the habits, then More activities. Edit mode is unchanged.
- Week grid (FR-PLAN-23): Apply on a run that changes hours opens Edit range on the new block at once, so its start and end change without selecting it again. Save extends the Apply's one undo step; Cancel and Escape keep the block as applied. The handles take touch without scrolling the page and move one hour with Up and Down.
- Apply menu: it fits the screen (it moves up when it would run past the bottom, and its height is capped at the viewport); its list scrolls inside it, and the overlay takes no touch scroll. It was partly off screen on phones and short desktops before.
- Schedule in the week (FR-PLAN-25): a collapsible under the activity detail, closed by default, with a Close button and Escape. The result line and its Undo stay after it closes.
- Focus on phones (FR-UX-9, `app/utils/focus.ts`): an edit or add panel no longer focuses a text field on a phone or touch screen, so the keyboard stays down; the panel takes focus instead. Desktop unchanged. Covers the life area, habit, activity, add activity, new and renamed week type, week range, journal note and the first-run dialogs.
- Checks: typecheck 0 errors; build clean; headless Edge on the production build, 74 browser checks (`ux5-check.cjs`, scratchpad, not committed) at 1280 by 800, 1280 by 500 and 400 by 800 with touch emulation, all passing. Storage version unchanged (8). Not run on a real phone.

### Year and close (2026-10-28, branch `fix/week-year-and-close`)

- Year (FR-YEAR-7): the Year section exists with one week type as well, collapsed by default. Its body starts with "Every week of <year> uses <name>."; the Weeks row and the painter work as with two or more week types.
- Closing (FR-PLAN-26, FR-TPL-9): the activity editor, the Add activity form, Edit week type and New week type close with Done, Cancel or Escape, and focus returns to the control that opened them. Focus after Done in the activity editor was lost before (it looked for a class that did not exist). Opening Edit week type leaves an open activity editor.
- Screens: `planner-one-type-desktop-light.png` is the collapsed Year section; `planner-one-type-year-open-desktop-light.png` is it open.

### Goals and Insights simplify (2026-10-28, branch `feat/goals-insights-simplify`, from `main`, not pushed)

Owner UX review: fewer concepts on screen, less to fill in, the power opt-in. PRD 9.15 and `frontend-design.md` section 13.

- Habit creates its activity (FR-GOALS-24): the habit form's first activity option, "Add '<name>' to my week", is the default for a new habit once minutes each is set. It makes an activity in the habit's life area with the life area colour and a free short code, or links the one of that name there. Cancel creates nothing.
- Goals list (FR-GOALS-25, changed 2026-10-30: all life areas are listed, see above): life areas with content are listed in full; empty ones fold into one "N more life areas · add a goal" row, and a life area with nothing in it shows its name and "Add a goal".
- Goals Grid (FR-GOALS-26): List | Grid toggle from 1100px. List is the default; Grid is the Harada map with the detail under it. The two "Life areas" headings are gone.
- Category detail (FR-GOALS-27): 1-year target, habits, the hours comparison, the 5-year goal, then the activities no habit links.
- Insights (FR-INS-P1 to P3): Month and Week on the first row; Quarter, Year, the range and the unit under "More options"; the headline sentence was removed (2026-10-28); unassigned weeks count the week type that governs them, as Home and Planner do (PRD 23.1 superseded).
- Storage: no change; version 8.

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

### Sleep follow-ups (2026-10-28, branch `fix/sleep-followups`, not pushed)

- Home: with sleep hidden, the bar leaves out the sleep at the start and end of the day and labels its ends (FR-SLEEP-8).
- Show sleep and Hide sleep are outline buttons, so Hide is easy to find in Week, Home and Insights (FR-SLEEP-4).
- Insights: the headline sentence and the hidden-sleep note are removed; the chart header holds the available-time key ("Available per month: up to 525 h") and the Show sleep toggle (FR-INS-4, FR-INS-P1 removed).
- Goals: "Needed" and "Planned" captions on the comparison bars (FR-GOALS-P1).
- No data change; the storage version stays 8.

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
