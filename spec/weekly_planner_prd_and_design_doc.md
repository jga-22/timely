# Timely: product requirements and design document

Status: **v3 draft (2026-10-25).** This document describes the product as built on branch `feat/harada-goals` and the **v3 screen structure** the owner asked for: Home, Goals, Planner, Visualization. Requirements carry a status so that what exists and what is planned stay apart. The code is the source of truth for what is built; where this document and the code disagree about built behaviour, fix the document. Visual style lives in `spec/frontend-design.md` and is not repeated here.

Statuses used in this document:

| Status | Meaning |
| --- | --- |
| Done | Built, reachable in the UI, and still valid in v3 (possibly re-housed on another screen; the note says where). |
| Partial | Built in part. |
| Not built | Wanted, not built, not scheduled for v3. |
| Planned (v3) | New or changed requirement of the v3 structure. Has acceptance criteria (AC). |
| Superseded | Replaced by another requirement (named in the note). |
| Dropped | Decided against. |

Decisions are marked **(decided)** when the owner made them. Assumptions and open questions are collected in section 23.

---

## 1. Product overview

Timely is a local-first personal web app that connects **why** you spend your time with **how** you spend it.

- **The why (Goals).** One five-year ambition and up to eight life areas (categories). Each category holds a five-year goal, a measurable one-year target and measurable habits.
- **The time (Planner).** Activities belong to categories. A weekly template of 168 hour slots says when each activity happens. Several templates (normal week, deep-work week, vacation) are applied to the weeks of the year.
- **The day (Home).** What today, this week or this month looks like in projected hours, per activity and per category.
- **The picture (Insights).** Read-only charts: the year week by week, projections over years, goals against planned time.

Value proposition: *see at a glance whether the week you actually plan gives your goals the time they need, and what that week adds up to over years.*

Constraints that shape everything:

- no backend, no login, no account
- all data in the browser (`localStorage`)
- one user, one device
- English UI; user content may be in any language
- development mode: no production users, no data migrations

---

## 2. Product vision

Help one person live intentionally by making the distance between their goals and their calendar visible and measurable.

Timely is not a task manager, not a calendar replacement and not a habit tracker with check-ins. It is a **goal-to-time alignment and planning tool**.

---

## 3. Problem statement

People who set life goals (for example with a Harada or similar method) rarely check whether their weekly structure leaves room for them. Goals live in one document, the calendar in another, and nothing says "your relational habits ask for 4.5 hours a week and your plan gives them 2".

Calendars and task managers focus on day-to-day execution. Goal frameworks focus on intent. Neither answers:

- What does my plan give each life area today, this week, this month?
- Do my habits fit in the week I designed?
- Which goals have no time at all?
- What does this week add up to over 1, 3, 5 or 10 years?

---

## 4. Goals and non-goals

### Goals

- Open on an overview of the day: projected activities and time per category (Home).
- Capture one ambition, up to eight categories with goals and targets, and measurable habits; manage categories (Goals).
- Manage activities and say when they happen in the week; keep several templates and apply them to the year (Planner).
- Show year totals, projections and goals against planned time, read-only (Insights).
- Work without a server-side data store, with no setup and no account.

### Non-goals

- Calendar sync, `.ics` export, reminders or notifications.
- Accounts, multi-user, sharing or cloud sync.
- Completion tracking ("did I do my habit today"). Habits are planned frequencies only; Home shows planned time, not actual time. Habit check-ins are reopened only as an idea after the Home journal experiment (FR-HOME-14).
- Native mobile app. The web app is usable on a 400 px phone.
- AI coaching as a dependency.

---

## 5. Target user

**Primary (and today the only) user:** the owner, a reflective professional who keeps a Harada-style goal grid and wants their weekly plan to serve it. The seed dataset is built around this profile.

Secondary users (if the app is ever shared): people balancing work, family, health and learning who want a visual, private planning tool.

---

## 6. User needs

Users need to:

- see what today holds, and how this week and month split across life areas, without editing anything
- write down an ambition and life-area goals without a heavy form
- express habits in measurable terms (3 times a week, 60 minutes each)
- say when an activity happens in the week quickly, hour by hour
- keep several templates and assign them to real weeks (vacation, deep work)
- answer: "Do my habits fit in my week?", "How many hours of deep work over 5 years?", "Which weeks use the vacation template?"

---

## 7. Product principles

1. **Local first.** Data stays in the browser. Nothing leaves the device.
2. **See only once.** Each fact has one primary place where it is shown in full and edited. Elsewhere it appears only as a derived summary or a link to that place (matrix in 11.3).
3. **See, then edit.** Every item is shown in a read-only view first. An Edit button switches that item to edit mode; Done returns to view (pattern in 11.2).
4. **See only what you need.** Progressive disclosure: overview, then list, then select, then detail view, then edit mode. Lists show few facts per row; details and forms appear only for the selected item.
5. **Like with like.** Goals vs. planned compares habit time only with the activities those habits link to; an activity is never counted in two categories.
6. **Immediate.** Every edit persists at once and every view recomputes in memory.
7. **Calm and honest.** Missing data is shown as quiet flags ("No target yet", "No time planned"), not alarms. Projections say which template they use.
8. **One visual style.** Follow `spec/frontend-design.md`. Do not duplicate style rules here.

The v2 principle "Goals before time; the app opens on Goals" is replaced: the app opens on Home **(decided)**. Goals stay first in meaning and second in the navigation.

---

## 8. User stories

| # | Story | Status |
| --- | --- | --- |
| US-1 | As a user, I write my five-year ambition and see it at the top of Goals. | Done (grid centre); new place Planned (v3) |
| US-2 | As a user, I give each category a five-year goal and a measurable one-year target, and flag targets still to be defined. | Done; re-housed in v3 |
| US-3 | As a user, I list habits per category with a frequency (per day, week or month) and minutes per occurrence. | Done; re-housed in v3 |
| US-4 | As a user, I link a habit to an activity so its time can be measured against my week. | Done |
| US-5 | As a user, I see per category how much habit time my week schedules against what the habits ask for. | Done; moves to Goals detail and Insights |
| US-6 | As a user, I select hours in the week and assign them to an activity. | Done (activity grid, slice 2b; painting in edit mode, slice 5) |
| US-7 | As a user, I change or remove an activity's hours. | Done (activity grid, slice 2b) |
| US-8 | As a user, I apply one activity to the same hours across several days at once. | Planned (v3): rectangle paint in the activity grid |
| US-9 | As a user, I keep several templates and switch, rename, recolour, create and delete them. | Done (no duplicate) |
| US-10 | As a user, I assign templates to the weeks of the year by painting a year grid. | Done (2026 only, mouse only); year handling Planned (v3) |
| US-11 | As a user, I mark a week as vacation or off, or override slots for one week. | Dropped (Q5) |
| US-12 | As a user, I see hours and percentages per category. | Done (Insights); moves to Home and Insights |
| US-13 | As a user, I see the year week by week (or month by month), stacked by category. | Done; moves to Insights |
| US-14 | As a user, I see a projection over 1, 3, 5 or 10 years. | Partial; full list Planned (v3) |
| US-15 | As a user, I see my week broken down by weekday and category. | Not built (Later) |
| US-16 | As a user, I compare two templates side by side. | Not built (Later) |
| US-17 | As a user, I manage categories (add, rename, recolour, reorder, remove with move). | Done (Configuration); moves to Goals |
| US-18 | As a user, I export, import or reset my data. | Not built (Next) |
| US-19 | As a user, I open the app on today's projected activities with their category and duration. | Planned (v3) |
| US-20 | As a user, I switch Home between day, week and month and see time per category. | Planned (v3) |
| US-21 | As a user, I edit an activity's name, code, category and colour without losing its hours or habit links. | Planned (v3) |
| US-22 | As a user, from any summary I reach the place where an item is edited in one click. | Planned (v3) |

---

## 9. Functional requirements

Evidence names the file or function for built items. Every Planned (v3) item has acceptance criteria (AC).

### 9.1 Cross-screen UX (new)

| ID | Requirement | Status | AC |
| --- | --- | --- | --- |
| FR-UX-1 | **See only once.** Each fact has one primary place (matrix in 11.3). Other screens show only derived summaries or links, never an editing control for it. | Done | *Evidence (slice 5):* Home has the period selector and links only; Goals edits categories, habits and the ambition; Planner edits activities and templates; Insights has view settings only (year, view, category focus, horizon). The slice 5 walk of all four tabs found no second editor. |
| FR-UX-2 | **View and edit modes.** Ambition, category, habit, activity and template are read-only by default. One Edit button per item switches it to edit mode; Done returns to view mode. | Partial | *Evidence (slice 5):* Activities, categories and the ambition have an Edit button named "Edit {name}" (the ambition: "Edit ambition"); Done returns focus to Edit; at most one item is in edit mode per screen (browser run). **Partial because** templates have no Edit button (renamed by double-click, recoloured from the chip dot, deleted inline) and habit rows are edited inside the category's edit mode (FR-GOALS-18). |
| FR-UX-3 | **Progressive disclosure.** Each screen follows overview, list, select, detail view, edit mode. List rows show at most name, colour and two short facts. | Partial | *Evidence (slice 5):* Lists show no form fields, selecting a row shows its detail, and one detail is open at a time. **Partial because** Planner activity rows show code, category and hours (three facts; the rule allows name, colour and two short facts). |
| FR-UX-4 | **Edit from elsewhere.** An Edit button on a screen that does not own the item navigates to the owning screen with the item selected and in edit mode. | Done | *Evidence (slice 5):* Home's Edit on Reading opens Planner with Reading in edit mode and painting enabled; Back returns to Home with the same period (Week, kept in Nuxt state across tabs). Browser run: X1 to X3. |
| FR-UX-5 | **Navigation state in the URL.** Active tab, selected item and edit mode are route query parameters (for example `?tab=planner&activity=deep-work&edit=1`). | Done | Reload keeps tab and selection; Back and Forward move between them; an unknown id falls back to no selection without error. *Evidence (slice 1):* `useNav` (`app/composables/useNav.ts`) keeps `tab`, `item` and `edit` in the route query; reload, Back and Forward work (browser run). Planner reads `item` and `edit` (slice 2a: a selection is a history entry, Done replaces it; checked with Back, Forward, reload and unknown ids); Goals does not yet (slice 3). *Evidence (slice 3):* Goals also reads and writes `item` and `edit`; back, forward, reload and unknown ids checked in the browser. |
| FR-UX-6 | **Immediate edits.** Fields in edit mode apply on change (no Save button). An empty required field (name, code) reverts on blur with an inline message. | Done | *Evidence (slice 5):* Planner name and code apply on input. An empty name shows "Name can't be empty" and reverts on blur; Goals category names are refused inline. Browser run: E3 and E4. |
| FR-UX-7 | **Inline confirmation** for destructive actions (delete activity, remove category, delete template, remove habit), stating the impact. No `confirm()`. | Done | *Evidence (slice 5):* No `confirm()` in the code. Delete activity states the impact ("Clears N h in N templates and unlinks N habits") with Delete and Cancel; delete template, remove category and remove habit confirm inline with a second button. Nothing changes before that button. |
| FR-UX-9 | **Focus when a panel opens.** Opening an edit or add panel (activity, habit, life area, journal note, week type, week range, the first-run dialogs) focuses its first text field on a desktop with a fine pointer and a viewport wider than 768 px. On a phone or a touch screen (`(pointer: coarse)` or 768 px and below) no text field takes focus, so the on-screen keyboard does not open and the page does not shift: the panel or dialog takes focus instead (tabindex -1, scrolled into view without the keyboard) and Escape still reaches it. Opening buttons and validation errors keep their own focus. One helper: `app/utils/focus.ts` (`shouldAutoFocusInputs`, `focusEditField`, `focusEditById`). | Done | *Evidence (fix/ux-batch-5, 2026-10-28):* headless Edge, production build. At 1280 by 800, a mouse: the category name, the habit draft, the activity name, "Add activity", "New week type" and the journal note take focus. With touch emulation at 400 by 800: none of them takes a text field; the focus goes to the panel (`#cat-detail`, `#act-edit-panel`, the add panel, the onboarding dialog, the journal editor); the journal Escape still closes. The ambition editor and Edit week type never took focus. Not run on a real phone. |
| FR-UX-8 | **Phone master-detail.** At 768 px and below, list and detail stack: selecting a row shows the detail full width with "Back to list". | Done | *Evidence (slice 5):* At 400 px Planner and Goals show the list, then the selected detail full width with "Back to list"; no page overflow on any tab in light and dark (browser run: X4 to X7 and the 400 px tab runs). Goals keeps the list position for Back to list (code path, HaradaView). *Changed 2026-10-26, UX slice 8:* the phone button reads "Back to categories"; desktop has a Close button; Escape closes the open category. |

### 9.2 Dates and years (new; dependency for Home and Insights)

| ID | Requirement | Status | AC |
| --- | --- | --- | --- |
| FR-DATE-1 | "Today" comes from the device's local date. Weeks start on Monday and use ISO week numbers. | Done | With the clock at 2026-10-25 (a Sunday), the current week is week 43, starting 2026-10-19; the year grid and charts mark it. *Evidence:* `localDateKey` in `app/utils/dates.ts`, set on mount in `app/app.vue`. Node cases (ISO weeks, Monday, DST, time zones) and a browser run at 2026-10-25 show week 43 marked. |
| FR-DATE-2 | **Effective template of a date:** the template of the applied week whose `startDate` is that date's Monday; if that week is unassigned, the active template (decided, Q2). Insights is the exception: it counts only assigned weeks (23.1). One shared function serves Home, Insights and projections. | Done | Unit test: an assigned week returns its template; an unassigned week returns the active template; a deleted template is never returned. *Evidence:* `effectiveTemplate` in `app/utils/planner.ts`, used by Insights bars and `yearlyProjectionHours`. Node cases: assigned, unassigned, deleted, year boundary. |
| FR-DATE-3 | Year handling: the year grid and charts show every ISO week of a selected year (52 or 53), default the current ISO year, with previous and next controls. | Done | 2026 shows 53 weeks, the last starting 2026-12-28; 2027 shows 52 weeks, the first starting 2027-01-04. *Evidence:* Year switcher on the Planner year grid; `isoWeekStarts` gives 53 weeks for 2026 (last 2026-12-28) and 52 for 2027 (first 2027-01-04). Browser run: 2025, 2027 and boundary clocks. |
| FR-DATE-4 | Remove the hard-coded `WEEK_DATES_2026` and `CURRENT_WEEK_INDEX`; the seed assigns weeks of the current year. | Done | No literal 2026 remains in `app/` outside comments; a fresh seed in 2027 assigns 2027 weeks. *Evidence:* `WEEK_DATES_2026` and `CURRENT_WEEK_INDEX` removed; `createInitialState(year)` seeds the current ISO year. Seed checked for 2026 and 2027 in node. |
| FR-DATE-5 | Remove `ensureDefaultWeek`, which writes today's UTC date (not a Monday) as `startDate` under a fixed id when the active template has no applied week. | Done | Creating a template and reloading adds no applied week. *Evidence:* `ensureDefaultWeek` removed from the store and the persistence plugin; a reload keeps the applied-week count (browser run). |
| FR-DATE-6 | Date-dependent output (Home, current-week markers) renders on the client only, so server and client never disagree about "today". | Done | No hydration warning caused by dates; Home shows a quiet placeholder until mounted. *Evidence:* Year, today and current-week markers are null until mounted, so the first render matches the server. Dev-build fresh load and reload after an edit: no hydration warning. *Evidence (slice 4):* Home reads `today` only after mount; the Now mark is set on mount. Browser runs at the 2026-10-25, 2026-03-04 and 2027-01-01 clocks show the right dates; no console messages on the fresh-load runs. *Evidence (slice 1):* Home date is null until mounted; dev-server probe shows no hydration warning on fresh load or after edits. |

### 9.3 Home (new)

| ID | Requirement | Status | AC |
| --- | --- | --- | --- |
| FR-HOME-1 | Home is the first tab and the default screen. It is read-only, except the journal card (FR-HOME-11), which is the primary place of journal entries. | Done | Browser (slice 6): a fresh load opens Home; the only inputs are the period selector and the journal note. *Evidence (slice 4):* Browser run on the production build: a fresh load opens Home (tab 01 selected, Day shown). The only control is the period selector; Edit and category links navigate. The journal card (FR-HOME-11) is slice 6. |
| FR-HOME-2 | Period selector Day, Week, Month (segmented control), default Day. Periods are today, the current ISO week and the current calendar month. | Done | Switching updates list, bar and totals at once; the choice survives a tab switch within the session. *Evidence (slice 4):* Period in `useState` (`home-period`), default Day, session only. Browser: ArrowRight, End and wrap-around move selection and focus; Week survives Planner and Insights tab switches; a reload returns to Day. |
| FR-HOME-3 | Header line: date and ISO week number (no template name since feat/ux-simplify; the period parts are superseded by FR-HOME-P1) (Month lists each template with its number of days). | Done | Day: "Sunday 25 October 2026 · Week 43 · Standard Week". Month: "October 2026 · Standard Week 24 d, Deep Work Week 7 d". *Evidence (slice 4):* Header line in the browser: "Sunday 25 October 2026 · Week 43 · Standard Week", "19 to 25 October 2026 · Week 43 · Standard Week", "October 2026 · Standard Week 31 d", "Friday 1 January 2027 · Week 53 · Standard Week". The mixed-template list (`periodTemplates`) passes node checks; no mixed month was screenshotted. |
| FR-HOME-4 | Day: today's blocks in time order. Each row: time range, activity name, category (dot and name), duration. Contiguous hours of one activity form one block (`slotsToBlocks`). The block containing the current hour is marked "Now". | Done | On a Standard-Week Monday the seed lists Sleep, Training, Deep Work and so on in order; durations sum to the day's planned hours. *Evidence (slice 4):* Sunday 25 October 2026 lists six blocks in time order (12AM to 8AM Sleep, 9AM to 11AM Reading, and so on); the node check matches every weekday against the template grid under UTC, Paris and New York. The block containing 10AM carries "Now" (one only). *Changed 2026-10-28, sleep (FR-SLEEP-8):* sleep hours are unplanned and sleep rows are left out while Show sleep is off. |
| FR-HOME-5 | Week and Month: activities with projected hours for the period, sorted by hours, each with its category and percent of the period. | Done | The Week rows sum to the planned hours of the week's effective template. *Evidence (slice 4):* Week rows sum to 137 h, the Standard Week hours, sorted by hours; Month rows sum to the 606 planned hours of October 2026 (browser B3, B10). |
| FR-HOME-6 | Time per category: one horizontal stacked bar for the period (categories by hours, then a neutral "Unplanned" segment) and a legend with hours and percent per category. Activities count in their own category (`categoryId`). | Superseded | Segments sum to the period hours (24, 168, or days in month x 24); every segment has a text label in the legend. *Evidence (slice 4):* One stacked bar (categories by hours, then Unplanned) and a legend with hours and percent; shares sum to 100 for Day, Week and Month (browser A7, B5; node for 9 periods). Unplanned is also a legend row so every segment has a text label (a deviation, see build-plan slice 4). *Changed 2026-10-26, UX slice 8:* the category bar and legend are removed from Home; the activities list and the timeline carry the period's hours. |
| FR-HOME-7 | Totals: planned hours, unplanned hours and period hours. | Superseded | Planned + unplanned = period hours. *Evidence (slice 4):* Metrics "19h / 5h / 24h" (Day), "137h / 31h / 168h" (Week) and "606h / 138h / 744h" (Month); planned + unplanned = period hours in node for every case. *Changed 2026-10-26, UX slice 8:* the totals row is removed from Home. Unplanned time is shown as the empty part of the timeline. |
| FR-HOME-8 | Every activity row has an Edit button (to Planner, activity edit mode, FR-UX-4). Every category in the legend links to its Goals detail (view mode). | Done | Each Edit is reachable by Tab and named "Edit {activity}". *Evidence (slice 4):* Each row has an Edit link named "Edit {activity}" (browser A10, B4); Edit opens Planner with the activity in edit mode (C1); category names link to Goals with the category selected (C3). Unplanned is not a link. |
| FR-HOME-9 | Compact goals signal: one line counting categories whose habit-linked time is below their habit target, linking to Goals. Hidden when none. | Superseded | The count equals the categories flagged "Below target" in Goals. *Evidence (slice 4):* Hidden when no category is below target (A8). After Training is cleared Monday to Friday, the line reads "1 category is below their habit target: Physical." and Goals shows the same single "Below target" flag (D4 to D6). The seed has no category below target. *Changed 2026-10-26, UX slice 8:* the below-target line on Home is removed; the "Below target" flag stays in Goals. |
| FR-HOME-10 | Empty states: nothing planned today ("Nothing planned for today in {template}." with a link to Planner); no activities at all ("No activities yet." with a link to Planner). | Partial | Clearing Sunday in the effective template shows the first message on a Sunday. *Evidence (slice 4):* Browser: "Nothing planned for today in Empty week." with a Planner link on an empty template (E1, E2) and "Nothing planned this week." (E5). The "No activities yet." state is coded but was not run in the browser. |

**Journal card (experiment, low priority).** A minimal concept test of Home as a place for check-ins and motivation **(decided)**. It ships last, is labelled "Experiment" in the UI, and may be removed after the test. Journaling by dictation or with an AI is a future idea only (section 21) and is not specified here.

| ID | Requirement | Status | AC |
| --- | --- | --- | --- |
| FR-HOME-11 | Journal card on Home with today's note: one free-text entry per local date, saved in the state (`journal`, section 14). View shows the text; Edit (or "Write today's note" when empty) opens an `AutoTextarea`; Done returns. Saves as you type (debounced 400 ms, "Saving…" then "Saved", `aria-live`). The card is last on Home and shows today in every period. | Done (experiment) | Browser, production build, clock 25 Oct 2026: a note typed with the keyboard shows "Saved" and survives a reload; the next day (26 Oct) the card is empty and the 25 Oct note stays in storage; clearing the text removes the key; Escape and Done leave edit mode with focus on Edit. Deviations: no "Recent notes" list (not in this PRD, so not built); the note is a map of date to text, not a list of entries (see section 14). |
| FR-HOME-12 | Key message: a read-only line derived from the owner's own content: the ambition statement, followed by the 1-year target of one category that rotates by day (day of year modulo the number of categories with a target). Links to Goals. | Done (experiment) | Browser: the message changes category each day (nine consecutive days cover the eight seeded categories); 1 Jan 2027 shows a message; the category link opens Goals with that category selected; nothing is stored (no `journal` key for it). Node (UTC, Europe/Paris, America/New_York): same date gives the same message; fallbacks for no ambition, no targets and one target. Deviation: a category counts when it has a 1-year target that is not "To define"; otherwise its 5-year goal is shown (the slice brief); the 1-year target alone would skip categories still marked "To define". |
| FR-HOME-13 | "Readings": a quiet placeholder line ("Docs and notes to revisit will live here.") with no data and no input. | Done (experiment) | Browser: present under the note on every period; adds nothing to the state. Deviation: heading "Readings" and the line of the slice brief, instead of "Readings to review" and "Coming later". |
| FR-HOME-14 | Habit check-ins on Home are not part of the experiment. | Not built | Reopened only as an idea (section 21); the v2 "Dropped" status of completion tracking is lifted for an experiment only. |

### 9.4 Goals

Order of the screen **(decided)**: vision section (the ambition), then the Harada map (3x3 visual), then the category list with select-and-detail.

Existing requirements (v2) and what happens to them:

| ID | Requirement | Status | Evidence / note |
| --- | --- | --- | --- |
| FR-GOALS-1 | Edit one ambition statement. | Done; re-housed | `updateAmbition`. v3: vision section at the top of Goals, view and edit mode (FR-GOALS-13). Horizon shown, not editable. |
| FR-GOALS-2 | 3x3 grid: the first eight categories around the ambition; empty placeholders if fewer. | Done; to change | `gridSlots`. Kept as a read-only visual **(decided)**: FR-GOALS-14. |
| FR-GOALS-3 | Category panel with tabs (5-year goal, habits, 1-year target). | Superseded | By the category detail (FR-GOALS-16). |
| FR-GOALS-4 | 1-year target with a "to be defined" flag. | Done; re-housed | `targetTbd`. Flag on the grid cell; text in the detail. |
| FR-GOALS-5 | Add, rename and remove habits. | Changed: superseded by FR-ITEM-4 (feat/unified-item-form, 2026-10-28). Was: Done; re-housed | `HabitList.vue`. v3: habit view and edit rows (FR-GOALS-18). |
| FR-GOALS-6 | Habit frequency and minutes per occurrence. | Changed: superseded by FR-ITEM-3 (feat/unified-item-form, 2026-10-28). Was: Done; re-housed | `setHabitFrequency`, `updateHabit`. |
| FR-GOALS-7 | Link a habit to an activity, or clear the link. | Changed: superseded by FR-ITEM-3 (feat/unified-item-form, 2026-10-28). Was: Done | `setHabitActivity`. The picker lists all activities (FR-GOALS-22). *Changed 2026-10-28:* the picker's first option, Add '<name>' to my week, makes the habit's own activity (FR-GOALS-24). |
| FR-GOALS-8 | Per habit: weekly rate and scheduled hours of the linked activity; flag unlinked habits. | Changed: superseded by FR-ITEM-4 (feat/unified-item-form, 2026-10-28). Was: Done; re-housed | `habitWeeklyOccurrences`, `scheduledWeeklyMinutesForActivity`. |
| FR-GOALS-9 | Per category: habit-time alignment and total scheduled time. | Done; re-housed | `categoryAlignments`. v3: goals-vs-planned block in the detail. |
| FR-GOALS-10 | Empty state with "Load starter grid". | Done | `seedHaradaGoals`. |
| FR-GOALS-11 | Habit periods beyond month. | Not built | Monthly approximation. Later. |
| FR-GOALS-12 | Habit completion log. | Not built | Dropped in v2; reopened only as an idea after the Home journal experiment (FR-HOME-14). |

New in v3:

| ID | Requirement | Status | AC |
| --- | --- | --- | --- |
| FR-GOALS-13 | Ambition section at the start of Goals (the page is titled Goals; with no ambition yet, a prompt writes the first one): ambition statement and horizon in view mode; Edit switches to an `AutoTextarea`. This is the only place the ambition is edited **(decided)**. | Done | Editing here updates the grid centre and the Home key message at once; the grid centre has no input. *Evidence (slice 3):* Vision section in `HaradaView.vue`: view mode, Edit with an AutoTextarea that applies at once, Done returns focus to Edit; the map centre updates; the text persists after reload (browser run). |
| FR-GOALS-14 | Harada map: read-only 3x3 with the ambition in the centre (derived from the vision section) and the first eight categories around it. A cell shows only order, name, colour and the "To define" flag. Clicking a cell selects that category in the list and opens its detail. | Changed | No inputs and no counts or hours in cells; selection is shared with the list (one selected category). *Evidence (slice 3):* Map cells show order, name, colour and To define only; click, Enter and Space select the category, shared with the list through `item`; arrow keys move focus. *Changed 2026-10-26, UX slice 8:* the Harada map is shown only from 1100 px and hidden (display none) below it; the category list is the primary view at every size. *Changed 2026-10-28:* the map is the Grid view, chosen with the List \| Grid toggle (FR-GOALS-26); List view shows the list only. |
| FR-GOALS-15 | Category list (layout of the old Configuration list): order number, colour swatch, name, short counts ("2 activities · 8 habits") and a quiet "Below target" flag. Selecting a row opens its detail. | Changed | Rows have no inputs; the selected row has `aria-current`; on desktop the first category is selected on arrival. *Evidence (slice 3):* List rows show name, colour, counts and the Below target flag; the selected row has aria-current; desktop opens the first category. The order number is not shown in the list (the map carries it), following the decision that list rows show name, colour and counts; owner to confirm. *Evidence (slice 5):* `aria-current` follows the URL selection only: on a phone with nothing selected no row is marked, and on desktop the first row is shown without `aria-current`. *Changed 2026-10-26, UX slice 8:* the list shows each name with its 1-year target line (or "Target to define") and the Below target flag, not counts. On desktop, Back to categories returns to a placeholder beside the list instead of the first category. *Changed 2026-10-28:* empty life areas fold into one row (FR-GOALS-25), and the two "Life areas" headings are removed. |
| FR-GOALS-16 | Category detail, view mode: name and colour, 5-year goal, 1-year target, goals vs. planned (bar, target tick, figures, quiet total, flags; same computation as FR-INS-1, labelled with the template used), habits (read-only rows), activities of the category (name, h/wk in the active template, Edit to Planner). | Done | Values match the v2 Insights row for the same category. *Evidence (slice 3):* Detail view: 5-year goal, 1-year target with To define, goals vs. planned bar and figures from `categoryAlignments` (the Insights computation), habits and activities (Edit to Planner). *Changed 2026-10-26, back control:* the detail opens with "Back to categories" (chevron and text, 32px high) on its own line above the title at every size; it replaces Close. Escape and the cleared `item`/`edit` are unchanged. *Changed 2026-10-27:* the category detail's hours and each Goals list row show the needed-and-planned bar with a status icon and a text line (`NeededPlannedBar`: "2 h planned of 2 h needed", "Needs 1 h more", "1 h over", "No time target yet"). The attention outline and the legend are removed. The status rule is unchanged. *Changed 2026-10-28, week types (feat/week-types):* the comparison reads the Goals week type (`goalsTemplate`): the active week type, or, while the active one is time off, the working week type with the most assigned weeks. The detail shows "Compared with <week type>" under the bar, and its activity hours come from the same week type. Home and Planner still use the active week type. *Changed 2026-10-28:* Insights counts unassigned weeks with the same week type as Home and Planner (FR-INS-P3). The view order is set by FR-GOALS-27. *Changed 2026-10-28, sleep (FR-SLEEP-7):* sleep never counts toward a life area and is not listed in it. *Changed 2026-10-29 (`feat/insights-plan-vs-need`):* the weekly bar leaves Goals. The list row and the detail show a yearly badge (FR-GOALS-P2); the comparison is in Insights over the range shown (FR-INS-P4). The habit lines show the need as a plain figure ("Needs 6 h a week"). The comparison reads each week's governing week type (`effectiveTemplate`, as Insights), so the Goals time-off read-around of FR-TPL-8 no longer applies (owner to confirm, 23.1). |
| FR-GOALS-17 | Category edit mode: name, colour (palette), 5-year goal, 1-year target, "to be defined", move up and down, Remove (inline move-to flow when it has activities or habits). | Done | Same rules as FR-CFG-2 to 4; removal with content requires a target category. *Evidence (slice 3):* Edit mode: name, colour, goal, target, To define, move up and down, Remove with an inline move-to flow when content exists (no window.confirm). |
| FR-GOALS-18 | Habit rows: view shows name, frequency ("3 a week, 60 min"), linked activity (link to Planner) or "Not linked"; Edit opens an inline form (name, count, period, minutes, activity, Remove). One habit in edit at a time; "Add habit" adds a row in edit mode. | Changed: superseded by FR-ITEM-4 (feat/unified-item-form, 2026-10-28). Was: Partial | Replaces the "Details" toggle; Tab reaches every Edit. *Evidence (slice 3):* Habit rows are read-only in view mode; one habit form opens at a time in category edit mode, with Add habit and inline Remove. Deviation: Edit is not on the rows in view mode (habit editing lives in category edit mode, as the build plan says). |
| FR-GOALS-19 | "Add life area" at the foot of the list (name, palette colour); the new category opens selected in edit mode. | Done | An empty name is refused with an inline message. *Evidence (slice 3):* Add category under the list with name and palette colour; an empty name is refused inline; the new category opens selected in edit mode. |
| FR-GOALS-20 | "Add activity" in the category detail opens Planner's new-activity form with that category preset. | Done | The new activity's category is the one it came from. *Evidence (slice 5):* "+ Add activity" in the category detail (view and edit) links to `?tab=planner&add=1&category=<id>` (`useNav`); the form opens with that category preselected and the name focused; an unknown category falls back to the first; Cancel drops `add` and `category` from the URL; reload keeps the form (browser run, `s5-focus.mjs` B1 to B9). |
| FR-GOALS-21 | Note under the list when more than eight categories exist: only the first eight appear in the Harada map. | Done | The note shows at nine categories; the ninth is in the list and works everywhere else. *Evidence (slice 3):* The note shows under the list at nine categories; the ninth is in the list and works everywhere else. |
| FR-GOALS-22 | Habit activity picker groups activities by category, the habit's own category first; a cross-category link shows the activity's category in view mode. | Changed: superseded by FR-ITEM-3 (feat/unified-item-form, 2026-10-28). Was: Done | A Spiritual habit linked to Reading reads "Reading (Cognitive)". *Evidence (slice 3):* Habit picker: optgroups by category, the own category first, categories without activities omitted; the view reads "Deep Work (Professional)" for a cross-category link (browser run). |
| FR-GOALS-23 | "+ Add habit" in the category detail is there in view mode, in edit mode and in the empty state. It opens one inline add form with the same fields as a habit's edit form (name, times and period, minutes each, linked activity); Save habit adds the habit through the store; Cancel and Escape leave nothing behind; a missing name is refused with a message; focus moves into the form; one item is open at a time. | Changed: superseded by FR-ITEM-4 (feat/unified-item-form, 2026-10-28). Was: Done | `app/components/harada/HabitList.vue`, `app/components/harada/HabitForm.vue`. Browser, local build with sample data, 1280 px and 390 px: the button in view mode, focus in the form, the refusal, a save (the list grows by one; times, minutes and the link show), Escape and Cancel add nothing, edit mode shows one button, no overflow at 390 px. Screenshots `goals-add-habit-*`. |

### 9.5 Planner: activities and the week

Existing week-grid requirements:

| ID | Requirement | Status | Evidence / note |
| --- | --- | --- | --- |
| FR-PLAN-1 | 7 x 24 grid of the active template with contiguous blocks. | Superseded | By FR-PLAN-17 and FR-PLAN-20 (activity grid and template overview) (decided, Q1). Old drag-select grid removed in slice 2b. `slotsToBlocks` is kept for Home Day blocks (slice 4). |
| FR-PLAN-2 | Drag-select a range within one day; tap one hour. | Superseded | By FR-PLAN-17. |
| FR-PLAN-3 | Selection action bar and activity picker. | Superseded | Selecting the activity first replaces the picker. |
| FR-PLAN-4 | Resize handles. | Superseded | Painting and unpainting hours replaces resizing. |
| FR-PLAN-5 | Click a block to select it; hover delete. | Superseded | By FR-PLAN-20. |
| FR-PLAN-6 | Clear a whole day. | Superseded | Per activity: drag across the day in remove mode. "Clear week" is in the backlog. |
| FR-PLAN-7 | Apply one activity across several days. | Superseded | By FR-PLAN-17 rectangle paint. |
| FR-PLAN-8 | Copy a day; clear the week. | Not built | Later. |
| FR-PLAN-9 | Planned hours (n of 168), hours per day and per activity. | Done; re-housed | v3: n of 168 and hours per day in the overview; h/wk per activity in the list. |
| FR-PLAN-10 | 30-minute slots. | Not built | The activity grid assumes hours. A 30-minute template shows a notice in place of the grid (slice 2b). |
| FR-PLAN-11 | Keyboard operation of the week grid. | Superseded | By FR-PLAN-19, required for the new grid. |
| FR-PLAN-12 | Recurring-block builder form. | Dropped | |

New in v3:

| ID | Requirement | Status | AC |
| --- | --- | --- | --- |
| FR-PLAN-13 | Layout: week type bar on top (the tab is called Week; the Year section is collapsed by default with any number of week types, and with one week type it holds the line "Every week of <year> uses <name>."), then the week grid, then the Activities list with the activity detail, then the year grid (restored 2026-10-26; see FR-PLAN-23 and 24). | Done | *Evidence (slice 2b):* the grid sits between the Activities and Year sections at 1280 and 400 px; its lede names the activity and template ("Painting hours for Training in Standard Week") or the overview ("Overview of Standard Week"). No disclosure is used: all regions are always open. |
| FR-PLAN-14 | Activity list: colour dot, name, code, category, h/wk in the active template. "Add activity" at the foot. Selecting opens the detail. | Changed: superseded by FR-ITEM-4 (feat/unified-item-form, 2026-10-28). Was: Done | Row hours sum to the "n of 168" figure. *Evidence (slice 2a):* Activities list (`PlannerView.vue`, `.act-row`): colour dot, name, "code · category", h/wk in the active template; "+ Add activity" at the foot; selecting sets `item` in the URL. Checked in the browser: row hours sum to the planned figure ("137 of 168 hours", Standard Week). |
| FR-PLAN-15 | Activity detail, view mode: name, code, category (link to Goals), colour, h/wk in the active template and in each other template (one quiet line), linked habits (names, link to Goals), schedule shown read-only in the grid. | Changed: superseded by FR-ITEM-3 (feat/unified-item-form, 2026-10-28). Was: Done | No inputs visible in view mode. *Evidence (slice 2a and 2b):* detail as in 2a; the selected activity's hours are tinted in its colour in the grid and the other activities are quieter (checked at 1280 px, light and dark). |
| FR-PLAN-16 | Activity editing: name, short code (1 to 3 letters, upper-cased), category, colour (palette), Delete with inline confirmation stating cleared hours and unlinked habits. Changing category keeps slots and habit links. Edit is on the selected row of the activity palette (slice 7), not in a detail panel. | Changed: superseded by FR-ITEM-3 (feat/unified-item-form, 2026-10-28). Was: Done | *Evidence (slice 2a and 2b):* edit fields and inline delete. *Evidence (slice 7):* Edit on the selected palette row opens the inline editor (`edit=1`); Escape or Done closes it; the name prefills (browser run, `planner-check.cjs`). |
| FR-PLAN-17 | Activity grid: 7 day columns x 24 hour rows of the active template. The slice 7 brush (paint or erase at once, no edit gate, Replaced-N-h notice) is superseded by FR-PLAN-23. | Superseded | *Evidence (slice 7):* headless Edge run (`planner-check.cjs`, 28 checks): drag paints 4 cells in one gesture; replacing shows the notice and Undo restores Deep Work; Erase clears two hours and Undo restores them; Shift plus arrows and Space paint a range; Escape drops the range; the notice dismisses after 8 s; no overflow at 400 px. |
| FR-PLAN-18 | Taken hours: an hour held by another activity is replaced when painted over. No overlaps: a slot holds one activity. | Done | Changed in slice 7 (owner decision, PRD 23.1): the earlier confirmation with Reassign and Cancel is replaced by the notice and single-step undo. *Evidence (slice 7):* replace and undo checks in `planner-check.cjs`. |
| FR-PLAN-19 | Keyboard operation of the grid: one tab stop, arrow keys move, Shift with arrows extends a range, Enter or Space acts on it, Escape drops it. Each slot has a name ("Tuesday 9AM, Deep Work"). | Superseded | *Evidence (slice 7):* headless Edge run: Shift+ArrowRight then Space paints two Thursday and Friday hours; Shift+ArrowDown then Escape then Space paints only the focused hour. Earlier evidence (slice 2b) for names and focus ring still applies. |
| FR-PLAN-20 | Template overview: with no activity selected, the grid shows the whole active template read-only. | Superseded | *Evidence (slice 2b):* browser run: no painting in the overview (drag does nothing); 137 coloured hours and 31 free match "137 of 168 hours planned"; a click or Enter on a coloured hour selects its activity (URL `item`). |
| FR-PLAN-22 | Week-first Planner layout with an Activities palette beside the grid (slice 7). | Superseded |
| FR-PLAN-23 | Week grid, original interaction (restored 2026-10-26, owner decision). 7 day columns x 24 hour rows of the active template, 28 px per hour. Drag down one day column to select a run of hours; releasing opens the action bar beside the pointer: Apply (Change when the run holds hours), Edit, Delete (when it holds hours), Cancel. Apply opens the activity menu (hours a week per activity, then Clear these hours) and overwrites the run. A click or tap on a painted hour selects its whole block; a tap on an empty hour selects that hour. Hovering a block shows its delete; a day's cross clears the day. Edit adds two handles to the run and Save (applies the new run, clears the old) or Cancel. Touch only taps, so the page scrolls freely. *Changed 2026-10-28, fix/ux-batch-5:* Apply on a run that changes hours opens Edit range on the new block at once (handles, focus on the top handle, Save and Cancel), so its start and end change without selecting it again; the Apply's Undo waits for the edit: Save extends that one step (it still restores the week from before the Apply), Cancel or Escape keeps the block as applied and the Undo line dismisses about 8 s later. Re-applying the same activity to the same run opens no edit. The handles take touch (`touch-action: none`, a drag moves the edge without scrolling the page), and Up and Down arrows move the focused edge one hour. The Apply menu fits the screen: it moves up when its bottom would pass the screen edge, its height is capped at the viewport and its list scrolls inside it (`overscroll-behavior: contain`, the overlay takes no touch scroll), so long lists scroll on phones and short desktops. Keyboard (kept from FR-PLAN-19): one tab stop, arrows move, Shift with arrows selects a run in one day, Enter or Space opens the bar, Escape closes. One-step Undo line under the grid for about 8 s after a change that alters hours. No edit-mode gate. | Done | *Evidence (2026-10-26, branch fix/restore-original-week-grid):* headless Edge on the production build, 34 checks in a scratchpad script (not committed), all passing: drag shows the run's range and duration; Apply opens the menu and paints the run; Undo removes it; a click on a painted hour selects its block; a handle drag grows the run and Save applies it; Cancel restores the run; the day cross clears Monday; Shift plus arrows, Enter and Escape with focus returned to the grid; a touch tap opens the bar; no page overflow at 1280 and 400 px; no console errors. Overwriting a run with a different activity uses the same store path as the Save step and is not separately exercised. *Changed 2026-10-28, fix/ux-batch-5 (ux5 run, headless Edge, production build, 74 checks in all, scratchpad, not committed):* Apply opens Edit range at once with focus on the top handle; ArrowDown and ArrowUp move the edges; Save extends the Apply's undo step; Undo after Save restores the week from before the Apply; Escape keeps the block and the undo line; re-applying the same activity to the same run opens no edit. Phone (400 by 800, touch emulation): a touch drag on the bottom handle resizes the run and the page does not scroll; the Apply menu with 25 items stays on screen and its list scrolls by manual touch moves with the page still at its scroll position. Short desktop (1280 by 500): the menu fits and its list scrolls with the wheel. *Not verified:* a real phone; the headless gesture tool (`synthesizeScrollGesture`) did not scroll the list, so the touch scroll was checked with manual touch moves. *Changed 2026-10-28, sleep (FR-SLEEP-6):* while Show sleep is off, rows that are sleep on all seven days collapse into bands, and the grid edits the rows shown. |
| FR-PLAN-24 | Activities under the week: a compact list of chips (colour, name, hours a week in the active template) with "+ Add activity". Selecting one shows its detail with Edit; the editor and the add form are unchanged (FR-PLAN-16). Opening from Goals (`add=1&category=`) preselects the category (FR-GOALS-20). Erase is not an activity: clearing hours is in the week grid, and Erase remains a paint tool in the year painter only. | Changed: superseded by FR-ITEM-4 (feat/unified-item-form, 2026-10-28). Was: Done | *Evidence (2026-10-26):* the same run: Activities chips show hours; selecting one shows the detail; Edit opens the editor; the add form opens and closes; `add=1&category=` opens the form focused. | *Evidence (slice 7):* headless Edge run at 1280 px (grid left of palette, palette 280 px, year grid as wide as its container, cells 32 px high) and at 400 px (palette above the grid, no page overflow). Screenshots: `spec/screens/planner-desktop-light.png`, `planner-desktop-dark.png`, `planner-mobile-light.png`. |
| FR-PLAN-25 | Schedule from the activity. The activity detail has a "Schedule in the week" button (`aria-expanded`, `aria-controls`), closed by default; opening it shows the block with a "Close" button, and Escape closes it with focus back on the button (*changed 2026-10-28, fix/ux-batch-5*: the block could not be closed before; the result line now stays under the button after the block closes, so Undo still works). The block has days (toggle chips with `aria-pressed`), a duration of 1 to 12 hours (default: the linked habit's time per occurrence rounded up to whole hours, else 1) and a start hour (default 9AM). "Add to my week" paints the activity into the active week type with the week grid's replace rule (FR-PLAN-23), reports the hours it replaced, and offers Undo for about 8 s. With no day, or a block that runs past midnight, nothing is painted and the message is inline (role alert). The brief numbered this FR-PLAN-24; that number is the Activities list. | Changed: superseded by FR-ITEM-3 (feat/unified-item-form, 2026-10-28). Was: Done | *Evidence (feat/week-types):* 53 browser checks at 1280 and 400 px, light and dark: the refusals, "Added 3 x 2 h. Replaced 6 h of Deep Work.", Undo restores both activities, the line dismisses after 8 s, keyboard Tab and Space on the chips, no overflow. *Changed 2026-10-28, fix/ux-batch-5 (ux5 run):* closed by default; the toggle opens and closes the block; Close and Escape hide it and focus returns to the toggle; a schedule applied, then closed, keeps its result line and Undo (restores the week); the same at 1280 and 400 px. |
| FR-PLAN-26 | Closing the activity editor and the Add activity form. The activity editor closes with Done or Escape (Escape first closes a delete confirmation); the Edit button that opened it gets focus back. The Add activity form closes with Cancel or Escape and the "+ Add activity" button gets focus back; Add activity saves, selects the new activity and returns focus to "+ Add activity". Leaving edit mode replaces the history entry (FR-UX-5). | Changed: superseded by FR-ITEM-3 (feat/unified-item-form, 2026-10-28). Was: Done | *Evidence (fix/week-year-and-close, 2026-10-28):* headless Edge at 1280 and 400 px, light and dark: Escape and Done (keyboard Enter) close the editor, the URL loses `edit=1` and keeps `item`, focus lands on the Edit button; Escape closes the add form and focus lands on "+ Add activity". |
| FR-PLAN-21 | Activity colour belongs to the activity. Recolouring a category recolours only the activities still using the old category colour. | Done | An activity recoloured by hand keeps its colour when its category is recoloured. *Evidence (slice 2a):* `setCategoryColor` recolours only the activities still on the category's old colour; new activities start in the category colour. Checked: Training (on the Physical colour) followed the change to ochre; Sleep (hand-picked) kept its colour. Other activity colours come from the activity record (`usePlannerMaps`). |

### 9.6 Planner: templates

| ID | Requirement | Status | Evidence / note |
| --- | --- | --- | --- |
| FR-TPL-1 | Switch the active template from a chip row with hours. | Done | `selectTemplate`. The active template is the one the activity grid edits **(decided)** and the fallback for unassigned weeks (FR-DATE-2). |
| FR-TPL-2 | Create a named, empty template. | Done | `createTemplate`. v3 fix: give it the next unused palette colour (today it copies the source colour, so year-grid colours collide). |
| FR-TPL-3 | Rename a template. | Done; to change | v3: template Edit button instead of double-click (FR-UX-2). |
| FR-TPL-4 | Template colour from the palette. | Done | `setTemplateColor`. |
| FR-TPL-5 | Delete a template (never the last); its applied weeks go. | Done | Delete is in the edit panel only (the red button in the bar was removed, feat/ux-simplify). Inline confirmation with the impact ("Delete \"Launch week\"? No week uses it. This cannot be undone.") instead of `confirm()`. *Evidence (slice 2b):* browser run: Cancel keeps the template, Delete removes it, `window.confirm` never called. |
| FR-TPL-6 | Duplicate a template. | Done | `duplicateTemplate` copies the hours into a new week type with the next unused palette colour and makes it active. Reached from the New week type panel: Start from "Copy of <name>" (FR-TPL-8). *Evidence (feat/week-types):* tsx checks (slots copied, colour unused, active, default name); browser run: "Copy of Deep Work Week" becomes the active week type. |
| FR-TPL-7 | Manage templates in Configuration. | Dropped | Templates stay in the Planner **(decided)**. |
| FR-TPL-8 | Presets and time off. A new week type can start from Standard, Deep work, Light or Vacation (`app/utils/presets.ts`). Sleep, work and exercise blocks are painted into the activities chosen for each role (matched by name, created, or left empty); the hours of habit-linked activities are kept by default for the working presets. A week type can be marked time off (`kind: 'break'`): Goals then compares against the working week type (`goalsTemplate`, FR-GOALS-16). Home, Planner and Insights are unchanged. | Done | *Evidence (feat/week-types):* tsx checks: Standard gives 8 h of sleep on a weekday and 9 h at weekends, 7 h of work on a weekday, Deep work 9 h, exercise on Monday, Wednesday and Friday; Vacation is 63 h of sleep only; `goalsTemplate` rules; `isPlannerState` accepts no `kind` or `break` and rejects other values; store create with habit hours kept (Goals "On track"). Browser run at 1280 and 400 px, light and dark: the panel and its mapping rows, Vacation created and marked, reload keeps the mark, Goals figures unchanged while it is active. No version bump: `kind` is optional. |
| FR-TPL-9 | Closing the week type panels. Edit week type closes with Done or Escape, and Edit week type gets focus back; New week type closes with Cancel or Escape, and "+ New week type" gets focus back. Opening Edit week type leaves an open activity editor (one item in edit mode per screen, PRD 11.2). | Done | *Evidence (fix/week-year-and-close, 2026-10-28):* same browser run: both panels close by Escape, by Done or Cancel, and focus returns to the opener; the year section and the Weeks row stay usable with one or two week types. |

### 9.7 Planner: year grid

| ID | Requirement | Status | Evidence / note |
| --- | --- | --- | --- |
| FR-YEAR-1 | Week grid with month labels, each week coloured by its template. | Done | Every ISO week of the selected year (52 or 53), coloured by its applied template (`weeks` from `usePlannerYear`). |
| FR-YEAR-2 | Pick a template or Erase, then click or drag to paint. | Done | `paintWeek`, `setWeekTemplate`. Mouse only; touch painting and keyboard are Next. |
| FR-YEAR-3 | Hover readout and "n / 52 weeks assigned". | Partial | Count reads "n of 52" or "n of 53" for the selected year. The unassigned readout still says "unassigned, click to paint", not "uses {active template}". |
| FR-YEAR-4 | Current-week marker. | Done | Marker from the clock, only in the current ISO year (`currentWeekIndex`). Browser run at 2026-10-25, 2026-12-31, 2027-01-01 and 2027-01-04. |
| FR-YEAR-5 | Week status, per-slot overrides and notes. | Dropped (Q5) | Removed from the model: `status`, `overrides`, `notes` and `excludedWeekStatuses`. |
| FR-YEAR-6 | Years other than 2026. | Superseded | By FR-DATE-3. |
| FR-YEAR-7 | Weeks row: one week type, or none, for a range of weeks (From and To, from 1 to the last week of the year, From not after To, inline error with role alert). Shown in the Year section with any number of week types, under the paint tools; the Year section is collapsed by default and opens from its summary. | Done | *Evidence (feat/week-types):* browser run: weeks 31 to 34 use Summer off ("Weeks 31 to 34 use Summer off."), and the grid shows the name; an inverted range and week 99 are refused; "No week type" clears the range; the Vacation preset opens the year with its week type chosen and From focused. *Evidence (fix/week-year-and-close, 2026-10-28):* one week type: the Year section is collapsed, opens, and weeks 31 to 34 use My week ("Weeks 31 to 34 use My week."), then "No week type" clears them; checked at 1280 and 400 px, light and dark. |

### 9.8 Insights (formerly Visualization)

Superseded in part by 9.11. The rows below describe the former Visualization screen as first specified: the goals-vs-planned block, the key insights and the projection text were removed in the UX polish batch, and the screen is now FR-INS-1 to FR-INS-3 in 9.11.

Insights requirements and their fate (full mapping in 11.8):

| ID | Requirement | Status | Note |
| --- | --- | --- | --- |
| FR-INS-1 | Goals vs. planned time per category. | Superseded | Primary: Goals detail (FR-GOALS-16). Overview: FR-VIZ-6. Signal: FR-HOME-9. |
| FR-INS-2 | Quiet flags per row. | Superseded | Goals detail; "Below target" in the Goals list. |
| FR-INS-3 | Year metrics. | Superseded | Split across Home, Planner and Visualization (11.8). |
| FR-INS-4 | Week-by-week chart with monthly mode and focus chips. | Superseded | FR-VIZ-3. |
| FR-INS-5 | Breakdown by category for the active template. | Superseded | Home (FR-HOME-6) and FR-VIZ-4. |
| FR-INS-6 | Hours by activity. | Superseded | Planner list (FR-PLAN-14); Home Week and Month (FR-HOME-5). |
| FR-INS-7 | Distribution by weekday. | Not built | Later, in Visualization. |
| FR-INS-8 | Scenario comparison between templates. | Not built | Later, in Visualization. |
| FR-INS-9 | Projection per activity and category. | Superseded | FR-VIZ-5. |

New in v3:

| ID | Requirement | Status | AC |
| --- | --- | --- | --- |
| FR-VIZ-1 | Visualization is read-only. Its only controls are view settings: year, Weekly or Monthly, category focus, projection horizon. | Done | No control changes categories, activities, habits, templates or weeks. *Evidence (slice 1):* Controls: year (`YearNav`), horizon (`settings.projectionDefaults.years`), Weekly or Monthly, category focus. Browser run: the only form field in the view is `#projection-horizon`. |
| FR-VIZ-2 | Year metrics for the selected year: planned hours in the year (effective templates), daily average of the leading category, top projected activity over the horizon with its one-line interpretation (`projectionInsight`). | Done | The planned-hours figure equals the sum of the week-by-week chart. *Evidence (slice 1):* `VizVisualizationView`: planned hours (sum of the week chart), daily average of the leading category, top projection with `projectionInsight`. Browser run 2026: 7,585 h planned; horizon 10 doubles the projection. |
| FR-VIZ-3 | Week by week: one stacked bar per ISO week (or per month, average per week), by category, from effective templates; unassigned weeks (Q2) drawn lighter and labelled "uses {active template}"; current-week marker; focus chips; legend with h/wk. | Done | 2026 shows 53 bars; the current week is marked from today; Monthly is the default below 768 px. *Evidence (slice 1):* Browser run 2026: 53 weekly bars; current week 43 marked; unassigned weeks at 45% opacity with a note naming the active template; focus chips; legend h/wk; Monthly default below 768 px (code path kept). |
| FR-VIZ-4 | Year by category: hours and percent of planned hours per category over the selected year. | Changed | Percentages sum to 100. *Evidence (slice 1):* Year by category over effective templates; shares by largest remainder, sum 100 (browser run). *Changed 2026-10-26, UX slice 8:* the year by category is shown under "The year" as a stacked bar and rows, not in a closed disclosure. |
| FR-VIZ-5 | Projection over 1, 3, 5 or 10 years: full list per activity, grouped by category with subtotals; horizon selector (moved from Configuration, stored in `settings.projectionDefaults.years`). | Partial | Changing the horizon updates the list and FR-VIZ-2; the setting survives reload. *Evidence (slice 1):* Horizon selector moved here, stored in `settings.projectionDefaults.years`, survives reload (browser run). The full per-activity list grouped by category is not built yet. *Evidence (slice 5):* The top projected activity is shown; the full per-activity list is computed (`projectionSummaries`) but not yet rendered. |
| FR-VIZ-6 | Goals vs. planned overview: all categories, read-only bars with the same values as Goals; each row links to its Goals detail. | Done | Values equal FR-GOALS-16 for every category. *Evidence (slice 1):* Overview rows use the `categoryAlignments` values (active template) and link to Goals with the item. The Goals detail that shows the same figures is slice 3. *Evidence (slice 3):* Goals detail shows the same values for each category; each Visualization row opens Goals with that category selected (browser run). |

### 9.9 Configuration (removed in v3)

| ID | Requirement | Status | Note |
| --- | --- | --- | --- |
| FR-CFG-1 | Category list with counts, h/wk and h/yr. | Superseded | Goals list (FR-GOALS-15); h/wk in the Goals detail; h/yr in FR-VIZ-4. |
| FR-CFG-2 to 4 | Add, rename, recolour, reorder, remove categories. | Superseded | FR-GOALS-17, FR-GOALS-19. Store logic kept. |
| FR-CFG-5 | Note above eight categories. | Superseded | FR-GOALS-21. |
| FR-CFG-6 | Add an activity. | Superseded | FR-PLAN-14. |
| FR-CFG-7 | Delete an activity. | Superseded | FR-PLAN-16, now with confirmation. |
| FR-CFG-8 | Edit an activity. | Superseded | FR-PLAN-16 (core v3 requirement). |
| FR-CFG-9 | Projection horizon. | Superseded | FR-VIZ-5. The "Excluded statuses" note is removed. |

### 9.10 App shell, persistence and portability

| ID | Requirement | Status | Evidence / note |
| --- | --- | --- | --- |
| FR-APP-1 | Tabs Goals, Planner, Insights, Configuration; Goals default. | Superseded | By FR-APP-7. |
| FR-APP-2 | Light and dark themes with a topbar toggle. | Done | `localStorage["timely.dark"]`. |
| FR-APP-3 | Persist the whole state on every change; restore on load. | Done | `planner-persistence.client.ts`. |
| FR-APP-4 | Discard a saved state with another version or a broken shape. | Done | `isPlannerState`. Slice 6: `journal` must be an object whose values are strings; version 6 saves are discarded (node check: a version 6 state is rejected, no migration). |
| FR-APP-5 | Export JSON, import a backup, reset all data. | Not built | Next. With Configuration gone, it goes in a small "Data" menu in the topbar (A7). |
| FR-APP-6 | Clean console on load. | Done | Dev-server probe (fresh load, reloads after edits and an invalid tab): no console warnings or hydration messages. Production console clean at 1280 and 400 px. *Evidence (slice 1).* |
| FR-APP-7 | Four tabs in order Home, Goals, Planner, Insights, numbered 01 to 04; Home default **(decided)**. | Done | Tabs fit at 400 px without scrolling; `app/app.vue` has no Insights or Configuration entry. *Evidence (slice 1):* Home, Goals, Planner and Insights are numbered 01 to 04 with Home default (browser run). Configuration is a transitional fifth tab. At 400 px the five tabs scroll inside `.tabs` (42 px overflow) until slice 3 removes Configuration. *Evidence (slice 3):* Four tabs in order Home, Goals, Planner, Insights, numbered 01 to 04; Configuration removed; `?tab=configuration` falls back to Home. |
| FR-APP-8 | Remove the Insights and Configuration views and code only they use. | Done | `InsightsView.vue` and `LegendView.vue` are gone or reduced to reused parts; build and typecheck clean. *Evidence (slice 1):* `InsightsView.vue` removed; the projection horizon moved from `LegendView.vue` to Visualization. `LegendView.vue` stays until slice 3. *Evidence (slice 3):* `LegendView.vue` and its CSS removed in slice 3; no Configuration code is left. |
| FR-APP-9 | Storage modes: local (default, localStorage) or Supabase (`NUXT_PUBLIC_STORAGE=supabase`). Supabase keeps one JSON snapshot row per user (`spec/database/snapshot.sql`), with the same version rule as local storage. | Done (snapshot, not normalised) | `app/utils/storage/`. Local mode loads no Supabase code (separate chunk, dynamic import). Verified in a browser against a fake Supabase server; **not yet run against a real Supabase project**. |
| FR-APP-10 | Supabase mode: Google sign-in (the email magic link was removed on 27 October 2026, see the changelog); no data loaded or written before a session; sign-out resets the screen to the seed without writing; users on the same browser never see each other's data; a failed load blocks writes. | Done (not yet real) | `app/composables/useAuth.ts`, `app/utils/storage/session.ts`, `app/components/auth/LoginGate.vue`. Browser run against a fake Supabase (before the email link was removed): gate, error and confirmation states, first-login row creation, edit and reload, sign-out, user switch, load failure. Screenshots in `spec/screens/login-gate-*`. After the email link was removed (27 October 2026): one Google button and no inputs or tabs when signed out, no planner_state request, the Google authorize request made and intercepted, no overflow and no console errors at 1280 and 400 px, light and dark (headless Edge, Supabase mode). |
| FR-APP-11 | Sign-in page with the intro (Supabase mode, signed out): one centred column. The headline "Your goals decide your week" and one supporting line (no product label above it: the topbar shows the name), then the intro player (looping; it opens paused on scene 1 with a Play button over the stage and starts only on Play), then the Google button and the consent line. The player is shared with the first-run dialog (`IntroPlayer.vue`); it holds while the tab is hidden or the stage is out of view, and has no Play and no timer on reduced motion. Quiet footer on this page. No tabs and no planner request before sign-in. | Done (not yet real) | `app/components/auth/LoginGate.vue`, `app/components/onboarding/IntroPlayer.vue`, `.login-*` and `.onb-intro-*` in `main.css`. Browser, production build in Supabase mode, signed out (headless Edge, 27 October 2026): no label above the headline, 0 tabs, 0 planner requests, opens paused on scene 1 with the overlay, no autoplay after 11 s, Play starts it and it advances after 9 s, focus moves to Pause, the loop returns to scene 1 after the last scene, reduced motion (no overlay, Next moves), 390 px light and dark with the 56 px Play inside the stage and no overflow. Screenshots `login-gate-*`. |

---

### 9.11 UX polish batch (branch `feat/ux-polish`, status in the last column)

This batch changes the requirements below. Where a row names an earlier requirement, the earlier one is superseded for the part named.

| ID | Requirement | Status and evidence |
| --- | --- | --- |
| FR-HOME-P1 | Home is Today only: the title and date, no Day, Week or Month selector, no week or month projection (supersedes FR-HOME-2 to 10 for the period parts). | Done: `HomeView.vue`, `utils/home.ts`; browser check at 1280 and 400 px. |
| FR-HOME-P2 | The hour timeline sits under the title: 24 colour-only segments, axis labels 9h, 12h, 18h and 22h on a 24-hour scale. | Done: axis positions 37.5%, 50%, 75%, 91.7%. |
| FR-HOME-P3 | Journal (FR-HOME-11 to 13) keeps one note per day with view, Edit, Done and autosave; the key message (FR-HOME-12), the readings placeholder and the experiment label are removed. | Done: `JournalCard.vue`; `utils/journal.ts` removed. |
| FR-GOALS-P1 | Needed against allocated time per category, shown only at category detail: two bars on one scale in hours a week, each with a small caption above it, "Needed" or "Planned" (2026-10-28) (Needed: the habits' time; Allocated: scheduled hours of the category's activities in the active template) and one verdict: Missing, over, On track or No time target yet. Tolerance: the larger of 30 minutes and 10% of the need (supersedes the goals-vs-planned display of FR-GOALS-16 and the Visualization section). | Superseded 2026-10-29 by FR-INS-P4 (Insights) and FR-GOALS-P2 (the Goals badge). The status rule is unchanged. | Evidence (2026-10-28): `alignmentStatus`, `categoryAlignments` in `utils/planner.ts`; over, On track and none checked in the browser on the seed; captions checked at 1280 and 400 px. |
| FR-GOALS-P2 | Habit rows show the linked activity's hours against the need, or "Not linked". | Done: `HabitList.vue`. |
| FR-GOALS-P3 | A category under or over its time target has an `--attention` outline on its list row and its map cell, with the gap as text on the row (not colour only). A one-line legend sits above the list. | Done: `HaradaView.vue`, `main.css` (token in both themes). Partial: after a reload with a saved state that differs from the seed, the class may stay stale until re-render (see `.claude/agent.md`, open items). |
| FR-PLAN-P1 | An activity has one primary category (`categoryId`, colour, listing, Insights totals) and optional `alsoCategoryIds` (hours also count in those categories' comparison). The Planner add and edit forms offer "Also counts toward". Storage version 8, no migration. | Done: `types/planner.ts`, `isPlannerState`, store actions, `AlsoCategories.vue`; checked in the browser (Reading counts toward Spiritual). |
| FR-INS-1 | Insights (replaces 9.8 Visualization): one planned-hours bar chart stacked by category, granularity Year, Quarter, Month or Week, range one year or several (the shared year plus the projection horizon). Below it the categories with hours or weeks (168 h = 1 week) and their share of the total, which adds up to 100. Read-only. Removed: goals vs planned, key insights and horizon text. Unassigned weeks count the week type that governs them (23.1, FR-INS-P3); with nothing planned in the range, a sentence says so (FR-INS-P1). | Done: `insights/InsightsView.vue`, `utils/insights.ts`. *Changed 2026-10-28, sleep (FR-SLEEP-7):* sleep is hidden by default and then takes its hours out of the available time; Show sleep counts it under Physical. |
| FR-INS-2 | Each ISO week counts once and belongs to the year, quarter and month of its Thursday; each activity counts once, in its primary category. | Done: throwaway `tsx` checks in UTC, Europe/Paris and America/New_York (totals equal across granularities, 53-week 2026, shares sum to 100; assigned weeks only: seed Environment 124 h, zero planned with no assigned weeks). |
| FR-INS-3 | The tab is "Insights" (`?tab=insights`); an old `?tab=visualization` falls back to Home. | Done: `useNav.ts`, `pages/index.vue`. |
| FR-UX-P1 | Copy rule: no intro paragraphs, subtitles or instructional sentences under titles, sections or tabs. Keep field labels, units, values, empty states that say what to do, errors and confirmations. Keyboard hints may live in `title` tooltips. | Done: copy sweep on Home, Goals, Planner and Insights. |

Derived values: 168 hours is one week. The Goals tolerance is the larger of 30 minutes and 10% of the need.

### 9.12 Edit controls, unlink and available time (feat/ux-polish, batch 3)

| ID | Requirement | Status and evidence |
| --- | --- | --- |
| FR-UX-P2 | One Edit control everywhere an item is edited: a pencil icon (`EditButton.vue`), at least 24px hit area (28px), the item's name in its aria-label and title, a visible focus ring, muted ink with a tint on hover. Used for the ambition, categories, activities (Goals and Planner), Home activity links, the journal note, the range edit and the active template. Done and Write stay text. | Done: `EditButton.vue`, `.edit-btn` in `main.css`; keyboard Enter opens a habit in the browser check. |
| FR-GOALS-18 | Each habit row has its own pencil: name, times, period, minutes each, linked activity (None first), Unlink activity, Remove with confirmation, Done. Independent of the category's edit mode; Add habit stays in category edit mode. Resolves the FR-GOALS-18 partial. | Changed: superseded by FR-ITEM-4 (feat/unified-item-form, 2026-10-28). Was: Done: `HabitList.vue`; minutes saved and the row text updated in the browser check. |
| FR-UX-2 | Template edit: the active template has a pencil that opens rename, colour (all colours) and delete. Double-click rename and the chip-dot colour stay. Resolves the FR-UX-2 partial. | Done: `PlannerView.vue`, store `renameTemplate`. |
| FR-GOALS-P5 | Unlink: an activity that counts toward a category only through "also counts toward" has Unlink with inline confirmation (not offered while a habit of the category still links it). A habit's linked activity can be cleared (Unlink activity, or None). The primary category is changed only in the Planner activity form; it cannot be unlinked. Comparison, outlines and Insights update at once. | Done: store `removeAlsoCategory`; throwaway tsx checks in UTC, Europe/Paris and America/New_York; browser check (secondary and habit unlinks change the verdict to Missing). |
| FR-INS-4 | Available time: each bar has a red 2px line at the hours available in its period, labelled in the chart header by granularity ("Available per month: 525 h"; "up to 840 h" when the periods differ, "Available per week: 168 h"; `capacityLabel`, 2026-10-28). Available time is the days of the bar's ISO weeks times 24, so a month is 4 or 5 weeks (672 to 840 h). The axis always includes the line, and the tooltip reads "planned X, free Y". | Done: `utils/insights.ts` (`capacity`, `free`, `chartScale`); tsx checks; visible in all four granularities in the browser check. |
| FR-INS-5 | One unit selector for Insights: Hours, Days (hours / 24) or Weeks (hours / 168). It drives the axis, the cap label, the bar tooltips and the categories list. Replaces the list toggle; percentages do not change. | Done: `InsightsView.vue`; checked in all three units. |

Deviation: available time counts the days of whole ISO weeks, not calendar days, because the planned hours of a bar are its ISO weeks. A calendar month would not match them and the free time would be wrong.

### 9.13 First-run onboarding (feat/onboarding)

| ID | Requirement | Status and evidence |
| --- | --- | --- |
| FR-ONB-1 | Start: Welcome shows only for a new user: nothing valid was loaded from storage (local: no saved state or a discarded one; Supabase: no row or a discarded row, not a failed load), or a save still marked `onboarding: 'pending'`. A save without the field is never onboarded. | Done: `planner-persistence.client.ts`, `utils/storage/session.ts`, `needsOnboarding` in `utils/onboarding.ts`. Browser: empty storage opens Welcome; the rich seed saved without the field opens with no Welcome (test D). The Supabase branch is code-checked only (no real project run). |
| FR-ONB-2 | Fresh state: `createOnboardingState()` (no data, one empty hourly template "My week", `onboarding: 'pending'`) is the store default and what a new user starts from. `onboarding` is optional and validated (other values rejected); `PLANNER_STATE_VERSION` is unchanged (8). Sign-out and user switch reset to the empty state without writing; `replaceState` and `$reset` stop a previous user's data or flag from carrying over. | Done: `utils/planner.ts`, `stores/planner.ts`, `utils/storage/bind.ts` (saves `onboarding`). tsx: an old-shaped state is accepted, `onboarding: 'maybe'` is rejected. Browser: Start empty stores `done` with no data and does not return after reload (test B). |
| FR-ONB-3 | Welcome dialog: one sentence on the idea; Guide me (straight to step 1), Start empty (no life area, habit or activity; the empty week type assigned to every week of the year; done) and Explore with sample data (the rich seed, done). The link "Watch the short intro" opens the intro. Focus moves into the dialog; Escape is Start empty. Client only: nothing in the server HTML. | Partial: `components/onboarding/OnboardingFlow.vue`. Browser: focus in the dialog, sample data and Start empty (tests A, B, C), no hydration warning on a fresh load. Gap: no focus trap, so Tab can reach the page behind. Screenshot `spec/screens/onboarding-welcome-desktop-light.png`. |
| FR-ONB-4 | Guided path, two dialogs with "Step N of 5". Step 1 (Your 5-year ambition): the framing text and one required field, then Next. Step 2 (Goals and habits): one goal block by default, "Add a second goal" (max 2) and Remove on the second. Each block: the life area (text, with the Harada suggestion chips; a chip the other goal uses is disabled; the two areas must differ), an optional "What do you want there in 1 year?", one habit, times a week (1 to 7, default 3) and hours each time (1 to 3, default 1). Inline errors with `aria-invalid` and `aria-describedby`; Enter submits; Back goes to step 1; Escape goes back one step. | Done: `OnboardingFlow.vue`. Browser, local (`flows`, 75 checks in all): empty ambition and goals show errors and focus the field; a duplicate area is blocked; the chip is disabled in the other goal; add and remove; Back keeps the answers; Escape goes back; Enter submits (tests A, B, C). Screenshots `onboarding-ambition-desktop-light.png`, `onboarding-goals-desktop-light.png`, `onboarding-goals-two-desktop-light.png`. |
| FR-ONB-5 | Build, on the submit of step 2: the ambition (horizon 5 years); one life area per goal (order 1 and 2, distinct colours from `DESIGN_COLORS`, the optional 1-year target); one habit per goal (N a week, hours times 60 minutes, linked to its activity); one activity per habit (named after it, a 1 to 3 letter code); the template "My week" with each goal's sessions: the first goal at 6PM and the second at 7AM, on N distinct weekdays, so the two never share an hour; the template assigned to every ISO week of the planner year. Goals then shows each life area as "On track". | Done: `utils/onboarding.ts` (`buildOnboardingState`, up to two goals), `useOnboarding.build`. tsx (`buildOnboardingState`, 27 October 2026): 21 single-goal cases and all 441 two-goal combinations (times 1 to 7 and hours 1 to 3 for both goals): 3728 checks, 0 failed; slots equal the sum of the hours, none overwritten, days distinct, both categories `ok`, `isPlannerState` true, old state accepted. Browser: 53 weeks assigned; the two-goal plan holds 6 h and 15 h (test B). |
| FR-ONB-6 | Tour: three cards that continue the path numbering. 3 Plan your week (on Planner: "Timely placed N h for X and M h for Y" from the first two life areas, and that Goals shows each area as on target); 4 Insights (where the planned hours go, one colour per life area); 5 Daily follow-up (Home today and the journal, and what next: life areas in Goals, activities in Planner). Goals has no card of its own. A compact card at the bottom that does not block; Back, Next, Done and "Skip tour"; no step counter on the cards (the two form steps read "Step 1 of 2" and "Step 2 of 2"); Escape skips; session only, so a reload closes it. | Done: `OnboardingTour.vue`, `useOnboarding.ts` (`TOUR_FIRST_STEP`, `ONBOARDING_STEP_COUNT`). Browser: the three cards with their routes and copy (tests A, B), skip from the card (test D), the 400 px card inside the viewport with no overflow (test C). Screenshots `onboarding-tour-plan-desktop-light.png`, `onboarding-tour-insights-desktop-light.png`, `onboarding-tour-plan-mobile-light.png`, `onboarding-tour-last-mobile-light.png`. |
| FR-ONB-7 | Replay: a "Tour" text button in the topbar, shown when the tabs are shown and storage has loaded. With an ambition and a life area it opens the tour at step 3 (Plan your week); without them it opens Welcome. | Done: `app/app.vue`. Browser: replay after a skip (test D), and with no data it opens Welcome (test D). |
| FR-ONB-8 | Accessibility and touch: `role="dialog"` with a name, focus in the panel on open, labels linked to fields, 44px targets at 768 px and below. | Partial: focus, labels and touch sizes checked in the browser; the focus trap gap is in FR-ONB-3. Known issue: a returning save logs "Hydration completed but contains mismatches" (the server renders the empty state; see `.claude/agent.md`, open items). |
| FR-ONB-9 | Intro: from the Welcome link "Watch the short intro" (or the tour's replay), five scenes of about 9 seconds each (about 45 seconds): Ambition, Goals and habits, Plan the week, Compare, Insights and daily follow-up. Each caption (at most about 14 words) sits inside the stage, in a band across its top 28 percent, and animates in with its scene; the graphics sit below the band. The same caption is in an `aria-live` region outside the stage for screen readers. Crossfade; a progress bar in five segments (click to jump); Play and Pause, Back, Next, "Continue" on the last scene, Skip intro. It does not autoplay: it opens paused on scene 1 (drawn whole, with a Play button over the stage). The first Play starts it from scene 1; a segment clicked before that jumps to its scene and stays paused. Pause stops the scene and its animations; the last scene holds. "Continue" is always shown, so the video is optional. Escape skips; finishing or skipping returns to Welcome (or to the tour when it was opened from there). Reduced motion: no timer and no autoplay, each scene whole, Back and Next. "Watch the intro again" on the tour's last card returns to the tour. Start empty and sample data skip it. SVG and CSS only; client only. | Done (focus trap missing, as FR-ONB-3): `IntroPlayer.vue` (`SCENE_MS`; the first-run dialog `OnboardingIntro.vue` wraps it, and the sign-in page reuses it with `loop`), `.onb-intro-*` and `.sr-only` in `app/assets/css/main.css`. Browser, local: autoplay measured at 9.0 s per scene (gaps 8.9 to 9.1 s), the last scene holds and offers the button; reduced motion (timing, 11 checks). Frames at 1280 and 400 px, light and dark: the caption text of each scene, the caption fits its band, no graphic under the band, no overflow, no console errors (68 checks); the frames were also checked by eye. Not tested with a real screen reader. Screenshots `onboarding-intro-scene-1-desktop-light.png`, `onboarding-intro-scene-3-desktop-light.png`, `onboarding-intro-scene-5-desktop-light.png`, `onboarding-intro-dialog-mobile-dark-scene-2.png`. |
| FR-ONB-10 | Reset my data: an Account menu item in the top bar (both modes; Supabase also shows the email and Sign out). It opens a confirmation (alertdialog, Cancel focused, Escape cancels, Tab stays inside) that says what is deleted. Delete replaces the planner with the empty onboarding state, saves it at once (Supabase: the user's row; the sign-in is not deleted), resets the selected year and returns to Home with Welcome. A failed save shows the error, keeps the dialog open and puts the previous data back. | Done: `app/components/account/ResetDataDialog.vue`, `app/composables/useResetData.ts`, `app/utils/storage/active.ts`, `saveNow` in `app/utils/storage/types.ts`, `plannerLocalStorage.ts` and `supabase.ts`, `app/app.vue`. Browser, local (19 checks): menu contents, focus and Tab trap, Escape and Cancel leave the data, confirm stores the empty state, Welcome opens, reload shows Welcome, no overflow at 400 px, no console errors. Browser, Supabase against the fake server (14 checks): the empty state is written to the row, a failed write shows "Not reset" and keeps the data, a retry succeeds, reload shows Welcome. Not run against a real Supabase project. Screenshots `spec/screens/reset-confirm-desktop-light.png`. |
| FR-ONB-11 | The 5-year ambition is written in full: the guided step 1 field is an auto-growing text box (it wraps, with no ellipsis, clamp or fixed height); Enter is Next and never adds a line. The Goals vision statement and its edit field, and the Harada map centre, show the whole text too. | Done | `app/components/onboarding/OnboardingFlow.vue`, `app/components/AutoTextarea.vue` (attributes go to the textarea), `app/components/harada/HaradaView.vue` (`.cell-title` breaks long words). Browser, local build, a 228-character ambition at 1280 and 400 px: no inner scroll in step 1, the field grows, Enter opens step 2, the vision field grows, the statement and the centre title are not clipped, no overflow. Screenshots `onboarding-ambition-long-desktop-light.png`, `goals-vision-long-*`. |
| FR-ONB-12 | The first-run dialog fits a phone: the whole 16:9 stage, its caption and the controls are inside the dialog and the viewport at 360, 390 and 430 px wide and at 390 by 700 px, in light and dark. The dialog is centred with auto margins, keeps its max height (100dvh minus 32px) with an inner scroll only if needed, and has 16 px padding on phones. The caption band grows for a third line instead of clipping the text, and the caption fades in without moving up. | Done | `app/assets/css/main.css` (`.onb-dialog`, `.onb-intro-caption`, the 480 px block), `app/components/onboarding/IntroPlayer.vue`. Browser, production build: 58 checks in the intro and sign-in run (every scene at four phone sizes, light and dark: stage and caption inside the dialog and the viewport, controls inside, no overflow). Before the fix, the first caption of 360 px rose 5 px above the stage. Screenshots `onboarding-intro-dialog-mobile-{light,dark}-scene-1..5.png`. |

### 9.14 Legal pages and privacy (feat/legal-pages)

| ID | Requirement | Status and evidence |
| --- | --- | --- |
| FR-LEGAL-1 | Terms of Use at `/terms` and a Privacy Policy at `/privacy` (GDPR), in plain English, short sections with headings and bullet lists. Each shows its title, a "Last updated" date and "Back to Timely". Operator details come from one place, `app/utils/legal.ts`; filled in 27 October 2026. | Done (text not legally reviewed): pages built (`app/pages/terms.vue`, `privacy.vue`, `components/legal/LegalPage.vue`). Browser: both render in local and Supabase mode at 1280 and 400 px, light and dark, no overflow (tests L1, S1). Operator details filled in. |
| FR-LEGAL-2 | Both pages open without a session in Supabase mode, with no planner data loaded or written and no planner request to Supabase. The sign-in gate and the planner tabs are not shown on them; `/` and the `tab` query are unchanged. | Done: `app/app.vue` (`legalPage` reads the router's current route; the gate and the tabs are skipped on legal routes). Browser: signed-out `/privacy` and `/terms` open, the back link returns to the gate, zero planner REST requests (test S2). |
| FR-LEGAL-3 | Consent line under the sign-in card: "By continuing you agree to the Terms of Use and the Privacy Policy", both as links in the same tab. No checkbox. | Done: `components/auth/LoginGate.vue`. Browser: links go to the right pages, the line wraps without splitting a link (test S1). Screenshots `legal-login-consent-*`. |
| FR-LEGAL-4 | Quiet footer "Terms · Privacy" in local mode, on the sign-in page and for signed-in users, on every planner screen and the legal pages. No layout shift and no overflow at 400 px. Shown on the sign-in page too, under the consent line (FR-APP-11). | Done: `app/app.vue` (footer), `.app-footer` in `main.css`. Browser: footer links from Home reach both pages and Home again; no overflow at 400 px (test L1). |
| FR-LEGAL-5 | Content matches what the app does: local mode keeps data in the browser and sends nothing; account mode keeps one row per user in the owner's Supabase project; no analytics, advertising, tracking or sale; processors Supabase, Vercel and Google (only for Google sign-in, and Google Fonts for the typeface); legal basis Article 6(1)(b); security limits stated (not end-to-end encrypted, no system is perfectly secure). | Done (text): reviewed against `utils/storage/*`, `composables/useAuth.ts`, `nuxt.config.ts` (Google Fonts) and `spec/database/snapshot.sql` (RLS). Not legally reviewed (see open items). |
| FR-LEGAL-6 | Rights (access, rectification, erasure: planner content by Reset my data (FR-ONB-10); the sign-in account and the email address on request by email, restriction, portability, objection), the right to complain to a data protection authority, a note that children under 16 are not intended, and a "Changes to this policy" section that promises a policy update before any analytics. | Done (text): `app/pages/privacy.vue`. Planner content is erased self-service (Account, Reset my data, FR-ONB-10); deleting the sign-in account and the email address is by email. Privacy text updated (27 October 2026). |

### 9.15 Goals and Insights simplify (feat/goals-insights-simplify)

Fewer concepts on screen and less to fill in; the power stays opt-in (owner UX review, 2026-10-28).

| ID | Requirement | Status and evidence |
| --- | --- | --- |
| FR-GOALS-24 | Habit creates its activity. The habit form's "Linked activity" select lists "Add '<name>' to my week" first, once the name is set. It is the default for a new habit when minutes each is set; an existing habit keeps its link until the option is chosen. Choosing it makes an activity named after the habit in the habit's life area, or links the activity of that name there, with the life area colour and a short code from the name (another free code is derived when the default is taken; if none is free, an inline error). A new habit is added and linked on Save habit; Cancel creates nothing. A habit without minutes is allowed. Renaming the habit does not rename the activity. | Changed: superseded by FR-ITEM-3 (feat/unified-item-form, 2026-10-28). Was: Done: `stores/planner.ts` (`ownActivityFor`, `freeShortCode`), `harada/HabitForm.vue`, `harada/HabitList.vue`. Browser, 1280 px, Start empty: Run created with code RUN, linked, and listed in Planner; Cancel adds nothing; "Run club" gets UNC; an existing habit links Run and then None; a rename keeps the activity name. |
| FR-GOALS-25 | Empty life areas fold. An area with a 5-year goal, a 1-year target, habits or activities is listed in full. The others collapse into one row, "N more life areas · add a goal" (a button with aria-expanded). Opened, they are listed with their name and an "Add a goal" control that opens the detail in edit mode; the row stays open for the session. With no content at all, every area is listed that way (a new user), with no target, bar or "No time target yet" lines. | Done: `harada/HaradaView.vue` (`hasContentArea`, `emptyOpen` in useState). Browser at 1280 and 400 px: new user shows eight name rows; one area with content shows one full row and "6 more life areas"; expanded, then reset by a reload. |
| FR-GOALS-26 | Grid view. A List \| Grid toggle (two buttons, aria-pressed) sits above the browse area, from 1100 px only. List is the default: the list with the detail beside it. Grid: the Harada map with the detail below it, and no list. The choice lasts for the session (useState), not in the saved state. Below 1100 px only the list exists. The map keeps its keyboard path (FR-GOALS-14, 15). | Done: `harada/HaradaView.vue` (`goals-view`). Browser at 1280 px: List and Grid states, a cell click opens the detail under the map; at 400 px no toggle and no overflow. |
| FR-GOALS-27 | Category detail, view mode order: 5-year goal, 1-year target, the hours comparison ("Compared with <week type>", bar, status and text), habits (with Add habit), then More activities: the activities no habit of the category links, with Add activity. Habit-linked activities are not repeated there. The per-activity notes ("not in comparison", "linked by a habit", "also counts here") and Unlink are in edit mode only; edit mode keeps all fields and its order. | Done: `harada/CategoryDetail.vue` (`viewRows`). Browser, sample data, 1280 px: the section order checked in the DOM and in a screenshot. *Changed 2026-10-28, fix/ux-batch-5:* the order was target, habits, hours, goal, activities; the goal and the target now lead, and the hours block sits above the habits. Browser (ux5 run): the five `.detail-label` headings in that order; `spec/screens/goals-detail-desktop-light.png`. |
| FR-INS-P1 | Removed (2026-10-28, owner decision after testing): the headline sentence above the Insights chart. The life areas list below carries the shares. | Removed | `headlineSentence` deleted from `app/utils/insights.ts`; `InsightsView.vue`. Browser: no headline at 1280 and 400 px. |
| FR-INS-P2 | Insights controls: the first row is the year switcher and Month or Week. "More options" (closed by default, aria-expanded, open for the session) holds Quarter and Year, One year or Several years with the horizon, and the unit "Show in" with Hours, Days (24 h) and Weeks (168 h). While it is closed the button names any setting that is not the default. | Done: `insights/InsightsView.vue`. Browser at 1280 and 400 px, light and dark; no overflow; the button's summary checked. |
| FR-INS-P3 | An unassigned week counts the week type that governs it: its assigned one, else the active one (`effectiveTemplate`), as Home and Planner do. There is no "No weeks assigned yet" state and no link to the year grid; with nothing planned in the range the sentence (FR-INS-P1) and a link to Planner say so. Supersedes the 2026-10-26 rule (23.1). | Done: `utils/insights.ts` (`weekCategoryHours`); tsx: Start empty gives zero planned hours, the seed's totals agree across Year, Month and Week, shares add up to 100. |
| FR-INS-P4 | Planned against needed, merged into the Life areas list for the whole range shown: each life area keeps its row (name, hours, share, share bar), and a life area with a need adds one compact status line under its bar (`InsightsPlanStatus`): the status icon and text in the chosen unit ("43 h over", "74 h planned of 80 h needed", "Needs 32 h more"). Rows with no need show nothing extra. One short caption under the title: "Planned time against what your habits need over this period". No separate section and no extra bars. Values in the chosen unit (Hours, Days or Weeks). Needed: what the life area's habits ask for in every week of the range (weekly rate times minutes per occurrence; a year is 52 weeks). Planned: the hours of its compared activities (linked from its habits, or listed as also counting there; sleep never; each once) in the template that governs each week. Life areas with no need fold into one line, "N life areas with no time target". Read-only. | Done (2026-10-29, `feat/insights-plan-vs-need`; merged into the Life areas list after the owner's review the same day): `categoryPlanVsNeed` in `utils/insights.ts`. Resolved with a caption note: a life area's status counts the activities linked from its habits even when they belong to another life area, while its share counts only its own activities (FR-PLAN-20), so the row can show "0 h" beside "74 h planned of 80 h needed". tsx: needed over 7, 52 and 53 weeks per frequency; the one-year map equals the one-year call; planned minutes match an independent count; three years add up to the sum of the years. Browser at 1280 and 400 px, light and dark: 42 checks, no console errors, no overflow. |
| FR-GOALS-P2 | Goals shows a yearly badge instead of the weekly bar: each list row and the category detail show an icon and a short text for the year shown ("On track this year", "Short by 32 h this year", "Over by 43 h this year"; "in 2027" for another year). Nothing when the habits ask for no time. The detail has a quiet "See in Insights" link. Its habit lines show the need as a plain figure ("Needs 6 h a week", in the habit's own frequency). The per-habit comparison bars are removed. Status rule unchanged. | Done (2026-10-29): `yearPlanVsNeed`, `planPeriodLabel` in `utils/insights.ts`; `harada/PlanBadge.vue`; `entries.ts` `needText`. Browser checks as FR-INS-P4. Screenshots `goals-desktop-light.png`, `goals-mobile-light.png`, `goals-detail-desktop-light.png`. |

### Activities and habits in one form (FR-ITEM, feat/unified-item-form, 2026-10-28)

| ID | Requirement | Status | AC |
|---|---|---|---|
| FR-ITEM-1 | One kind of item: an entry is a habit with its linked activity, or an activity that no habit links to. The stored objects keep their shape (no new fields, storage version 8). | Done | Pure rules in `app/utils/entries.ts`; scratch checks cover a habit-only entry, a timed entry, an orphan activity (Sleep) and the habit-with-activity draft. |
| FR-ITEM-2 | One save: the whole draft is checked first and nothing changes on error; the habit, the activity and the hours are written in one step (`saveEntry`). Hours are repainted only when the days, the whole hours, the start or the week types changed; a name, colour, code or life-area change alone never repaints. | Done | `saveEntry` and `removeEntry` in `app/stores/planner.ts`. Scratch checks (tsx, 13): habit only, timed in two week types, edit without a change (no repaint), edit with a change (repaint, result, undo restores both week types), No time (the hours and the activity go), midnight refusal, short-code clash. |
| FR-ITEM-3 | One form, `app/components/ActivityForm.vue`, in the Week tab and in a Goals life area, to add and to edit: Name; Life area; Duration (No time (habit), 15 min to 12 h); Days (seven chips, aria-pressed) or "Or: N times a week or month" when no day is chosen; for a timed entry Start and the week types (default the active one); More options (short code, colour, also counts toward). Save, Cancel and Escape (a confirmation first); Delete in edit mode names what goes. Switching to No time asks first. | Done | Browser checks at 1280 and 400 px, light and dark: add a habit, add a timed entry in two week types, edit with and without a change, No time with its confirmation, Sleep as an orphan, empty life area. Keyboard: Tab, Space on a chip, Enter saves, Escape closes and returns focus to the Edit button. |
| FR-ITEM-4 | One list. Week tab: "Activities and habits" with the timed chips and their hours, a Habits list for entries with no time, and "+ Add". Goals life area: one "Activities and habits" list under the hours bar; each row shows its days or frequency, its week types or "Not in a week type", and for a timed entry "N h planned of M h needed" (an orphan activity shows its hours a week); "+ Add" in view and edit mode with the life area preselected. The "link an activity" select, "Not linked", "Unlink activity" and the Planner add link are gone. An activity that only counts here through "also counts toward" keeps its Unlink. | Done | Browser checks: the Goals list and the Week list at 1280 and 400 px; the category bar still reads 1.8 h over and the rows add up to it. Screenshots `spec/screens/unified-*`. |
| FR-ITEM-5 | A repaint reports where the hours went ("Added to A and B: 3 x 1 h. Replaced 6 h of Exercise.") under the list, with Undo for 8 s that restores every week type the save touched, in one step. | Done | `app/composables/useEntryResult.ts`; browser check: repaint, Undo, the line goes. Undo restores hours only: a removed activity is not brought back (No time asks first). |

### Sleep (FR-SLEEP, feat/sleep-default, 2026-10-28)

Sleep is the activity whose short code is SLP. It is an ordinary activity record with its hours in the week types, so the stored shape is unchanged (storage version 8, no new field, no migration). The visibility choice is a browser key, `timely.showSleep`, outside the planner state. The guided tour's Plan card says one sentence about it (FR-ONB). Pure rules: `app/utils/sleep.ts`.

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| FR-SLEEP-1 | Key. The activity whose short code is SLP is the Sleep activity. Its code is read-only in its form; no other activity may take SLP (validation, the default code and the free-code search all skip it). An activity named Sleep with another code is not the Sleep activity and is left alone. | Done | `isSleepActivity`, `sleepActivityId` in `app/utils/sleep.ts`; `validateActivityFields` in `app/utils/planner.ts`; `shortCodeFor` and `freeShortCode`. tsx checks: a lowercase SLP is refused for other activities, the Sleep activity cannot change its code, "Slp" gives SL, a renamed SLP activity is still matched. |
| FR-SLEEP-2 | Default and set-up. New users (Start empty and the guided build), the seed and every new week type have Sleep from 10 PM to 7 AM every night (9 h a night, 63 h a week). Empty and presets paint it; a copy keeps what it copies; presets use the same night. A save with no SLP activity shows "Set up sleep" in Week, which creates the Sleep activity (Physical, colour quiet purple) and paints the night into the active week type, with Undo. Existing saves are not migrated otherwise. Reset my data creates the default again. | Done | `createOnboardingState`, `createSeedTemplate` and the other seed week types, `newWeekSlots` and `setupSleep` in the store. tsx checks: default 63 h, the seed week types, the guided build keeps Sleep. Browser: a fresh save shows "Sleep 10 PM to 7 AM 63h"; a save without sleep shows "Set up sleep", which paints the night and shows its result. |
| FR-SLEEP-3 | Built in. The Sleep activity cannot be deleted: its form has no Delete and says "Sleep is built in; hide it instead." Its name, colour and life area stay editable (life area Physical by default). | Done | `ActivityForm.vue` (`isSleep`); `removeActivity` refuses it. |
| FR-SLEEP-4 | Show sleep. One preference, off by default, for Home, Week and Insights: a "Show sleep" / "Hide sleep" button with `aria-pressed`. It is kept in `localStorage` (`timely.showSleep`), read after mount so the first render matches the server, and shared by the three screens. Outline button in all three (2026-10-28); in Insights it sits in the chart header. Storage blocked: it stays off for the visit. | Done | `app/composables/useShowSleep.ts`, `app/components/SleepToggle.vue`. Browser: Show sleep survives a reload (pressed, 24 rows). |
| FR-SLEEP-5 | Editor. The Week tab's "Sleep" row (always listed, above the other chips) opens the Sleep form: name, life area and colour, and the editor for the active week type. "Same every night" or "Weekdays and weekend" (Mon-Fri nights and Sat-Sun nights), each with bedtime and wake-up (12 AM to 11 PM). A bedtime after the wake-up crosses midnight (Sunday's night ends on Monday in the same week); a wake-up after the bedtime the same day paints inside the day; equal hours are refused. It shows the total ("9 h a night, 63 h a week") and the nights ("Mon 10 PM to Tue 7 AM"). Save clears the week type's Sleep hours and paints the nights over whatever holds them, with a result line ("Sleep set to 10 PM to 6 AM." or "... on weekdays and 1 PM to 3 PM at weekends.", plus "Replaced 1 h of X.") and Undo. The current values are read back from the painted hours (most common window per group). | Done | `app/components/planner/SleepEditor.vue`, `setSleep` in the store, `paintSleep`, `readSleep` in `app/utils/sleep.ts`. tsx checks (15): paint, read, wrap from Sunday to Monday, same-day window, refused equal hours, 24-hour and midnight cases, replacement counts. Browser: 10 PM to 6 AM saved and undone; the weekend nap saved with "Replaced 1 h of Learning and 1 h of Family time." (`spec/screens/sleep-editor-1280.png`). |
| FR-SLEEP-6 | Week grid. With sleep hidden (the default), hour rows that are sleep on all seven days collapse: by default 12 AM to 7 AM and 10 PM to 12 AM, so 15 of 24 rows show. Each collapsed run is a band: the leading and trailing runs sit above and below the grid ("Sleep hidden: 12 AM to 7 AM", clickable to show sleep); a run between shown rows is a thin band. The axis labels follow the shown rows. A selection, drag or edge handle never crosses a collapsed run. Day totals and "N h planned, sleep hidden" leave sleep out. Painting onto hidden sleep in a shown row replaces it, and the result says "Replaced N h of Sleep." Clear keeps hidden sleep. The Apply menu lists Sleep only when it is shown. Show sleep restores the 24 rows, and a selection survives it. | Done | `ActivityGrid.vue` (`collapsed`, `flow`, `hourTop`, `bandOf`, `edgeHourAt`). Browser: at 1280 px, 15 rows hidden and 24 shown; at 400 px, 15 rows hidden, no overflow (`spec/screens/sleep-week-1280-hidden.png`, `sleep-week-1280-shown.png`, `sleep-week-400-hidden.png`); painting Saturday 1 PM over the visible nap reports "Replaced 1 h of Sleep."; Undo restores the total. |
| FR-SLEEP-7 | Goals and Insights. Sleep never counts toward a life area's comparison, even when a habit links it or it lists a secondary area, and it is not listed in a life area's Activities and habits or counted there. Insights, sleep hidden: its hours are not planned and are taken out of the available time of each bar (available = days times 24 less the sleep hours of the weeks in the bar), so the reference line is the time actually free; the shares add up to 100. Sleep shown: it counts under its life area, Physical, and the note under the chart says so; the note is shown only while sleep is shown (2026-10-28). | Done | `comparedActivityIds`, `habitAlignment` in `app/utils/planner.ts`; `insightsBars(..., showSleep)` and `weekSleepHours` in `app/utils/insights.ts`; `CategoryDetail.vue` and `HaradaView.vue` (empty-area test). tsx checks: capacity less 63 h per week, and less the sleep hours for the year, quarter, month and week granularities; shares add to 100 with and without sleep. Browser (seed): Physical 9% hidden, 49% shown. |
| FR-SLEEP-8 | Home. With sleep hidden, the bar spans only the hours between the day's leading and trailing sleep: those hours are left off the bar, the axis labels sit on the shown span and its two ends are labelled. Sleep between them, such as a nap, stays as unplanned segments. The day's rows leave sleep out; shown, the bar has all 24 hours and the rows are as before. Home has no planned-hours total in its header, so none is labelled. | Done (2026-10-28, edge trim) | `dayRange`, `dayBlocks` and `dayHours` in `app/utils/home.ts`; `HomeView.vue`. Browser at 1280 and 400 px (seed, a Wednesday): 15 segments with labels 7h and 22h while hidden; 24 segments with 9h, 12h, 18h and 22h when shown; no overflow. |

Known limits: the collapsed bands between shown rows carry a tooltip rather than text; a bedtime of 12 AM reads back as a window within the day; Undo of "Set up sleep" puts the hours back and keeps the Sleep activity; the Sleep editor works on the active week type only and needs an hourly week type.

## 10. Non-functional requirements

| Area | Requirement | Status |
| --- | --- | --- |
| Local-first | Default mode: no backend data store or API; the only external request is the Google Fonts stylesheet. Optional Supabase mode (FR-APP-9, 10) stores the snapshot in the owner's Supabase project. | Met (default) |
| Privacy | Default mode: no personal data leaves the browser; journal text stays local. In Supabase mode the planner state (journal included) and the account email are stored in the Supabase project under row level security. | Met (default) |
| Performance | Derived values recomputed in memory. Home Month walks at most 31 days; the year chart at most 53 weeks. | Met (not benchmarked) |
| Build quality | `npm run build` clean; `npx nuxi typecheck` at 0 errors. | Required on every change |
| Responsive | Usable at 400 px; no page-level horizontal scroll. Only the year grid and charts may scroll, each in its own container. The activity grid must fit 400 px. | Met today; required for v3 |
| Themes | Light and dark from the same tokens. | Required for v3 screens |
| Accessibility | `frontend-design.md` section 6. New in v3: keyboard-operable activity grid (FR-PLAN-19), named Edit buttons, `aria-controls` and `tabpanel` on tabs. | Partial; required for v3 |
| Testing | Unit tests for date logic and projections (FR-DATE-1 to 3, section 17) before Home ships; screenshots per `frontend-design.md` section 9. | Gap |

---

## 11. UX concept

### 11.1 Navigation

Sticky topbar: `timely`, the tabs, and the account avatar. Its Account menu holds the account, the save status, the Dark mode switch, Replay tour, Reset my data and Sign out (2026-10-28 changelog).

1. **Home**: today, this week, this month; a small journal card (experiment).
2. **Goals**: why. Vision, Harada map, categories, goals, habits.
3. **Planner**: when. Activities, their hours, templates, the year.
4. **Insights**: the picture. Read-only charts.

Tab, selection and edit mode live in the route query (FR-UX-5), so Edit links and the browser Back button work.

### 11.2 Edit pattern

Default: **inline edit mode on the owning screen.** The detail pane of the selected item swaps its read-only content for a form in place; the Edit button becomes Done. Habits inside a category detail, the vision statement and the journal note edit inline the same way, one item at a time.

From a screen that does not own the item (Home, Insights, or a cross-link such as a habit's linked activity), Edit **navigates** to the owning screen with the item selected and in edit mode (FR-UX-4).

Why: one editor per object keeps "see only once" true; the style has no dialog component and avoids modal focus traps; a pane beside the list keeps context on desktop and becomes a stacked page on phones; it reuses today's controls (`AutoTextarea`, `.timely-input`, palette popover). No drawers or dialogs.

Rules: edits apply at once (FR-UX-6); Done or Escape leaves edit mode; selecting another item leaves edit mode; destructive actions and hour reassignment confirm inline (FR-UX-7, FR-PLAN-18).

### 11.3 See-only-once matrix

| Information | Primary place (shown in full, edited) | Derived elsewhere (read-only) |
| --- | --- | --- |
| Ambition | Goals, vision section | Harada map centre; Home key message |
| Category name, colour, order | Goals category detail (edit mode) | Harada map cell (order, name, colour); list row; dots and labels everywhere |
| 5-year goal, 1-year target | Goals category detail | Home key message (one target per day) |
| "To define" flag | Goals category detail | Harada map cell only |
| Activity and habit counts | Goals list row | none |
| Habits (name, frequency, minutes, link) | Goals detail, habit rows | Planner activity detail: names of linked habits, linking to Goals |
| Activity name, code, category, colour | Planner activity detail | Home rows, Goals detail activity list, chart legends; with Edit or link to Planner |
| Schedule (which hours) | Planner activity grid (active template) | Home Day blocks; Planner template overview |
| Templates and week assignment | Planner template bar and year grid | Home header (template names); Insights lighter bars for unassigned weeks |
| Projected hours for a day, week, month | Home | none |
| Hours per week per activity | Planner activity list | Goals detail activity list |
| Year totals, projections over years | Insights | none |
| Goals vs. planned (coverage, flags) | Goals category detail | Insights overview (all categories); Home one-line signal; "Below target" in the Goals list |
| Journal note of a day | Home journal card | none |

Two different questions, never mixed: Home and Insights count an activity in **its own category** (`categoryId`); goals vs. planned counts it for **the first category by order whose habits link it** (section 17).

### 11.4 Home

Purpose: what does my plan give today, this week, this month, and to which life areas.

```text
Home                                         [ Day | Week | Month ]
Sunday 25 October 2026 · Week 43 · Standard Week
16 h planned · 8 h unplanned · of 24 h
[######## Physical ####### Professional ### Cognitive ......]
 o Physical 9 h 38%   o Professional 4 h 17%   o Cognitive 3 h 13% ...
Today
  12AM-7AM   Sleep       o Physical       7 h          [Edit]
  9AM-12PM   Deep Work   o Professional   3 h   Now    [Edit]
2 categories below their habit target. View in Goals
--------------------------------------------------------------------
Journal (experiment)
  "Best father, husband, son and brother..." · Physical: 3 workouts a week
  Today's note: ...                                          [Edit]
  Readings: docs and notes to revisit will live here.
```

- View mode only, except the journal note. Edit buttons on activities navigate (11.2); category legend items link to Goals.
- Week and Month replace the "Today" timeline with an activity list sorted by hours (activity, category, hours, percent).
- Empty states: FR-HOME-10; empty note shows "Write today's note".
- 400 px: selector full width; bar full width; legend wraps; each row puts the time range on its own line above name, category and hours; Edit stays at the row end; journal card last.

### 11.5 Goals

Purpose: why. Vision, the Harada picture, then categories with goals, targets and habits.

```text
Vision, 5 years                                                [Edit]
Best father, husband, son and brother - CDO / CIO within 5 years
--------------------------------------------------------------------
[01 Physical ] [02 Spiritual] [03 Relational]
[04 Economic ] [  Ambition  ] [05 Cognitive ]      read-only map;
[06 Social   ] [07 Profess. ] [08 Environ.  ]      click selects
--------------------------------------------------------------------
Categories                 | 07 Professional                    [Edit]
01 o Physical     2 · 8    | 5-year goal   ...
02 o Spiritual    0 · 8    | 1-year target ...
...                        | Goals vs. planned  [=======|---] 3 / 4.5 h
07 o Professional 2 · 9    |   in Standard Week · 40 h in total
[+ Add category]           | Habits (9)                     [+ Add habit]
                           |   Deep focus block · 5 a week, 120 min
                           |   · Deep Work                     [Edit]
                           | Activities (2)              [+ Add activity]
                           |   Deep Work  40 h/wk              [Edit]
```

- Grid cells carry only order, name, colour and "To define"; list rows carry name, colour and counts; everything else is in the detail.
- View mode: the detail above. Category Edit shows name, colour, goal and target fields, "to define", move up and down, Remove. Habit Edit opens that row's inline form. Activities are read-only here; Edit and "Add activity" go to Planner.
- Empty states: no categories, "No goals yet. Start from the starter grid and adapt it." with "Load starter grid"; no habits, "No habits yet for this category."
- 400 px: vision on top; the map in two columns with the ambition first (today's 600 px rule); then the list; selecting a category shows the detail full width with "Back to list" (FR-UX-8).

### 11.6 Planner

Purpose: when. Activities, their hours in the week, templates and the year.

```text
Template (o Standard Week 137h) (o Deep Work Week) (o Vacation) [+ New]
Design your ideal week, hour by hour.
----------------------------------------------------------------------
Week, Standard Week: 137 of 168 h
  Mon  Tue  Wed ...           (x clears the day)
  12AM  free  | Deep Work |
  ...   drag down a column to select a run
  [Mon 9AM - 12PM  3h   Apply... | Edit | Delete | Cancel]   (action bar)
  Deep Work set on Mon 9AM - 12PM.  [Undo]
----------------------------------------------------------------------
Activities  (o Deep Work 40h) (o Training 5h) ... [+ Add activity]
  selected: colour, name, code, category, linked habits   [Edit]
> Year 2026 [<] [>]   Paint: (Standard) (Deep Work) (Vacation) (Erase)
  [53-week grid, quarter rows, full width]        50 of 53 weeks assigned
```

- No activity selected: the grid is the template overview (FR-PLAN-20).
- Week grid (FR-PLAN-23, restored 2026-10-26, the original interaction): drag down one day column to select a run of hours. Releasing opens the action bar beside the pointer with Apply (Change when the run holds hours), Edit, Delete and Cancel. Apply opens the activity menu, which lists hours a week per activity and ends with Clear these hours; the choice overwrites the run.
- A click or tap on a painted hour selects its whole block; a tap on an empty hour selects that hour. Hovering a block shows its delete button; the cross in a day's header clears that day.
- Edit puts two handles on the run and a Save and Cancel pair in its corner. Save clears the old run and applies the activity to the new one; Cancel restores the run. An empty run cannot be edited.
- Touch only taps, so the page keeps scrolling. Keyboard: one tab stop; arrows move; Shift with arrows selects a run in one day; Enter or Space opens the bar; Escape closes it.
- Undo: one step, shown under the grid for about 8 seconds after a change that alters hours. There is no edit-mode gate: the grid is always editable for an hourly template. Erase is a paint tool in the year painter only.
- Activities (FR-PLAN-24): compact chips under the week with hours a week. Selecting one shows its detail; Edit opens the editor (`edit=1`).
- No brush: the grid is the template overview and a click on a coloured hour selects its activity (URL `item`), FR-PLAN-20. Selecting an activity highlights its hours and mutes the rest.
- Activity fields are edited inline from the selected row of the Activities list (Edit, `edit=1`); Delete sits at the end of that editor with an inline confirmation (FR-PLAN-16).
- Template Edit: name, colour, Delete (inline confirmation). "+ New" creates a template and opens it in edit mode.
- Empty state: "No activities yet. Add one to plan when it happens." with the add form.
- 400 px: the week grid is a frame of at least 540 px that scrolls sideways inside its own container, so the page never does; Activities chips wrap; the year grid keeps its own scroll container.

### 11.7 Insights (formerly Visualization)

Superseded in part by 9.11 (FR-INS-1 to FR-INS-3). The goals-vs-planned overview and key insights described here are removed; the planned-hours chart and category shares replace them.

Purpose: the picture, read-only.

```text
Year 2026 [<] [>]                               Horizon [ 5 years v ]
[ planned h this year ] [ h/d in leading category ] [ top projection ]
Goals vs. planned       (all categories; rows link to Goals)
Week by week   [Monthly | Weekly]   (All) (Physical) (Professional) ...
  [stacked bars; unassigned weeks lighter; current week marked]
Year by category        Physical 2,912 h 42% ...
Projection over 5 years
  Professional  Deep Work 10,400 h · Weekly Planning 520 h
```

- No edit mode. Rows and legend items link to the owning screen in view mode.
- Empty state: "Nothing planned yet." with a link to Planner.
- 400 px: metrics stack; Monthly by default; charts scroll inside `.chart-scroll`.

### 11.8 Mapping: old Insights and Configuration to v3

| Old element | New location |
| --- | --- |
| Insights: goals-vs-planned rows (bar, tick, figures, total) | Goals category detail (primary); Insights overview; Home one-line signal |
| Insights: flags "No target yet", "No time planned", "n habits not linked" | Goals detail; "Below target" in the Goals list |
| Insights metric: allocated hours per week (active template) | Planner template chip and overview ("n of 168") |
| Insights metric: top projected activity | Insights metrics, plus the full projection list (FR-VIZ-5) |
| Insights metric: unassigned hours per week | Home "unplanned" total for the selected period |
| Insights metric: daily average of the leading category | Insights metrics (selected year) |
| Insights: "n of 52 weeks assigned" | Planner year grid only |
| Insights: week-by-week chart, Monthly/Weekly, focus chips, legend | Insights (FR-VIZ-3) |
| Insights: breakdown by category (active template) | Home bar and legend (period); Insights year by category |
| Configuration: category list, add, rename, recolour, reorder, remove | Goals list and category edit mode |
| Configuration: category h/wk and h/yr | Goals detail (h/wk); Insights year by category (h/yr) |
| Configuration: activity list, add, delete | Planner activity list and edit mode |
| Configuration: projection horizon | Insights projection |
| Configuration: "only eight in Goals" note | Goals list (FR-GOALS-21) |
| Goals: ambition box above the grid | Goals vision section |
| Goals: tabbed category panel | Goals category detail |
| Planner: drag-select week grid, action bar, resize | Activity grid and template overview (Q1) |

---

## 12. User flows

### Daily glance

1. Open the app: Home shows today's blocks, time per category and the journal card.
2. Switch to Week to see how the week splits across life areas.
3. Edit an activity: Planner opens in edit mode; Back returns to Home.

### First run

1. A new user (nothing saved) sees Welcome over an empty Home. Guide me shows a short intro (FR-ONB-9), then the guided path: 1 Your ambition, 2 Goals and habits (one or two life areas, each with a habit), then the build. Three tour cards follow: 3 Plan your week, 4 Insights, 5 Daily follow-up. Start empty and Explore with sample data skip it (FR-ONB-1 to 7). An existing save opens as before.
2. Goals: edit the vision, then each category's goals, target and habits.
3. Goals detail: "Add activity" for a life area that needs time; Planner opens with the category preset.
4. Planner: name the activity and paint its hours.
5. Goals: open a habit's Edit, set minutes and link the activity.
6. Planner: create a Vacation template and paint vacation weeks in the year grid.

### Weekly review

1. Home shows "2 categories below their habit target"; follow the link.
2. Goals detail shows the short bar and the linked activity; follow Edit to Planner.
3. Paint more hours; the Goals bar and Home update at once.

---

## 13. Information architecture

```text
PlannerState (localStorage key "timely-planner-state")
├── version                    PLANNER_STATE_VERSION (5; bump to 6 in slice 0, 7 with the journal)
├── settings
│   ├── timeGranularity        60 | 30 (only 60 is used)
│   ├── activeTemplateId       edited template; fallback for unassigned weeks
│   └── projectionDefaults     { years }
├── ambition                   { id, statement, horizonYears } | null
├── categories[]               life areas, ordered (category = dimension)
├── habits[]                   belong to a category, may link an activity
├── activities[]               belong to a category
├── templates[]                168-slot weeks
├── appliedWeeks[]             a template assigned to an ISO week (Monday date)
└── journal{}                  experiment: date key (YYYY-MM-DD) to note text; blank notes are removed

Separate key: "timely.dark"
Route query (not stored): tab, category | activity, edit
View state (not stored): Home period, Insights year and chart mode
Derived, never stored: today, effective templates, totals, alignments, projections, key message
```

---

## 14. Data model

Source: `app/types/planner.ts`. Category and dimension are one record **(decided)**; the UI says "category" only. The screen restructure needs **no change to the stored shape**; the only addition is the journal experiment.

```ts
type HabitPeriod = "day" | "week" | "month"
interface Category { id; name; color?; order; goal5y?; target1y?; targetTbd? }
interface Activity { id; name; shortCode; categoryId; color }  // colour owned by the activity (FR-PLAN-21)
interface Habit { id; categoryId; name; frequency: { count; period }; activityId?; minutesPerOccurrence? }
interface Ambition { id; statement; horizonYears }
interface WeekTemplate { id; name; description?; granularityMinutes: 60 | 30; slots: string[]; color? }
interface AppliedWeek { id; startDate /* Monday */; templateId }
interface PlannerState { version; settings; categories; activities; templates; appliedWeeks; ambition; habits; journal }
```

- `journal: Record<string, string>` (slice 6, version 7): the key is the local date (`YYYY-MM-DD`, from `localDateKey`), the value the note as typed. `isPlannerState` checks it is an object whose values are strings; a blank note removes its key. Habit check-ins add no data (not part of the experiment).
- `PLANNER_STATE_VERSION` is 6 (done in slice 0), so dev saves reseed with weeks of the current year.
- Done in slice 0 (Q5): week status removed: `status`, `overrides`, `notes` and `excludedWeekStatuses` are gone; version bumped.

Integrity rules (store actions in `app/stores/planner.ts`):

- Removing a category with content requires a target category; its activities and habits move there.
- Removing an activity clears its slots in every template and unlinks its habits.
- Removing a template removes its applied weeks; the last template cannot be removed.
- A slot holds at most one activity; reassigning a taken hour needs explicit acceptance (FR-PLAN-18).
- v3 change: recolouring a category recolours only activities still using its previous colour.
- New actions: `updateActivity`, `setActivityHours(activityId, slotIndexes, mode)` returning taken hours, `reassignHours(activityId, slotIndexes)`, `updateTemplate`, `setJournalEntry(dateKey, text)` (a blank text removes the entry; slice 6).

Seed (`createInitialState`): ambition; 8 categories (Physical, Spiritual, Relational & emotional, Economic, Cognitive, Social, Professional, Environment) with goals and targets, five flagged "to define"; 65 habits, 7 linked with minutes; 9 activities (none for Economic and Social); 3 templates (Standard Week 137 h active, Deep Work Week, Vacation); applied weeks today 49 of 52 in 2026, in v3 the same pattern over the current year's ISO weeks (FR-DATE-4); empty journal.

---

## 15. Technical design

Stack unchanged: Nuxt 4 (SSR, Nitro), Vue 3, TypeScript, Pinia (one store), Vuetify for a few controls, hand-written CSS tokens, inline SVG charts.

```text
app/app.vue                              shell, topbar, tabs (Home, Goals, Planner, Insights)
app/pages/index.vue                      reads tab and selection from the route query
app/components/home/HomeView.vue         new; JournalCard.vue (experiment)
app/components/harada/                   GoalsView (vision, map, list, detail), HabitList (view/edit rows)
app/components/planner/PlannerView.vue   template bar, activity list and detail, year grid
app/components/planner/ActivityGrid.vue  new 24x7 grid (overview, view, edit, keyboard)
app/components/insights/InsightsView.vue charts moved from InsightsView
app/utils/dates.ts                       new: ISO weeks, weeks of a year, Monday of a date, local date key
app/utils/planner.ts                     seed, validation, effective template, period and year totals
```

Persistence unchanged (load, validate, patch, write back, deep-watch save; versioned reset, no migrations), minus the `ensureDefaultWeek` call. Unit tests need a runner (for example Vitest); adding it is a dependency change the owner must approve.

---

## 16. Key decisions

1. **Local-first persistence**, no backend, no accounts.
2. **Template plus applied week**, kept for variations such as vacation weeks **(decided)**.
3. **Slot storage**; v3 authoring is per activity in the activity grid, editing the active template **(decided)**.
4. **Derived analytics in memory**; nothing derived is stored.
5. **One list of categories; category = dimension** **(decided)**.
6. **Categories managed in Goals, activities in Planner** **(decided)**.
7. **Like with like** in goals vs. planned; each activity counts once.
8. **Versioned reset instead of migrations** while in development.
9. **Inline SVG charts.**
10. **Four screens, Home default; Insights and Configuration removed** **(decided)**.
11. **See only once, see then edit, see only what you need** as binding rules **(decided)**.
12. **Harada map kept** as a read-only visual in Goals; the ambition is edited in the vision section **(decided)**.
13. **Taken hours are reassigned only after explicit acceptance** **(decided)**.
14. **Journal on Home as a minimal experiment** **(decided)**; habit check-ins and AI or dictation are ideas only.
15. **Inline edit on the owning screen; navigation from elsewhere** (11.2). Proposed.

---

## 17. Core computation logic

Source: `app/utils/planner.ts`, store getters, new `app/utils/dates.ts`.

1. **Template totals.** Each non-empty slot adds one hour to its activity; activity totals roll up to the activity's category. Slots pointing at a missing activity are ignored.
2. **Effective template of a date** (FR-DATE-2): applied week of the date's Monday, else the active template.
3. **Home Day:** the 24 slots of the date's weekday in its effective template.
4. **Home Week:** the 168 slots of the effective template of the current ISO week (Monday to Sunday, even across a month boundary).
5. **Home Month (calendar-day rule):** the sum over every calendar day of the month of that day's Day figure; weeks that straddle months are split by day. Period hours = days x 24.
6. **Habit weekly occurrences.** day: `count x 7`; week: `count`; month: `count x 12 / 52`.
7. **Habit target per category.** Sum over habits with minutes of `weekly occurrences x minutesPerOccurrence`.
8. **Habit-linked scheduled time per category:** categories walked by `order`; each takes the distinct activities its habits link to, skipping those already claimed, and sums their scheduled minutes **in the active template**.
9. **Coverage.** `linked / target` when the target is above 0, else "No target yet". "Below target" and Home's signal mean coverage below 1.
10. **Year figures:** for each ISO week of the selected year, the category totals of its effective template. Monthly view: average per week of the weeks starting in the month. Week status and overrides no longer exist (Q5).
11. **Projection over N years:** per activity, the selected year's total (rule 10) x N. Replaces today's rule (active template x 52 x N, with an exclusion count that is always 0).
12. **Key message (journal):** ambition statement plus one category's target: categories in order that have a 1-year target (not "To define"), else their 5-year goal; the day of the year (0 on 1 January) modulo the count k picks the category. Pure function in `app/utils/journal.ts`; nothing stored.

---

## 18. Success criteria

| Criterion | Measure |
| --- | --- |
| Goals and plan are connected | With the owner's data, every category with a goal has at least one habit with minutes linked to an activity. |
| The plan covers the habits | In each targeted category, linked scheduled time reaches the habit target. |
| Daily use | The owner opens Home on most days for a month; the journal experiment is judged on whether notes get written. |
| Fast adjustment | From Home, changing an activity's hours takes 3 interactions or fewer (Edit, paint, Back). |
| See only once | A walk through the four screens finds no fact editable in two places. |
| Quality bar | Build clean, typecheck 0 errors, no console errors, no page-level horizontal overflow at 400 and 1280 px, light and dark; reload keeps every edit. |

---

## 19. Scope

**Shipped (v2):** Goals grid with ambition, goals, targets and measurable habits; drag-select week grid; template switcher; 2026 year painter; Insights; Configuration; light and dark themes; versioned `localStorage`.

**v3:** date and year foundation; four-screen navigation with URL state; Home; Goals with vision, Harada map, list and detail in view and edit modes; Planner activity list, detail, editing and the keyboard-operable activity grid; Visualization with full projections; removal of Insights and Configuration; journal card experiment last.

**Not in v3:** export and import, week status, weekday chart, template comparison, habit check-ins, AI or dictation, tests beyond the date and projection tests.

---

## 20. Impact on the existing build

| Action | Item | Note |
| --- | --- | --- |
| Remove | Insights tab, `InsightsView.vue` | Chart code moves to Visualization first. |
| Remove | Configuration tab, `LegendView.vue` | Category row markup and remove flow move to Goals; activity form to Planner. |
| Remove | Goals tabbed panel and ambition box (`HaradaView.vue`) | The 3x3 grid stays, read-only. |
| Remove | Drag-select grid, action bar, resize handles, activity picker (`PlannerView.vue`) | Decided (Q1). |
| Remove | `WEEK_DATES_2026`, `CURRENT_WEEK_INDEX`, `ensureDefaultWeek`, template `confirm()` | FR-DATE-4, FR-DATE-5, FR-UX-7. |
| Move | Category list; activity list and form; charts, projection, horizon; goals-vs-planned rows | To Goals; Planner; Visualization; Goals detail and Visualization. |
| Reuse | `AutoTextarea`, tokens, `.cat-row`, `.chip`, `.segmented`, palette popover, Harada grid CSS, `slotsToBlocks`, `categoryAlignments`, `aggregateTemplate*`, year painter, SVG chart code, seed | |
| Add | `HomeView`, `JournalCard`, `ActivityGrid`, `dates.ts`, store actions (14), route-query sync | |
| Update | `spec/frontend-design.md` component catalogue (4.9 to 4.13), breakpoints, screenshots | When each screen ships. |

Implementation order (each slice ships alone, build and typecheck clean):

| Slice | Content | Size |
| --- | --- | --- |
| 0 | Dates: `dates.ts`, effective template, ISO weeks per year with a year switcher in the existing year grid and chart, real current-week marker, seed weeks of the current year, remove `ensureDefaultWeek`, version 6, date tests. | M |
| 1 | Shell: tabs Home (placeholder), Goals, Planner, Visualization; route-query state; Visualization from InsightsView plus horizon, full projections, year by category, goals overview. Configuration reachable until slice 3. | M |
| 2 | Planner: activity list, detail, edit, `ActivityGrid` (overview, paint, reassign with acceptance, keyboard); template Edit with inline delete; activities removed from Configuration. | L |
| 3 | Goals: vision section, read-only Harada map, category list, detail, edit, habit rows; Configuration removed. | M-L |
| 4 | Home: Day, Week, Month, bar, totals, Edit links, goals signal, client-only date rendering, hydration fix. | M |
| 5 | Cleanup: remove the old week grid (Q1), dead CSS; update `frontend-design.md` and screenshots. | S |
| 6 | Journal experiment: `journal` in the state (version bump), journal card with today's note, key message, readings placeholder. | S |

---

## 21. Backlog and roadmap

### Next (after v3)

| Item | Rationale |
| --- | --- |
| JSON export, import and reset in a topbar "Data" menu | The only safeguard against lost browser data. Validate imports with `isPlannerState`. |
| Duplicate a template | Fastest way to build a vacation or deep-work variation. |
| Activities for Economic and Social; link more seed habits | Keeps Home and Goals meaningful for all eight categories. |
| Touch painting and keyboard for the year grid | The activity grid is accessible in v3; the year grid stays mouse-only. |

### Later

| Item | Rationale |
| --- | --- |
| Week status (vacation, off) or its removal | Q5. |
| Home previous and next period | Look at tomorrow or next week (Q4). |
| Weekday distribution and template comparison in Visualization | Original requirements. |
| Copy day, clear week | Editing shortcuts. |
| Quarterly and yearly habit periods | Removes the monthly approximation. |
| Unit tests for all pure functions; follow the OS theme; 30-minute slots | Quality and comfort. |

### Ideas (not specified; do not build)

| Idea | One line |
| --- | --- |
| Habit check-ins on Home | Tick today's habits; reopened as an idea only if the journal experiment proves useful. |
| Readings to review | A short list of documents or readings attached to goals. |
| Journal by dictation | Speak the daily note instead of typing it. |
| Journal streaks | Count days in a row with a note; reopened only if the experiment proves useful. |
| Journal reminders | A quiet nudge to write the day's note. Needs a permission and a clock; not in the experiment. |
| Journal export | Save the notes as a file (belongs with FR-APP-5). |
| Journal with an AI | Talk through the day with an assistant. Not a dependency of the product. |

### Explicitly dropped

| Item | Rationale |
| --- | --- |
| Recurring-block builder form | The activity grid covers it. |
| Insights and Configuration tabs; templates in Configuration; a separate "dimension" | Decided by the owner. |
| Chart library | Inline SVG is enough. |
| Accounts, cloud sync, multi-user, calendar integration | Out of scope. |
| Data migrations while in development | Versioned reset is simpler. |

Habit completion tracking moves from Dropped to Ideas, reopened only as an experiment.

v2 gaps and where they went: weekday view (Later); week status UI (Q5); grid keyboard access (activity grid FR-PLAN-19 in v3; year grid Next); year fixed to 2026 (FR-DATE-3); activity delete confirmation (FR-UX-7); activity editing (FR-PLAN-16); cross-category habit links (FR-GOALS-22, Q6); hydration warning (FR-DATE-6, before Home); annual and quarterly habits (Later); multi-day apply (FR-PLAN-17).

---

## 22. Document history

| Date | Change |
| --- | --- |
| 2026-04-15 | Original PRD and design document (v1 plan). |
| 2026-10-25 | v2: rewritten to describe the built product (Goals, Planner, Insights, Configuration) with requirement IDs and statuses. |
| 2026-10-27 | First-run onboarding (`feat/onboarding`): Welcome, a short form that builds a first life area, habit, activity and week, and a skippable five-step tour; an optional `onboarding` field in the state (version unchanged, 8). FR-ONB-1 to 8 (section 9.13): 6 Done, 2 Partial (no focus trap; a hydration warning on returning saves). |
| 2026-10-27 | Storage adapter: optional Supabase snapshot mode with email magic-link sign-in (FR-APP-9 and 10); NFR Local-first and Privacy qualified for the optional mode. |
| 2026-10-27 | Email magic-link sign-in removed (`feat/remove-email-link`): Google is the only sign-in, because Supabase's built-in email sender allows about 2 emails an hour and delivers only to team addresses. FR-APP-10 updated; the login card has one button and error text; `signIn` removed from `useAuth`; setup in `spec/database/README.md`. Storage version unchanged (8). |
| 2026-10-28 | Sleep follow-ups (`fix/sleep-followups`, not pushed): Home bar leaves out the day's edge sleep while hidden (FR-SLEEP-8); Show sleep and Hide sleep are outline buttons (FR-SLEEP-4); Insights headline removed, the chart header holds the available-time key and the toggle, sleep note only while shown (FR-INS-4, FR-INS-P1 removed, FR-SLEEP-7); Goals bars captioned Needed and Planned (FR-GOALS-P1). No data change; version stays 8. |
| 2026-10-28 | Sleep as a default (`feat/sleep-default`, not pushed): the activity with code SLP is Sleep (FR-SLEEP-1 to 8): locked key, built in, default 10 PM to 7 AM in every new planner, set up in existing saves ("Set up sleep"), an editor per week type, one Show sleep preference in Home, Week and Insights, collapsed hour rows in the Week grid, and sleep kept out of Goals and of the Insights available time while hidden. No data model change: storage version unchanged (8), no new field, no migration. Checks: build clean, typecheck 0 errors, tsx checks (15 sleep helpers, 10 Insights capacity and share checks, 9 planner and onboarding rules), headless Edge at 1280 and 400 px, light and dark, no overflow, no console errors or warnings. |
| 2026-10-28 | Unified item form (`feat/unified-item-form`, not pushed): one form and one list for activities and habits (FR-ITEM-1 to 5); FR-GOALS-5 to 8, 18, 22 to 24 and FR-PLAN-14 to 16, 24 to 26 are changed as marked. Storage version unchanged (8). Checks: build clean, typecheck 0 errors, tsx checks, headless Edge at 1280 and 400 px, light and dark, no overflow, no console errors. |
| 2026-10-28 | Account avatar (`fix/ux-batch-5`, not pushed): the topbar shows one round avatar button in place of the "Account" text button, the save status text and the theme toggle. The avatar shows initials from the Google name or the email (`app/utils/account.ts`), or a person glyph in local mode. A dot on it shows while saving (quiet) or not saved (danger); the menu repeats the state in text. The menu holds the account header, the save status line, a Dark mode switch (`role="switch"`, the same `timely.dark` key), Replay tour, Reset my data and Sign out last. Escape returns focus to the avatar; on phones the panel takes focus (FR-UX-9). No storage change (version 8). Browser: 104 checks on the production build (local and Supabase against the fake server) at 1280 and 400 px, light and dark. |
| 2026-10-28 | Goals and Insights simplify (`feat/goals-insights-simplify`, from `main`, not pushed): a habit makes its own activity (FR-GOALS-24); empty life areas fold into one row and the list is the default Goals view (FR-GOALS-25); the Harada map is the Grid view from 1100 px behind a List / Grid toggle (FR-GOALS-26); the category detail order (FR-GOALS-27); Insights: Month and Week first, More options for the rest, a headline sentence, and unassigned weeks count the governing week type (FR-INS-P1 to P3; supersedes the 2026-10-26 rule in 23.1). Storage version unchanged (8). |
| 2026-10-28 | Week types (`feat/week-types`, stacked on `feat/ux-simplify`): a week type can start from a preset (Standard, Deep work, Light, Vacation) with its role mapping and kept habit hours (FR-TPL-8); time off is a mark that Goals reads around (`goalsTemplate`, FR-GOALS-16); Duplicate (FR-TPL-6); a Weeks row sets a range of weeks (FR-YEAR-7); "Schedule in the week" in the activity detail (FR-PLAN-25). Storage version unchanged (8); `kind` is optional. Checks: typecheck 0 errors, build clean, tsx checks, headless Edge at 1280 and 400 px, light and dark, no overflow; the console shows only the known hydration warning on returning saves. |
| 2026-10-28 | UX batch 5 (`fix/ux-batch-5`, from `main`, not pushed): the category detail reads 5-year goal, 1-year target, hours, habits, activities (FR-GOALS-27); Apply on a new run opens Edit range at once, with touch and arrow-key handles, and the Apply menu fits and scrolls on phones and short screens (FR-PLAN-23); "Schedule in the week" is a collapsible with Close and Escape (FR-PLAN-25); a panel opened on a phone or touch screen does not focus a text field, so the keyboard stays down (new FR-UX-9, `app/utils/focus.ts`). Storage version unchanged (8). |
| 2026-10-28 | Year and close (`fix/week-year-and-close`): the Year section exists with one week type too, collapsed by default (FR-YEAR-7; the one line "Every week of <year> uses <name>." sits inside it). Every week type and activity panel closes with Done, Cancel or Escape, and focus returns to the control that opened it (FR-PLAN-26, FR-TPL-9). No storage change (version 8). |
| 2026-10-28 | UX simplify (`feat/ux-simplify`): Goals titled "Goals" with "Ambition, N years" and a first-write prompt; "Categories" became "Life areas" and "Template" became "Week type" in the UI (code, routes and stored fields unchanged; the Planner tab is "Week", route `planner`). Start empty assigns the empty week type to every week of the year. Planner: the red delete in the bar removed, the year section closed by default and one line with one week type, the add-activity short code derived from the name. Topbar: no tab numerals; Tour moved to the Account menu as "Replay tour". Home header: date and ISO week only. Onboarding: Guide me goes straight to step 1, the intro is a Welcome link, the form steps read "of 2", the tour cards have no counter. No storage change (version 8). |
| 2026-10-27 | Intro (`feat/reset-and-intro`, FR-ONB-9): a five-scene SVG and CSS intro between Guide me and the form, and from the tour's last card. No stored state change (version 8).
| 2026-10-27 | Reset my data (`feat/reset-and-intro`, FR-ONB-10): Account menu in both modes, a confirmation dialog, the planner replaced by the empty onboarding state and saved at once (Supabase: the row, not the sign-in). Privacy Policy: planner erasure is self-service; account and email deletion stay by email. Storage version unchanged (8).
| 2026-10-27 | Guided path v2 (`feat/onboarding-flow-v2`): the order follows the owner's feedback. 1 Your ambition, 2 Goals and habits (one or two life areas with a habit each), then the build and the cards Plan your week, Insights and Daily follow-up (Goals has no card). The intro scenes are about 9 seconds each, with their captions inside the stage. FR-ONB-4 to 7 and 9 updated; FR-ONB-1 to 3, 8 and 10 unchanged. Storage version unchanged (8). |
| 2026-10-29 | Planned against needed moves to Insights (`feat/insights-plan-vs-need`, not pushed): Insights adds a compact status line to each life area in the Life areas list, over the range shown, in the chosen unit (FR-INS-P4, merged after the owner's review; no separate section); Goals keeps a yearly badge and a "See in Insights" link, and the habit lines show the need as a plain figure (FR-GOALS-P2); the weekly bars leave Goals (FR-GOALS-16, FR-GOALS-P1 superseded). Storage version unchanged (8). |
| 2026-10-27 | Sign-in page with the intro (`feat/onboarding-flow-v2`, FR-APP-11): a two-column hero from 900 px with the looping intro player on the right, one column on phones; the player is shared with the first-run dialog (`IntroPlayer.vue`, with `loop`); the footer shows on the sign-in page; the player holds on a hidden tab and off-screen. FR-APP-11 added; FR-APP-10, FR-ONB-9 and FR-LEGAL-4 updated. Storage version unchanged (8). |
| 2026-10-27 | Branch `feat/polish-v3` from `origin/main`, one commit per item: sign-in page as one centred column with the frameless intro (FR-APP-11); eight default life areas for new users and Start empty, and the guided step 2 picks one of them, the build fills only the chosen areas (FR-ONB-2, 4, 5, 6); activity short codes in the week grid blocks (FR-PLAN-17); full Goals targets that wrap, and the needed-and-planned bar replacing the outline and legend (FR-GOALS-16, 21); quiet "Not linked" (FR-GOALS-22); generic sample data, same ids and storage version 8. Checks: typecheck 0 errors, build clean, tsx checks (onboarding: 168 one-goal and 280 two-goal builds; seed validity and status mix), headless Edge at 1280 and 400 px, light and dark, no overflow, no console errors beyond the known hydration warning on returning saves. Open: the template bar's "+ New template" wraps and clips at 1280 px. |
| 2026-10-27 | Branch `feat/polish-v4` from `origin/main` (fe5082c), one commit per item: no product label above the sign-in headline (FR-APP-11); "+ Add habit" in view mode with a draft add form, `HabitForm.vue` shared with the edit form (FR-GOALS-23); the 5-year ambition wraps in full in step 1, on Goals and in the map centre (FR-ONB-11); the first-run dialog fits phone viewports and the caption band no longer clips (FR-ONB-12); the intro starts only on Play with a static first scene, and "Start with my ambition" is always shown in the dialog (FR-ONB-9, FR-APP-11). Storage version unchanged (8). |
| 2026-10-26 | Slice 6 (journal experiment): `journal` map in the state (version 7), Journal card last on Home with the key message and a Readings placeholder. FR-HOME-11 to 13 Done as an experiment; FR-HOME-1 Done. Deviations are listed in each row. Node checks and browser checks passed (see build-plan status log). |
| 2026-10-26 | Slice 4 (Home): period selector (Day, Week, Month), Day blocks, Week and Month activity rows, time per category, totals, goals signal, empty states. FR-HOME-1 to 10 with evidence (FR-HOME-1 and 10 Partial, 2 to 9 Done); journal items 11 to 13 stay for slice 6. |
| 2026-10-25 | v3: structure Home, Goals, Planner, Visualization; Insights and Configuration removed; UX rules (FR-UX); dates and years (FR-DATE); Home with a journal experiment, Goals with vision, Harada map and category detail, Planner activity grid with explicit reassignment, Visualization; see-only-once matrix; Insights mapping; impact and slices; assumptions and open questions. |

---

## 23. Decisions, assumptions and open questions

### 23.1 Decided by the owner

- Navigation Home, Goals, Planner, Visualization; Home default; Insights and Configuration removed.
- Categories edited in Goals, activities in Planner; category = dimension, shown once.
- Templates and the year grid stay in the Planner; the activity grid edits the active template.
- Home: read-only overview with Day, Week, Month and Edit buttons, plus a minimal journal card as an experiment (today's note, key message, readings placeholder). Dictation and AI are later ideas.
- Goals: vision section (ambition) first, then the read-only Harada map (ambition in the centre, eight categories around), then the category list with detail in view and edit modes.
- Painting is direct (owner decision, slice 7): the brush (selected activity or Erase) paints at once, with no edit mode gate and no reassign confirmation. Painting over other hours replaces them and shows an Undo notice (one step, about 8 seconds). This reverses FR-PLAN-17's edit gate and FR-PLAN-18's confirmation; overlaps stay impossible. Superseded on 2026-10-26 by the restored week grid (next bullet).
- Week grid restored to the original interaction (owner decision, 2026-10-26; branch `fix/restore-original-week-grid`, from `origin/main` with PRs #7 and #8 merged). Drag or tap to select hours, then apply, edit or clear them from the action bar and activity menu; resize handles; block and day clear; touch taps; one-step Undo; the keyboard path is kept. It supersedes the slice 7 brush palette (FR-PLAN-17 to 20 and 22). Activities move to a compact list under the week (FR-PLAN-24). The stored shape is unchanged; storage version stays 7.
- The Planner shows the week first: the grid beside an Activities palette on desktop, chips above the grid on phones; the Year grid is full width and collapsible (FR-PLAN-21). Superseded on 2026-10-26: the week grid is the original one and Activities is a compact list under it (FR-PLAN-23, 24). The year grid part still holds.
- Visualization is read-only.
- The drag-select week grid is retired (was Q1): the activity grid is the only schedule editor; with no activity selected it shows the whole template read-only. Superseded on 2026-10-26: the original drag-select week grid is back and is the schedule editor (FR-PLAN-23).
- Unassigned weeks count as the active template, drawn lighter in charts (was Q2). Insights follows the same rule since 2026-10-28 (see below).
- **Superseded 2026-10-28: Insights counts unassigned weeks** (owner agreed in the UX review; FR-INS-P3). An unassigned week counts the week type that governs it, its assigned one or else the active one, in every granularity, the categories list, the percentages and the tooltips, as Home, Planner and the Goals comparison do. Withdrawn rule (2026-10-26): an unassigned week counted zero planned hours (FR-INS-1, FR-INS-2 as first built). Its available time always counts. Under the withdrawn rule, seed Environment in 2026 was 124 h (Errands: 34 Standard weeks x 2 h + 4 Vacation weeks x 14 h). The "No weeks assigned yet" state and its link to the year grid are removed.
- **Decided 2026-10-29, planned against needed (`feat/insights-plan-vs-need`):** the comparison of what the habits ask for with the time planned for their life area moves to Insights, over the range shown (FR-INS-P4). Goals keeps only a yearly badge (FR-GOALS-P2). Both read each week's governing week type (`effectiveTemplate`), so the Goals rule of reading the working week type during time off (FR-TPL-8) is dropped. Owner to confirm.
- **Decided 2026-10-28, Goals and Insights simplify (`feat/goals-insights-simplify`):** a habit can make its own activity in its life area from the habit form (FR-GOALS-24); empty life areas fold into one row (FR-GOALS-25); the list is the default Goals view and the Harada map is the Grid view from 1100 px (FR-GOALS-26); the category detail reads target, habits, hours, goal, then other activities (FR-GOALS-27); Insights shows Month and Week first and keeps Quarter, Year, the range and the unit under More options, with one headline sentence (FR-INS-P1, P2). The two "Life areas" headings on Goals are removed.
- Week status (vacation, off), overrides and notes are removed from the model; the Vacation template covers it (was Q5).
- Habits may link to activities of any category; the habit's own category is listed first and the activity's category is shown (was Q6, FR-GOALS-22).
- UX rules: see only once; see, then edit; see only what you need.
- Home (UX, 2026-10-26): the activities of the period come first, the timeline of the same hours directly below (24 hours for Day; one proportional segment per activity for Week and Month, unplanned time empty), then the journal. The totals, the category bar and legend, and the below-target line are removed.
- Goals (UX, 2026-10-26): the category list is the primary view at every size; the Harada matrix is shown only from 1100 px. An open category closes with Close (Back to categories on phones) or Escape, which clears the selection and returns to the list.
- Colours (UX, 2026-10-26): one planned-time palette. Empty hours and weeks use the page surface with a visible hairline in both themes; planned fills reach 3:1 on the surface (shaded when needed); the current week is an accent outline. Details in the design spec, section 5.
- Visualization (UX, 2026-10-26): the year recap comes first (two headline numbers and the category bar), then Goals vs. planned, then Key insights (horizon, projection, week and month chart). Read-only.

### 23.1a Decided in the UX polish batch

- Home shows today only; the week and month views are not kept anywhere (owner, batch brief).
- Allocated time in the comparison counts every activity of the category, primary or also-counted, not only the ones a habit links to. A habit's link affects only its own row.
- "Weeks" in Insights means hours divided by 168.
- Insights percentages count planned hours by primary category, so each activity is counted once.
- The Planner title is "Planner" (the sentence heading was removed with the copy sweep).
- Allocated time counts the activities linked from the category's habits and the activities that list it as secondary, each once (owner decision, batch 2). Sleep under Physical does not count unless a habit links it.
- An activity can be unlinked from a category only as a secondary link; the primary category is changed, not removed (owner decision, batch 3).
- Insights shows available time per bar in a unit chosen by one selector (Hours, Days, Weeks), with the free time in each tooltip (owner decision, batch 3).

### 23.2 Assumptions (made for this draft; confirm or correct)

| # | Assumption |
| --- | --- |
| A1 | Home Month uses the calendar-day rule (17.5). |
| A2 | Projection over N years = selected year's total x N (17.11). |
| A3 | Edits apply at once; edit mode ends with Done; no Save or Cancel. |
| A4 | Default edit pattern is inline on the owning screen; elsewhere Edit navigates (11.2). No dialogs or drawers. |
| A5 | Tab, selection and edit mode move into the route query. |
| A6 | Activity colour becomes independent of the category colour after creation (FR-PLAN-21). |
| A7 | Export, import and reset (when built) live in a topbar "Data" menu. |
| A8 | Journal: one plain-text note per local date, stored in the state; the key message is derived, never stored; no habit check-ins in the experiment. |
| A9 | Harada map cells select the category (shared selection with the list); categories beyond eight appear only in the list. |

### 23.3 Open questions (short choices, with recommendation)

Q1, Q2, Q5 and Q6 were decided by the owner on 2026-10-25 (see 23.1). Requirement notes that cite them are now final, not proposed. Q3 and Q4 stay open; their recommendations are used as working assumptions.

| # | Question | Recommendation |
| --- | --- | --- |
| Q3 | Goals vs. planned: measured on the active template, or on this week's effective template? | Active template: it reflects what you edit. |
| Q4 | Home: current day, week and month only, or previous and next too? | Current only in v3; previous and next later. |
