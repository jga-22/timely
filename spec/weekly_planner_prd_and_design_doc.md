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
- **The picture (Visualization).** Read-only charts: the year week by week, projections over years, goals against planned time.

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
- Show year totals, projections and goals against planned time, read-only (Visualization).
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
| US-5 | As a user, I see per category how much habit time my week schedules against what the habits ask for. | Done; moves to Goals detail and Visualization |
| US-6 | As a user, I select hours in the week and assign them to an activity. | Done (activity grid, slice 2b; painting in edit mode, slice 5) |
| US-7 | As a user, I change or remove an activity's hours. | Done (activity grid, slice 2b) |
| US-8 | As a user, I apply one activity to the same hours across several days at once. | Planned (v3): rectangle paint in the activity grid |
| US-9 | As a user, I keep several templates and switch, rename, recolour, create and delete them. | Done (no duplicate) |
| US-10 | As a user, I assign templates to the weeks of the year by painting a year grid. | Done (2026 only, mouse only); year handling Planned (v3) |
| US-11 | As a user, I mark a week as vacation or off, or override slots for one week. | Dropped (Q5) |
| US-12 | As a user, I see hours and percentages per category. | Done (Insights); moves to Home and Visualization |
| US-13 | As a user, I see the year week by week (or month by month), stacked by category. | Done; moves to Visualization |
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
| FR-UX-1 | **See only once.** Each fact has one primary place (matrix in 11.3). Other screens show only derived summaries or links, never an editing control for it. | Done | *Evidence (slice 5):* Home has the period selector and links only; Goals edits categories, habits and the ambition; Planner edits activities and templates; Visualization has view settings only (year, view, category focus, horizon). The slice 5 walk of all four tabs found no second editor. |
| FR-UX-2 | **View and edit modes.** Ambition, category, habit, activity and template are read-only by default. One Edit button per item switches it to edit mode; Done returns to view mode. | Partial | *Evidence (slice 5):* Activities, categories and the ambition have an Edit button named "Edit {name}" (the ambition: "Edit ambition"); Done returns focus to Edit; at most one item is in edit mode per screen (browser run). **Partial because** templates have no Edit button (renamed by double-click, recoloured from the chip dot, deleted inline) and habit rows are edited inside the category's edit mode (FR-GOALS-18). |
| FR-UX-3 | **Progressive disclosure.** Each screen follows overview, list, select, detail view, edit mode. List rows show at most name, colour and two short facts. | Partial | *Evidence (slice 5):* Lists show no form fields, selecting a row shows its detail, and one detail is open at a time. **Partial because** Planner activity rows show code, category and hours (three facts; the rule allows name, colour and two short facts). |
| FR-UX-4 | **Edit from elsewhere.** An Edit button on a screen that does not own the item navigates to the owning screen with the item selected and in edit mode. | Done | *Evidence (slice 5):* Home's Edit on Reading opens Planner with Reading in edit mode and painting enabled; Back returns to Home with the same period (Week, kept in Nuxt state across tabs). Browser run: X1 to X3. |
| FR-UX-5 | **Navigation state in the URL.** Active tab, selected item and edit mode are route query parameters (for example `?tab=planner&activity=deep-work&edit=1`). | Done | Reload keeps tab and selection; Back and Forward move between them; an unknown id falls back to no selection without error. *Evidence (slice 1):* `useNav` (`app/composables/useNav.ts`) keeps `tab`, `item` and `edit` in the route query; reload, Back and Forward work (browser run). Planner reads `item` and `edit` (slice 2a: a selection is a history entry, Done replaces it; checked with Back, Forward, reload and unknown ids); Goals does not yet (slice 3). *Evidence (slice 3):* Goals also reads and writes `item` and `edit`; back, forward, reload and unknown ids checked in the browser. |
| FR-UX-6 | **Immediate edits.** Fields in edit mode apply on change (no Save button). An empty required field (name, code) reverts on blur with an inline message. | Done | *Evidence (slice 5):* Planner name and code apply on input. An empty name shows "Name can't be empty" and reverts on blur; Goals category names are refused inline. Browser run: E3 and E4. |
| FR-UX-7 | **Inline confirmation** for destructive actions (delete activity, remove category, delete template, remove habit), stating the impact. No `confirm()`. | Done | *Evidence (slice 5):* No `confirm()` in the code. Delete activity states the impact ("Clears N h in N templates and unlinks N habits") with Delete and Cancel; delete template, remove category and remove habit confirm inline with a second button. Nothing changes before that button. |
| FR-UX-8 | **Phone master-detail.** At 768 px and below, list and detail stack: selecting a row shows the detail full width with "Back to list". | Done | *Evidence (slice 5):* At 400 px Planner and Goals show the list, then the selected detail full width with "Back to list"; no page overflow on any tab in light and dark (browser run: X4 to X7 and the 400 px tab runs). Goals keeps the list position for Back to list (code path, HaradaView). *Changed 2026-10-26, UX slice 8:* the phone button reads "Back to categories"; desktop has a Close button; Escape closes the open category. |

### 9.2 Dates and years (new; dependency for Home and Visualization)

| ID | Requirement | Status | AC |
| --- | --- | --- | --- |
| FR-DATE-1 | "Today" comes from the device's local date. Weeks start on Monday and use ISO week numbers. | Done | With the clock at 2026-10-25 (a Sunday), the current week is week 43, starting 2026-10-19; the year grid and charts mark it. *Evidence:* `localDateKey` in `app/utils/dates.ts`, set on mount in `app/app.vue`. Node cases (ISO weeks, Monday, DST, time zones) and a browser run at 2026-10-25 show week 43 marked. |
| FR-DATE-2 | **Effective template of a date:** the template of the applied week whose `startDate` is that date's Monday; if that week is unassigned, the active template (decided, Q2). One shared function serves Home, Visualization and projections. | Done | Unit test: an assigned week returns its template; an unassigned week returns the active template; a deleted template is never returned. *Evidence:* `effectiveTemplate` in `app/utils/planner.ts`, used by Insights bars and `yearlyProjectionHours`. Node cases: assigned, unassigned, deleted, year boundary. |
| FR-DATE-3 | Year handling: the year grid and charts show every ISO week of a selected year (52 or 53), default the current ISO year, with previous and next controls. | Done | 2026 shows 53 weeks, the last starting 2026-12-28; 2027 shows 52 weeks, the first starting 2027-01-04. *Evidence:* Year switcher on the Planner year grid; `isoWeekStarts` gives 53 weeks for 2026 (last 2026-12-28) and 52 for 2027 (first 2027-01-04). Browser run: 2025, 2027 and boundary clocks. |
| FR-DATE-4 | Remove the hard-coded `WEEK_DATES_2026` and `CURRENT_WEEK_INDEX`; the seed assigns weeks of the current year. | Done | No literal 2026 remains in `app/` outside comments; a fresh seed in 2027 assigns 2027 weeks. *Evidence:* `WEEK_DATES_2026` and `CURRENT_WEEK_INDEX` removed; `createInitialState(year)` seeds the current ISO year. Seed checked for 2026 and 2027 in node. |
| FR-DATE-5 | Remove `ensureDefaultWeek`, which writes today's UTC date (not a Monday) as `startDate` under a fixed id when the active template has no applied week. | Done | Creating a template and reloading adds no applied week. *Evidence:* `ensureDefaultWeek` removed from the store and the persistence plugin; a reload keeps the applied-week count (browser run). |
| FR-DATE-6 | Date-dependent output (Home, current-week markers) renders on the client only, so server and client never disagree about "today". | Done | No hydration warning caused by dates; Home shows a quiet placeholder until mounted. *Evidence:* Year, today and current-week markers are null until mounted, so the first render matches the server. Dev-build fresh load and reload after an edit: no hydration warning. *Evidence (slice 4):* Home reads `today` only after mount; the Now mark is set on mount. Browser runs at the 2026-10-25, 2026-03-04 and 2027-01-01 clocks show the right dates; no console messages on the fresh-load runs. *Evidence (slice 1):* Home date is null until mounted; dev-server probe shows no hydration warning on fresh load or after edits. |

### 9.3 Home (new)

| ID | Requirement | Status | AC |
| --- | --- | --- | --- |
| FR-HOME-1 | Home is the first tab and the default screen. It is read-only, except the journal card (FR-HOME-11), which is the primary place of journal entries. | Done | Browser (slice 6): a fresh load opens Home; the only inputs are the period selector and the journal note. *Evidence (slice 4):* Browser run on the production build: a fresh load opens Home (tab 01 selected, Day shown). The only control is the period selector; Edit and category links navigate. The journal card (FR-HOME-11) is slice 6. |
| FR-HOME-2 | Period selector Day, Week, Month (segmented control), default Day. Periods are today, the current ISO week and the current calendar month. | Done | Switching updates list, bar and totals at once; the choice survives a tab switch within the session. *Evidence (slice 4):* Period in `useState` (`home-period`), default Day, session only. Browser: ArrowRight, End and wrap-around move selection and focus; Week survives Planner and Visualization tab switches; a reload returns to Day. |
| FR-HOME-3 | Header line: date, ISO week number and the effective template(s) of the period (Month lists each template with its number of days). | Done | Day: "Sunday 25 October 2026 · Week 43 · Standard Week". Month: "October 2026 · Standard Week 24 d, Deep Work Week 7 d". *Evidence (slice 4):* Header line in the browser: "Sunday 25 October 2026 · Week 43 · Standard Week", "19 to 25 October 2026 · Week 43 · Standard Week", "October 2026 · Standard Week 31 d", "Friday 1 January 2027 · Week 53 · Standard Week". The mixed-template list (`periodTemplates`) passes node checks; no mixed month was screenshotted. |
| FR-HOME-4 | Day: today's blocks in time order. Each row: time range, activity name, category (dot and name), duration. Contiguous hours of one activity form one block (`slotsToBlocks`). The block containing the current hour is marked "Now". | Done | On a Standard-Week Monday the seed lists Sleep, Training, Deep Work and so on in order; durations sum to the day's planned hours. *Evidence (slice 4):* Sunday 25 October 2026 lists six blocks in time order (12AM to 8AM Sleep, 9AM to 11AM Reading, and so on); the node check matches every weekday against the template grid under UTC, Paris and New York. The block containing 10AM carries "Now" (one only). |
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
| FR-GOALS-5 | Add, rename and remove habits. | Done; re-housed | `HabitList.vue`. v3: habit view and edit rows (FR-GOALS-18). |
| FR-GOALS-6 | Habit frequency and minutes per occurrence. | Done; re-housed | `setHabitFrequency`, `updateHabit`. |
| FR-GOALS-7 | Link a habit to an activity, or clear the link. | Done | `setHabitActivity`. The picker lists all activities (FR-GOALS-22). |
| FR-GOALS-8 | Per habit: weekly rate and scheduled hours of the linked activity; flag unlinked habits. | Done; re-housed | `habitWeeklyOccurrences`, `scheduledWeeklyMinutesForActivity`. |
| FR-GOALS-9 | Per category: habit-time alignment and total scheduled time. | Done; re-housed | `categoryAlignments`. v3: goals-vs-planned block in the detail. |
| FR-GOALS-10 | Empty state with "Load starter grid". | Done | `seedHaradaGoals`. |
| FR-GOALS-11 | Habit periods beyond month. | Not built | Monthly approximation. Later. |
| FR-GOALS-12 | Habit completion log. | Not built | Dropped in v2; reopened only as an idea after the Home journal experiment (FR-HOME-14). |

New in v3:

| ID | Requirement | Status | AC |
| --- | --- | --- | --- |
| FR-GOALS-13 | Vision section at the start of Goals: ambition statement and horizon in view mode; Edit switches to an `AutoTextarea`. This is the only place the ambition is edited **(decided)**. | Done | Editing here updates the grid centre and the Home key message at once; the grid centre has no input. *Evidence (slice 3):* Vision section in `HaradaView.vue`: view mode, Edit with an AutoTextarea that applies at once, Done returns focus to Edit; the map centre updates; the text persists after reload (browser run). |
| FR-GOALS-14 | Harada map: read-only 3x3 with the ambition in the centre (derived from the vision section) and the first eight categories around it. A cell shows only order, name, colour and the "To define" flag. Clicking a cell selects that category in the list and opens its detail. | Changed | No inputs and no counts or hours in cells; selection is shared with the list (one selected category). *Evidence (slice 3):* Map cells show order, name, colour and To define only; click, Enter and Space select the category, shared with the list through `item`; arrow keys move focus. *Changed 2026-10-26, UX slice 8:* the Harada map is shown only from 1100 px and hidden (display none) below it; the category list is the primary view at every size. |
| FR-GOALS-15 | Category list (layout of the old Configuration list): order number, colour swatch, name, short counts ("2 activities · 8 habits") and a quiet "Below target" flag. Selecting a row opens its detail. | Changed | Rows have no inputs; the selected row has `aria-current`; on desktop the first category is selected on arrival. *Evidence (slice 3):* List rows show name, colour, counts and the Below target flag; the selected row has aria-current; desktop opens the first category. The order number is not shown in the list (the map carries it), following the decision that list rows show name, colour and counts; owner to confirm. *Evidence (slice 5):* `aria-current` follows the URL selection only: on a phone with nothing selected no row is marked, and on desktop the first row is shown without `aria-current`. *Changed 2026-10-26, UX slice 8:* the list shows each name with its 1-year target line (or "Target to define") and the Below target flag, not counts. On desktop, Close returns to a placeholder beside the list instead of the first category. |
| FR-GOALS-16 | Category detail, view mode: name and colour, 5-year goal, 1-year target, goals vs. planned (bar, target tick, figures, quiet total, flags; same computation as FR-INS-1, labelled with the template used), habits (read-only rows), activities of the category (name, h/wk in the active template, Edit to Planner). | Done | Values match the v2 Insights row for the same category. *Evidence (slice 3):* Detail view: 5-year goal, 1-year target with To define, goals vs. planned bar and figures from `categoryAlignments` (the Visualization computation), habits and activities (Edit to Planner). |
| FR-GOALS-17 | Category edit mode: name, colour (palette), 5-year goal, 1-year target, "to be defined", move up and down, Remove (inline move-to flow when it has activities or habits). | Done | Same rules as FR-CFG-2 to 4; removal with content requires a target category. *Evidence (slice 3):* Edit mode: name, colour, goal, target, To define, move up and down, Remove with an inline move-to flow when content exists (no window.confirm). |
| FR-GOALS-18 | Habit rows: view shows name, frequency ("3 a week, 60 min"), linked activity (link to Planner) or "Not linked"; Edit opens an inline form (name, count, period, minutes, activity, Remove). One habit in edit at a time; "Add habit" adds a row in edit mode. | Partial | Replaces the "Details" toggle; Tab reaches every Edit. *Evidence (slice 3):* Habit rows are read-only in view mode; one habit form opens at a time in category edit mode, with Add habit and inline Remove. Deviation: Edit is not on the rows in view mode (habit editing lives in category edit mode, as the build plan says). |
| FR-GOALS-19 | "Add category" at the foot of the list (name, palette colour); the new category opens selected in edit mode. | Done | An empty name is refused with an inline message. *Evidence (slice 3):* Add category under the list with name and palette colour; an empty name is refused inline; the new category opens selected in edit mode. |
| FR-GOALS-20 | "Add activity" in the category detail opens Planner's new-activity form with that category preset. | Done | The new activity's category is the one it came from. *Evidence (slice 5):* "+ Add activity" in the category detail (view and edit) links to `?tab=planner&add=1&category=<id>` (`useNav`); the form opens with that category preselected and the name focused; an unknown category falls back to the first; Cancel drops `add` and `category` from the URL; reload keeps the form (browser run, `s5-focus.mjs` B1 to B9). |
| FR-GOALS-21 | Note under the list when more than eight categories exist: only the first eight appear in the Harada map. | Done | The note shows at nine categories; the ninth is in the list and works everywhere else. *Evidence (slice 3):* The note shows under the list at nine categories; the ninth is in the list and works everywhere else. |
| FR-GOALS-22 | Habit activity picker groups activities by category, the habit's own category first; a cross-category link shows the activity's category in view mode. | Done | A Spiritual habit linked to Reading reads "Reading (Cognitive)". *Evidence (slice 3):* Habit picker: optgroups by category, the own category first, categories without activities omitted; the view reads "Deep Work (Professional)" for a cross-category link (browser run). |

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
| FR-PLAN-13 | Layout: template bar on top, then the week grid, then the Activities list with the activity detail, then the year grid (restored 2026-10-26; see FR-PLAN-23 and 24). | Done | *Evidence (slice 2b):* the grid sits between the Activities and Year sections at 1280 and 400 px; its lede names the activity and template ("Painting hours for Training in Standard Week") or the overview ("Overview of Standard Week"). No disclosure is used: all regions are always open. |
| FR-PLAN-14 | Activity list: colour dot, name, code, category, h/wk in the active template. "Add activity" at the foot. Selecting opens the detail. | Done | Row hours sum to the "n of 168" figure. *Evidence (slice 2a):* Activities list (`PlannerView.vue`, `.act-row`): colour dot, name, "code · category", h/wk in the active template; "+ Add activity" at the foot; selecting sets `item` in the URL. Checked in the browser: row hours sum to the planned figure ("137 of 168 hours", Standard Week). |
| FR-PLAN-15 | Activity detail, view mode: name, code, category (link to Goals), colour, h/wk in the active template and in each other template (one quiet line), linked habits (names, link to Goals), schedule shown read-only in the grid. | Done | No inputs visible in view mode. *Evidence (slice 2a and 2b):* detail as in 2a; the selected activity's hours are tinted in its colour in the grid and the other activities are quieter (checked at 1280 px, light and dark). |
| FR-PLAN-16 | Activity editing: name, short code (1 to 3 letters, upper-cased), category, colour (palette), Delete with inline confirmation stating cleared hours and unlinked habits. Changing category keeps slots and habit links. Edit is on the selected row of the activity palette (slice 7), not in a detail panel. | Done | *Evidence (slice 2a and 2b):* edit fields and inline delete. *Evidence (slice 7):* Edit on the selected palette row opens the inline editor (`edit=1`); Escape or Done closes it; the name prefills (browser run, `planner-check.cjs`). |
| FR-PLAN-17 | Activity grid: 7 day columns x 24 hour rows of the active template. The slice 7 brush (paint or erase at once, no edit gate, Replaced-N-h notice) is superseded by FR-PLAN-23. | Superseded | *Evidence (slice 7):* headless Edge run (`planner-check.cjs`, 28 checks): drag paints 4 cells in one gesture; replacing shows the notice and Undo restores Deep Work; Erase clears two hours and Undo restores them; Shift plus arrows and Space paint a range; Escape drops the range; the notice dismisses after 8 s; no overflow at 400 px. |
| FR-PLAN-18 | Taken hours: an hour held by another activity is replaced when painted over. No overlaps: a slot holds one activity. | Done | Changed in slice 7 (owner decision, PRD 23.1): the earlier confirmation with Reassign and Cancel is replaced by the notice and single-step undo. *Evidence (slice 7):* replace and undo checks in `planner-check.cjs`. |
| FR-PLAN-19 | Keyboard operation of the grid: one tab stop, arrow keys move, Shift with arrows extends a range, Enter or Space acts on it, Escape drops it. Each slot has a name ("Tuesday 9AM, Deep Work"). | Superseded | *Evidence (slice 7):* headless Edge run: Shift+ArrowRight then Space paints two Thursday and Friday hours; Shift+ArrowDown then Escape then Space paints only the focused hour. Earlier evidence (slice 2b) for names and focus ring still applies. |
| FR-PLAN-20 | Template overview: with no activity selected, the grid shows the whole active template read-only. | Superseded | *Evidence (slice 2b):* browser run: no painting in the overview (drag does nothing); 137 coloured hours and 31 free match "137 of 168 hours planned"; a click or Enter on a coloured hour selects its activity (URL `item`). |
| FR-PLAN-22 | Week-first Planner layout with an Activities palette beside the grid (slice 7). | Superseded |
| FR-PLAN-23 | Week grid, original interaction (restored 2026-10-26, owner decision). 7 day columns x 24 hour rows of the active template, 28 px per hour. Drag down one day column to select a run of hours; releasing opens the action bar beside the pointer: Apply (Change when the run holds hours), Edit, Delete (when it holds hours), Cancel. Apply opens the activity menu (hours a week per activity, then Clear these hours) and overwrites the run. A click or tap on a painted hour selects its whole block; a tap on an empty hour selects that hour. Hovering a block shows its delete; a day's cross clears the day. Edit adds two handles to the run and Save (applies the new run, clears the old) or Cancel. Touch only taps, so the page scrolls freely. Keyboard (kept from FR-PLAN-19): one tab stop, arrows move, Shift with arrows selects a run in one day, Enter or Space opens the bar, Escape closes. One-step Undo line under the grid for about 8 s after a change that alters hours. No edit-mode gate. | Done | *Evidence (2026-10-26, branch fix/restore-original-week-grid):* headless Edge on the production build, 34 checks in a scratchpad script (not committed), all passing: drag shows the run's range and duration; Apply opens the menu and paints the run; Undo removes it; a click on a painted hour selects its block; a handle drag grows the run and Save applies it; Cancel restores the run; the day cross clears Monday; Shift plus arrows, Enter and Escape with focus returned to the grid; a touch tap opens the bar; no page overflow at 1280 and 400 px; no console errors. Overwriting a run with a different activity uses the same store path as the Save step and is not separately exercised. |
| FR-PLAN-24 | Activities under the week: a compact list of chips (colour, name, hours a week in the active template) with "+ Add activity". Selecting one shows its detail with Edit; the editor and the add form are unchanged (FR-PLAN-16). Opening from Goals (`add=1&category=`) preselects the category (FR-GOALS-20). Erase is not an activity: clearing hours is in the week grid, and Erase remains a paint tool in the year painter only. | Done | *Evidence (2026-10-26):* the same run: Activities chips show hours; selecting one shows the detail; Edit opens the editor; the add form opens and closes; `add=1&category=` opens the form focused. | *Evidence (slice 7):* headless Edge run at 1280 px (grid left of palette, palette 280 px, year grid as wide as its container, cells 32 px high) and at 400 px (palette above the grid, no page overflow). Screenshots: `spec/screens/planner-desktop-light.png`, `planner-desktop-dark.png`, `planner-mobile-light.png`. |
| FR-PLAN-21 | Activity colour belongs to the activity. Recolouring a category recolours only the activities still using the old category colour. | Done | An activity recoloured by hand keeps its colour when its category is recoloured. *Evidence (slice 2a):* `setCategoryColor` recolours only the activities still on the category's old colour; new activities start in the category colour. Checked: Training (on the Physical colour) followed the change to ochre; Sleep (hand-picked) kept its colour. Other activity colours come from the activity record (`usePlannerMaps`). |

### 9.6 Planner: templates

| ID | Requirement | Status | Evidence / note |
| --- | --- | --- | --- |
| FR-TPL-1 | Switch the active template from a chip row with hours. | Done | `selectTemplate`. The active template is the one the activity grid edits **(decided)** and the fallback for unassigned weeks (FR-DATE-2). |
| FR-TPL-2 | Create a named, empty template. | Done | `createTemplate`. v3 fix: give it the next unused palette colour (today it copies the source colour, so year-grid colours collide). |
| FR-TPL-3 | Rename a template. | Done; to change | v3: template Edit button instead of double-click (FR-UX-2). |
| FR-TPL-4 | Template colour from the palette. | Done | `setTemplateColor`. |
| FR-TPL-5 | Delete a template (never the last); its applied weeks go. | Done | Inline confirmation with the impact ("Delete \"Launch week\"? No week uses it. This cannot be undone.") instead of `confirm()`. *Evidence (slice 2b):* browser run: Cancel keeps the template, Delete removes it, `window.confirm` never called. |
| FR-TPL-6 | Duplicate a template. | Not built | Next: the quickest way to build a variation such as a vacation week. |
| FR-TPL-7 | Manage templates in Configuration. | Dropped | Templates stay in the Planner **(decided)**. |

### 9.7 Planner: year grid

| ID | Requirement | Status | Evidence / note |
| --- | --- | --- | --- |
| FR-YEAR-1 | Week grid with month labels, each week coloured by its template. | Done | Every ISO week of the selected year (52 or 53), coloured by its applied template (`weeks` from `usePlannerYear`). |
| FR-YEAR-2 | Pick a template or Erase, then click or drag to paint. | Done | `paintWeek`, `setWeekTemplate`. Mouse only; touch painting and keyboard are Next. |
| FR-YEAR-3 | Hover readout and "n / 52 weeks assigned". | Partial | Count reads "n of 52" or "n of 53" for the selected year. The unassigned readout still says "unassigned, click to paint", not "uses {active template}". |
| FR-YEAR-4 | Current-week marker. | Done | Marker from the clock, only in the current ISO year (`currentWeekIndex`). Browser run at 2026-10-25, 2026-12-31, 2027-01-01 and 2027-01-04. |
| FR-YEAR-5 | Week status, per-slot overrides and notes. | Dropped (Q5) | Removed from the model: `status`, `overrides`, `notes` and `excludedWeekStatuses`. |
| FR-YEAR-6 | Years other than 2026. | Superseded | By FR-DATE-3. |

### 9.8 Visualization (new; replaces Insights)

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
| FR-APP-7 | Four tabs in order Home, Goals, Planner, Visualization, numbered 01 to 04; Home default **(decided)**. | Done | Tabs fit at 400 px without scrolling; `app/app.vue` has no Insights or Configuration entry. *Evidence (slice 1):* Home, Goals, Planner and Visualization are numbered 01 to 04 with Home default (browser run). Configuration is a transitional fifth tab. At 400 px the five tabs scroll inside `.tabs` (42 px overflow) until slice 3 removes Configuration. *Evidence (slice 3):* Four tabs in order Home, Goals, Planner, Visualization, numbered 01 to 04; Configuration removed; `?tab=configuration` falls back to Home. |
| FR-APP-8 | Remove the Insights and Configuration views and code only they use. | Done | `InsightsView.vue` and `LegendView.vue` are gone or reduced to reused parts; build and typecheck clean. *Evidence (slice 1):* `InsightsView.vue` removed; the projection horizon moved from `LegendView.vue` to Visualization. `LegendView.vue` stays until slice 3. *Evidence (slice 3):* `LegendView.vue` and its CSS removed in slice 3; no Configuration code is left. |

---

## 10. Non-functional requirements

| Area | Requirement | Status |
| --- | --- | --- |
| Local-first | No backend data store or API; the only external request is the Google Fonts stylesheet. | Met |
| Privacy | No personal data leaves the browser. Journal text stays local like everything else. | Met |
| Performance | Derived values recomputed in memory. Home Month walks at most 31 days; the year chart at most 53 weeks. | Met (not benchmarked) |
| Build quality | `npm run build` clean; `npx nuxi typecheck` at 0 errors. | Required on every change |
| Responsive | Usable at 400 px; no page-level horizontal scroll. Only the year grid and charts may scroll, each in its own container. The activity grid must fit 400 px. | Met today; required for v3 |
| Themes | Light and dark from the same tokens. | Required for v3 screens |
| Accessibility | `frontend-design.md` section 6. New in v3: keyboard-operable activity grid (FR-PLAN-19), named Edit buttons, `aria-controls` and `tabpanel` on tabs. | Partial; required for v3 |
| Testing | Unit tests for date logic and projections (FR-DATE-1 to 3, section 17) before Home ships; screenshots per `frontend-design.md` section 9. | Gap |

---

## 11. UX concept

### 11.1 Navigation

Sticky topbar: `timely`, four numbered tabs, a "Data" menu (once FR-APP-5 is built) and the theme toggle.

1. **Home**: today, this week, this month; a small journal card (experiment).
2. **Goals**: why. Vision, Harada map, categories, goals, habits.
3. **Planner**: when. Activities, their hours, templates, the year.
4. **Visualization**: the picture. Read-only charts.

Tab, selection and edit mode live in the route query (FR-UX-5), so Edit links and the browser Back button work.

### 11.2 Edit pattern

Default: **inline edit mode on the owning screen.** The detail pane of the selected item swaps its read-only content for a form in place; the Edit button becomes Done. Habits inside a category detail, the vision statement and the journal note edit inline the same way, one item at a time.

From a screen that does not own the item (Home, Visualization, or a cross-link such as a habit's linked activity), Edit **navigates** to the owning screen with the item selected and in edit mode (FR-UX-4).

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
| Templates and week assignment | Planner template bar and year grid | Home header (template names); Visualization lighter bars for unassigned weeks |
| Projected hours for a day, week, month | Home | none |
| Hours per week per activity | Planner activity list | Goals detail activity list |
| Year totals, projections over years | Visualization | none |
| Goals vs. planned (coverage, flags) | Goals category detail | Visualization overview (all categories); Home one-line signal; "Below target" in the Goals list |
| Journal note of a day | Home journal card | none |

Two different questions, never mixed: Home and Visualization count an activity in **its own category** (`categoryId`); goals vs. planned counts it for **the first category by order whose habits link it** (section 17).

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

### 11.7 Visualization

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
| Insights: goals-vs-planned rows (bar, tick, figures, total) | Goals category detail (primary); Visualization overview; Home one-line signal |
| Insights: flags "No target yet", "No time planned", "n habits not linked" | Goals detail; "Below target" in the Goals list |
| Insights metric: allocated hours per week (active template) | Planner template chip and overview ("n of 168") |
| Insights metric: top projected activity | Visualization metrics, plus the full projection list (FR-VIZ-5) |
| Insights metric: unassigned hours per week | Home "unplanned" total for the selected period |
| Insights metric: daily average of the leading category | Visualization metrics (selected year) |
| Insights: "n of 52 weeks assigned" | Planner year grid only |
| Insights: week-by-week chart, Monthly/Weekly, focus chips, legend | Visualization (FR-VIZ-3) |
| Insights: breakdown by category (active template) | Home bar and legend (period); Visualization year by category |
| Configuration: category list, add, rename, recolour, reorder, remove | Goals list and category edit mode |
| Configuration: category h/wk and h/yr | Goals detail (h/wk); Visualization year by category (h/yr) |
| Configuration: activity list, add, delete | Planner activity list and edit mode |
| Configuration: projection horizon | Visualization projection |
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

1. The seed loads; Home opens.
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
View state (not stored): Home period, Visualization year and chart mode
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
app/app.vue                              shell, topbar, tabs (Home, Goals, Planner, Visualization)
app/pages/index.vue                      reads tab and selection from the route query
app/components/home/HomeView.vue         new; JournalCard.vue (experiment)
app/components/harada/                   GoalsView (vision, map, list, detail), HabitList (view/edit rows)
app/components/planner/PlannerView.vue   template bar, activity list and detail, year grid
app/components/planner/ActivityGrid.vue  new 24x7 grid (overview, view, edit, keyboard)
app/components/viz/VisualizationView.vue charts moved from InsightsView
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
- Unassigned weeks count as the active template, drawn lighter in charts (was Q2).
- Week status (vacation, off), overrides and notes are removed from the model; the Vacation template covers it (was Q5).
- Habits may link to activities of any category; the habit's own category is listed first and the activity's category is shown (was Q6, FR-GOALS-22).
- UX rules: see only once; see, then edit; see only what you need.
- Home (UX, 2026-10-26): the activities of the period come first, the timeline of the same hours directly below (24 hours for Day; one proportional segment per activity for Week and Month, unplanned time empty), then the journal. The totals, the category bar and legend, and the below-target line are removed.
- Goals (UX, 2026-10-26): the category list is the primary view at every size; the Harada matrix is shown only from 1100 px. An open category closes with Close (Back to categories on phones) or Escape, which clears the selection and returns to the list.
- Colours (UX, 2026-10-26): one planned-time palette. Empty hours and weeks use the page surface with a visible hairline in both themes; planned fills reach 3:1 on the surface (shaded when needed); the current week is an accent outline. Details in the design spec, section 5.
- Visualization (UX, 2026-10-26): the year recap comes first (two headline numbers and the category bar), then Goals vs. planned, then Key insights (horizon, projection, week and month chart). Read-only.

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
