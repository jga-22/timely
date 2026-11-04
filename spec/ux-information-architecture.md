# Timely: information architecture options

Status: option A (Today, Plan, Progress) chosen by the owner on 2026-11-04 and built in slice 4 (0.1.0); the decision record is section 8.1. The other options are kept for reference, not built. Written 2026-11-03 as a companion to `spec/ux-journey-map.md` and `spec/ux-proposal.md` (section 6c, Model C, is the navigation the proposal currently recommends). This document does not pick a winner. Two prototypes are being built to answer the questions in section 7; the decision is recorded with the template in section 8.

**Scope.** Where screens and concepts live, the names of the surfaces, the order of setup, and the code each option implies. It changes no data: the model (`app/types/planner.ts`, `PLANNER_STATE_VERSION` 8, the storage keys) is the same in every option (section 6.4).

**Labels.** Scores are our judgement from the walk-through, not from users. Vocabulary is taste until tested.

---

## 1. The baseline

### 1.1 Today's shape (main, 2026-11-03)

Five tabs, route `?tab=` ids in brackets: **Home** (`home`), **Goals** (`goals`), **Week** (`planner`), **Year** (`year`), **Insights** (`insights`). Home is the default. Account menu in the topbar. Legal pages, sign-in gate and first-run flow sit outside the tabs. Source: `app/composables/useNav.ts` (TABS), `app/pages/index.vue` (one branch per tab), `app/app.vue` (topbar and footer).

### 1.2 Inventory

Every existing screen and concept is listed below with an ID. The mapping in section 4 uses these IDs, so nothing is dropped. Sub-parts are grouped where they always appear together (for example the Home timeline and its axis).

**Screens and surfaces (S)**

| ID | Screen or surface (today) |
| --- | --- |
| S01 | Topbar tab bar: Home, Goals, Week, Year, Insights |
| S02 | Account menu: name and save status, Dark mode, Replay tour, Reset my data, Sign out (Supabase mode) |
| S03 | Storage status in the topbar ("Local mode", "Saved", "Not saved"); sign-in gate (Google only) |
| S04 | Footer "Terms · Privacy"; legal pages (`terms`, `privacy`) |
| S05 | Home: the day title and the day switch (past days, never a future day, 60 days back) |
| S06 | Home: the hour timeline with its axis (9h, 12h, 18h, 22h) and the sleep edge |
| S07 | Home: the day progress ring and "x of y done" (blocks only) |
| S08 | Home: today's activities with a done check each; the empty line "Nothing planned today" |
| S09 | Home: the Habits disclosure (habits with no day this week; "x of y this week"; "Habits N of M ticked") |
| S10 | Home: the journal card (one note per day; previous, next, date field, Today) |
| S11 | Goals: page title and the List or Grid toggle (Grid from 1100 px) |
| S12 | Goals: the ambition card (view, Edit, or the prompt that writes the first one) |
| S13 | Goals: the Harada map (Grid view; eight life areas around the ambition) |
| S14 | Goals: the life area list (1-year target status; entry counts "3 habits · 2 activities"; "Add a goal") |
| S15 | Goals: "+ Add life area" and its form |
| S16 | Goals: life area detail, the view (5-year goal, 1-year target) |
| S17 | Goals: life area edit fields (name, colour, goals) |
| S18 | Goals: "Activities and habits" list in a life area, with "+ Add" |
| S19 | Goals: manage the life area (Move up and down, Remove with confirmation) |
| S20 | Week: week type bar (chips, double-click to rename, colour, "+ New week type", "Edit week type") |
| S21 | Week: new week type panel (Start from empty, a copy, or a preset; role rows; habit switch) |
| S22 | Week: edit week type panel (name, colour, time off, delete with confirmation) |
| S23 | Week: the week grid (press, drag or tap to select; rows that are sleep on all seven days collapse when Show sleep is off) |
| S24 | Week: grid action bar (Change, Edit, Delete, Save, Cancel) and the Apply menu (activities with hours; Clear these hours) |
| S25 | Week: "+ Add activity" and "Sleep hours" (or "Set up sleep") under the grid |
| S26 | Week: Time split (ring of the typical week; life areas list; "Not planned") |
| S27 | Week: the line "X added. Choose its weeks in Year" with a link after a new week type |
| S28 | Year: year switcher; empty state "Plan the week in Week and the hours show here." with Open Week |
| S29 | Year: the painter (paint tool, the year's weeks, count of assigned weeks) |
| S30 | Year: "Apply to several weeks" (from, to, Apply; Erase) |
| S31 | Year: planned hours bars (Month or Week; More options: Quarter or Year; unit Hours, Days or Weeks) |
| S32 | Year: the available-time key and the Show sleep toggle |
| S33 | Year: the life areas list (hours, percent of available time, "Not planned" last) |
| S34 | Insights: range controls (year, Month or Week, More options: Quarter or Year) |
| S35 | Insights: the headline ("Done 77% of planned") and the ring |
| S36 | Insights: bars by weekday, ISO week or month |
| S37 | Insights: life area bars (names link to Goals) |
| S38 | Insights: habits kept up, and habits that could use another go |
| S39 | Insights: the journal nudge; the counting note; the empty state "Tick activities on Home..." |
| S40 | Entry form (`ActivityForm`): name, life area, days, times, start, week types, repaint note; Save; Delete with confirmation; Escape steps |
| S41 | Entry form, More options: short code and colour |
| S42 | First run: Welcome (Guide me, Start empty, "Watch the short intro") |
| S43 | First run: the intro dialog (five scenes, shared player) |
| S44 | First run: guided step 1 (Your ambition) and step 2 (Goals and habits) |
| S45 | First run: tour cards 3 to 5 (Plan your week, Your year, Daily follow-up) |
| S46 | Show sleep toggle (Home, Week, Year; one preference) |
| S47 | Reset my data dialog |

**Concepts (K)**

| ID | Concept (today's word) |
| --- | --- |
| K01 | Ambition (5 years) |
| K02 | Life area (category; eight by default; the first eight form the Harada grid) |
| K03 | 5-year goal |
| K04 | 1-year target (or "to be decided") |
| K05 | Habit (a count a day, week or month; optional minutes per occurrence) |
| K06 | Activity (under a life area; colour; short code) |
| K07 | Entry (a habit with its linked activity, or an activity no habit links to; one form) |
| K08 | Week type (the schedule of a week; "Week type" today) |
| K09 | Time off (a week type of kind break) |
| K10 | Presets (Standard, Deep work, Light, Vacation) |
| K11 | Week assignment (which week type each ISO week uses; unassigned weeks use the active one) |
| K12 | The Goals week type (the working week type while the active one is time off) |
| K13 | The Sleep activity (short code SLP, locked) and the sleep hours editor |
| K14 | Planned block ("planned session" in plain words) |
| K15 | Done tick (a block tick, or a habit tick) |
| K16 | Journal note (one per day) |
| K17 | Adherence (planned against ticked, over a range) |
| K18 | Available time and "Not planned" (free time) |
| K19 | Need text ("Needs 6 h a week") |
| K20 | Short code and colour |
| K21 | Storage mode, sign-in and sign-out |
| K22 | First-run flag (`onboarding`: pending or done) |
| K23 | Dark mode |
| K24 | Tour replay (session only) |
| K25 | Year selection (session; set on mount, not kept) |
| K26 | URL state (`tab`, `item`, `edit`) |

---

## 2. The four options

### Option 0: keep five tabs

- **Shape.** Home, Goals, Week, Year, Insights, as today.
- **What changes.** Nothing structural. Plain-word changes from the proposal (section 5) can be applied in place.
- **Setup order.** Welcome, then the intro if wanted, then step 1 (ambition), step 2 (one or two life areas, one habit each), the build, then the tour: card 3 on Week, card 4 on Year, card 5 on Home. Home is the last stop.
- **What a new user sees first.** After the build, the tour opens on Week. Home is the first tab they see on later visits, empty or with one block.
- **Strengths.** Every surface has a visible label. No moves to learn. Lowest build cost.
- **Risks.** Five equal labels suggest five equal jobs (finding 10 of the proposal). Year is premature for a new user (finding 6). Home is empty on four days of seven after the guided build. The dream link is one tab away from the daily screen.

### Option 1: four tabs, Year inside Week

- **Shape.** Home, Goals, Week, Insights. The Week tab has two views on a segmented control at its top: **Week** (the grid, the week types, Time split) and **Year** (the painter, the planned hours, the life areas). The Year tab goes away; its route `year` opens the Year view of Week.
- **Setup order.** As Option 0; tour card 4 points at Week's Year view.
- **What a new user sees first.** Week with the grid and the tour card. Year is one tap away in the same tab.
- **Strengths.** Fewer labels. Year and Week, which share week types and the same weeks, sit together.
- **Risks.** Year can be missed as a view under Week. Week becomes the heaviest tab (it already has about 9 to 11 terms; see the proposal's concept inventory). The Year painter and the Week grid compete for width on a phone.

### Option A: three surfaces, Today, Plan, Progress

- **Shape.** Three tabs: **Today** (Home), **Plan**, **Progress**.
  - **Today** holds the day: the timeline, the day's blocks and ticks, the Habits list, the journal, and (proposed) one ambition line.
  - **Plan** holds the planning, with a segmented control at its top: **Dreams** (the ambition, the life areas, the goals and the habits, today's Goals), **Week** (today's Week tab), **Year** (today's Year tab). Dreams is the new name for Goals inside Plan.
  - **Progress** holds the reflection: today's Insights adherence, and (proposed) a weekly recap with "Done for the week" and "Plan next week". The recap reads the done ticks; it stores nothing.
- **Setup order.** Welcome, the intro if wanted, step 1, step 2 (these build Dreams), the build, then the tour: card 3 "Plan your week" opens Plan > Week, card 4 "Your year" opens Plan > Year, card 5 "Daily follow-up" lands on Today.
- **What a new user sees first.** After the build, the tour opens on Plan > Week. Later visits open Today (the default).
- **Strengths.** The three names match the three jobs (do, plan, review). Dreams sits in the same tab as Week and Year, so the dream-to-day link is one tap and the ambition line on Today points at it. Three labels are easy to hold.
- **Risks.** "Dreams" is new and may read as a wish list (test it). A segmented control inside Plan may feel like three apps. Renaming Goals to Dreams and Insights to Progress breaks the words in the existing docs and screenshots (copy only; no code data). The recap is a new surface to build and to keep calm.

### Option B: one stream and a plan drawer

- **Shape.** No tab bar. The screen is one stream called **Today**.
  - At the top: the date, the day switch and the ambition line (proposed).
  - Then the day: the timeline, the blocks with ticks and the progress ring, the Habits list, the journal.
  - Lower in the stream: **Progress** (the adherence headline, the trend, the life area bars, the recap). The stream scrolls to it.
  - A button, **Edit my plan**, opens a full-screen drawer with three sections on a segmented control: **Dreams**, **Week**, **Year**. Escape or Done returns to the same place in the stream.
  - The Account menu stays in the topbar.
- **Setup order.** Welcome, the intro if wanted, step 1, step 2, the build, then the tour: card 3 opens the drawer on Week, card 4 opens Year in the drawer, card 5 closes the drawer on Today and scrolls to the Progress section.
- **What a new user sees first.** Today, with one block or none, and the Progress section below it (empty, with its one line). The drawer is one tap away.
- **Strengths.** One place for the day, the plan and the review; the fewest moving parts for a new user; the daily tick and the progress sit on one screen.
- **Risks.** Progress sits below the fold and may not be seen. A full-screen drawer hides the context of Today, and the Week grid and the Year painter need width. The Escape and Back behaviour has to be right across the drawer, the entry form and the grid's popups. "Edit my plan" hides Dreams, Week and Year from a first look (discoverability). Largest build cost.

---

## 3. Scorecard

Seven criteria, rated as **good**, **fair** or **weak** for each option, our judgement from the walk-through and the code. No totals on purpose: the criteria do not weigh the same, and a sum would decide the question for the owner. The ratings are to be checked by the prototypes (section 7).

| Criterion | Option 0: five tabs | Option 1: Year in Week | Option A: Today, Plan, Progress | Option B: one stream and drawer |
| --- | --- | --- | --- | --- |
| **Time to value** (first block, then first tick) | Fair. The tour starts on Week; Home is one tap away. | Fair. Same as 0. | Good. The tour lands on Plan > Week; Today is the default and holds the tick. | Good. The first screen is Today with the tick. |
| **Setup effort** (places a new user must learn) | Fair. Five labels, the tour crosses three of them. | Fair. Four labels; Year is one segment of Week. | Fair. Three labels; the segment inside Plan. | Fair. No labels; the drawer is the setup place, and it is full screen. |
| **Daily effort** (a returning user's day) | Good for Home, fair for the rest. | Good. Home is one tap; Week holds the plan. | Good. Today is the default; Progress is one tap. | Good on the stream; the drawer costs a step when the plan changes. Progress needs a scroll. |
| **Clarity of the dream-to-day link** | Weak. The ambition lives in Goals; Home shows no link. | Weak. Goals is separate; Home shows no link. | Good. Dreams sits in Plan beside Week and Year; Today can show the ambition line. | Good on the stream (the ambition at the top); Dreams is behind the drawer. |
| **Discoverability** (Year, Dreams, Progress) | Good. All five labels are visible. | Fair. Year is a segment of Week and can be missed. | Fair. Dreams and Year are segments; Progress is a tab. | Weak to fair. No tabs; Year and Dreams are inside the drawer, Progress below the fold. |
| **Build cost** (one developer) | Small. Labels and copy. | Medium. A view switch, Year split from its page. | Medium to large. Three shells, renames, links at about 36 call sites. | Large. A drawer with full-screen behaviour, a stream layout and the grid inside a sheet. |
| **Risk** | Low. Familiar; five equal jobs remain. | Low to medium. Year can be lost inside Week; Week gets heavier. | Medium. Renames to test; the recap is new. | Medium to high. Drawer behaviour, hidden review, a long stream. |

What the table does not show: setup effort is close across the four options, because the guided build is the same. The differences are in the daily screen and in what is hidden.

---

## 4. Mapping: every screen and concept, in each option

Read down one option's column to see where each item lives. Columns: today's label, then the option's place. "Same" means the same place as today, with the same name. Plain-word renames are in section 5.

| ID | Today | Option 0: five tabs | Option 1: Year in Week | Option A: Today, Plan, Progress | Option B: one stream and drawer |
| --- | --- | --- | --- | --- | --- |
| S01 | Topbar tabs (5) | Same (5 tabs) | 4 tabs: Home, Goals, Week, Insights | 3 tabs: Today, Plan, Progress | No tabs; title "Today" and the button "Edit my plan" |
| S02 | Account menu | Same | Same | Same | Same (topbar avatar) |
| S03 | Storage status; sign-in gate | Same | Same | Same | Same |
| S04 | Footer; legal pages | Same | Same | Same (footer of Today) | Same (end of the stream) |
| S05 | Home day title and switch | Home | Home | Today | Stream top |
| S06 | Hour timeline | Home | Home | Today | Stream, day section |
| S07 | Day ring and "x of y done" | Home | Home | Today | Stream, day section |
| S08 | Today's activities and ticks | Home | Home | Today | Stream, day section |
| S09 | Habits disclosure | Home | Home | Today | Stream, after the day |
| S10 | Journal card | Home | Home | Today | Stream, after the habits |
| S11 | Goals title; List or Grid | Goals (List or Grid) | Goals (List or Grid) | Plan > Dreams (List or Grid) | Drawer > Dreams (List or Grid) |
| S12 | Ambition card | Goals | Goals | Plan > Dreams, top | Drawer > Dreams, top |
| S13 | Harada map (Grid) | Goals, Grid view | Goals, Grid view | Plan > Dreams, Grid view | Drawer > Dreams, Grid view |
| S14 | Life area list | Goals | Goals | Plan > Dreams | Drawer > Dreams |
| S15 | Add life area | Goals | Goals | Plan > Dreams | Drawer > Dreams |
| S16 | Life area detail (view) | Goals | Goals | Plan > Dreams | Drawer > Dreams |
| S17 | Life area edit fields | Goals (edit mode) | Goals (edit mode) | Plan > Dreams (edit mode) | Drawer > Dreams (edit mode) |
| S18 | Activities and habits in a life area | Goals | Goals | Plan > Dreams | Drawer > Dreams |
| S19 | Manage life area (move, remove) | Goals (edit mode) | Goals (edit mode) | Plan > Dreams (edit mode) | Drawer > Dreams (edit mode) |
| S20 | Week type bar | Week | Week | Plan > Week | Drawer > Week |
| S21 | New week type panel | Week | Week | Plan > Week | Drawer > Week |
| S22 | Edit week type panel | Week | Week | Plan > Week | Drawer > Week |
| S23 | Week grid | Week | Week (Week view) | Plan > Week | Drawer > Week |
| S24 | Grid action bar; Apply menu | Week | Week (Week view) | Plan > Week | Drawer > Week |
| S25 | Add activity; Sleep hours | Week | Week (Week view) | Plan > Week | Drawer > Week |
| S26 | Time split | Week | Week (Week view, below the grid) | Plan > Week | Drawer > Week |
| S27 | "X added. Choose its weeks in Year" | Week; link to Year | Week; link to the Year view | Plan > Week; link to Plan > Year | Drawer > Week; link to Drawer > Year |
| S28 | Year switcher; empty state | Year | Week > Year view | Plan > Year | Drawer > Year |
| S29 | Painter | Year | Week > Year view | Plan > Year | Drawer > Year |
| S30 | Apply to several weeks | Year | Week > Year view | Plan > Year | Drawer > Year |
| S31 | Planned hours bars and range controls | Year | Week > Year view | Plan > Year | Drawer > Year |
| S32 | Available-time key; Show sleep | Year | Week > Year view | Plan > Year | Drawer > Year |
| S33 | Life areas list (Year) | Year | Week > Year view | Plan > Year | Drawer > Year |
| S34 | Insights range controls | Insights | Insights | Progress | Stream, Progress section |
| S35 | Headline and ring | Insights | Insights | Progress | Stream, Progress section |
| S36 | Bars by weekday, week or month | Insights | Insights | Progress | Stream, Progress section |
| S37 | Life area bars | Insights (link to Goals) | Insights (link to Goals) | Progress (link to Plan > Dreams) | Progress section (link to Drawer > Dreams) |
| S38 | Habits kept up or slipping | Insights | Insights | Progress | Stream, Progress section |
| S39 | Journal nudge; counting note; empty state | Insights | Insights | Progress | Stream, Progress section |
| S40 | Entry form | Opens from Goals and Week | Opens from Goals and Week | Opens from Dreams and Week | Opens from the drawer (Dreams, Week) |
| S41 | Entry form, More options | Same | Same | Same | Same |
| S42 | Welcome | Same | Same | Same | Same |
| S43 | Intro dialog | Same | Same | Same | Same |
| S44 | Guided steps 1 and 2 | Same (build fills Goals) | Same | Same (build fills Plan > Dreams) | Same (build fills the drawer's Dreams) |
| S45 | Tour cards 3 to 5 | Week; Year; Home | Week; Week > Year; Home | Plan > Week; Plan > Year; Today | Drawer > Week; Drawer > Year; Today (Progress) |
| S46 | Show sleep toggle | Home, Week, Year | Today, Week (both views) | Today, Plan > Week, Plan > Year | Stream, drawer Week and Year |
| S47 | Reset my data dialog | Same | Same | Same | Same |
| K01 | Ambition | Goals | Goals | Plan > Dreams; a line on Today (proposed) | Drawer > Dreams; a line at the top of the stream (proposed) |
| K02 | Life areas (8; Harada order) | Goals, Week, Year, Insights | Goals, Week, Year, Insights | Dreams, Plan, Progress | Drawer, Progress section |
| K03 | 5-year goal | Goals | Goals | Plan > Dreams | Drawer > Dreams |
| K04 | 1-year target | Goals | Goals | Plan > Dreams; stages in Progress (proposed) | Drawer > Dreams; stages in Progress (proposed) |
| K05 | Habit | Goals; Home | Goals; Home | Plan > Dreams; Today | Drawer > Dreams; Stream, Habits |
| K06 | Activity | Week; Goals | Week; Goals | Plan > Week; Dreams | Drawer > Week; Dreams |
| K07 | Entry (one form) | Goals; Week | Goals; Week | Dreams; Week | Drawer (Dreams; Week) |
| K08 | Week type | Week; Year | Week; Week > Year view | Plan > Week; Plan > Year | Drawer > Week; Drawer > Year |
| K09 | Time off | Week type panel | Week type panel | Plan > Week | Drawer > Week |
| K10 | Presets | Week type panel | Week type panel | Plan > Week | Drawer > Week |
| K11 | Week assignment (unassigned weeks use the active type) | Year | Week > Year view | Plan > Year | Drawer > Year |
| K12 | Goals week type (time off read around) | Rule; no screen | Rule; no screen | Rule; no screen | Rule; no screen |
| K13 | Sleep activity (SLP) and sleep editor | Week | Week | Plan > Week | Drawer > Week |
| K14 | Planned block | Week; Home; Insights | Week; Home; Insights | Plan; Today; Progress | Drawer; stream; Progress section |
| K15 | Done tick | Home; Insights | Home; Insights | Today; Progress | Stream; Progress section |
| K16 | Journal note | Home | Home | Today | Stream |
| K17 | Adherence | Insights | Insights | Progress | Stream, Progress section |
| K18 | Available time; "Not planned" | Week; Year; Home (Not planned row) | Week; Year view | Plan > Week; Plan > Year | Drawer > Week; Drawer > Year |
| K19 | Need text ("Needs 6 h a week") | Goals detail | Goals detail | Plan > Dreams | Drawer > Dreams |
| K20 | Short code and colour | Week grid; entry form | Week grid; entry form | Plan > Week; entry form | Drawer; entry form |
| K21 | Storage mode and sign-in | Account; topbar; gate | Same | Same | Same |
| K22 | First-run flag | First run | Same | Same | Same |
| K23 | Dark mode | Account menu | Same | Same | Same |
| K24 | Tour replay | Account menu; tour | Same | Same | Same |
| K25 | Year selection (session) | Year | Week > Year view | Plan > Year | Drawer > Year |
| K26 | URL state (`tab`, `item`, `edit`) | Same ids | `tab` loses `year`; `view` added | `tab` becomes today, plan, progress; `section` added | One `tab`; `sheet` and `section` added |

Proposed items that are not in the app today (the ambition line on Today, the stages, the recap and "Done for the week") appear in the matrix only where an option puts them. None of them needs a stored field; section 6.4 gives the one rule that keeps it so.

---

## 5. Vocabulary by option

The words below are proposals (`ux-proposal.md` section 6e). They change copy and labels only. Storage keys, ids and types keep their names.

| Today | Option 0 | Option 1 | Option A | Option B | Note |
| --- | --- | --- | --- | --- | --- |
| Home | Home | Home | Today | Today | Test the name |
| Goals | Goals | Goals | Dreams (inside Plan) | Dreams (in the drawer) | Biggest word change; test it |
| Week | Week | Week | Plan > Week | Week (in the drawer) | "Week" stays a word people know |
| Year | Year | Year (a view of Week) | Plan > Year | Year (in the drawer) | Year is kept in every option |
| Insights | Insights | Insights | Progress | Progress (a section) | |
| (none) | (none) | (none) | Plan | "Edit my plan" | |
| Week type | Schedule (proposed) | Schedule | Schedule | Schedule | Shared plain word |
| + New week type | + Another schedule | Same | Same | Same | |
| Apply (on a selection) | Add to these hours | Same | Same | Same | Shared plain word |
| Time split | Where the week goes | Same | Same | Same | Shared plain word |
| Not planned | Free | Same | Same | Same | Shared plain word |
| Available per month | Awake time in the month | Same | Same | Same | Shared plain word |
| Block; "13 of 16 blocks" | Planned session; "13 of 16 sessions" | Same | Same | Same | Shared plain word |
| Paint with; Erase | Use schedule; Clear weeks | Same | Same | Same | Shared plain word |
| Sleep is hidden: ... (on Home) | Removed from Home | Same | Same | Same | Shared plain word |
| Recap; "Done for the week" | (none) | (none) | New, proposed | New, proposed in Progress | Only if tested |

The names that depend on the option are Dreams, Plan, Progress, Today and "Edit my plan". The others apply in every option.

---

## 6. Code changes per option

Each option is a change to the shell and the routes. The components below exist on `main` today. Counts of link call sites were taken from the code (`link(` and `go(` in `app/`: 36 uses in 7 files).

### 6.1 Option 0: five tabs

- **Components moved.** None.
- **Routes.** None. `tab` ids stay as they are.
- **Nav.** Labels only: `TABS` in `app/composables/useNav.ts` if any label changes; `app/app.vue` renders the tabs from it.
- **Other.** Copy changes in `HomeActivities.vue`, `PlannerView.vue`, `YearView.vue`, `InsightsView` (`AdherenceView.vue`) and `useOnboarding.ts` (tour text).
- **Checks.** Build, typecheck, unit tests; the copy in the 1280 and 400 captures.
- **Size.** Small.

### 6.2 Option 1: Year inside Week

- **`app/composables/useNav.ts`.** Remove `year` from `TABS`. Old `?tab=year` maps to `tab=planner&view=year`. Add `view` (`week` default, or `year`) to the URL state and to `toLocation`. `link('year', ...)` callers become `link('planner', { view: 'year' })`.
- **`app/pages/index.vue`.** Drop the `year` branch; `PlannerView` renders the Week or the Year view.
- **`app/components/planner/PlannerView.vue`.** Gets the segmented control (Week | Year) and mounts the Year body. Its line "Choose its weeks in Year" (line 51) links to the Year view.
- **`app/components/year/YearView.vue`.** Split: the page title and the year switcher become the segment's header; the body (painter, Weeks row, planned hours, life areas) becomes a component mounted by Week. The `Open Week` link (line 116) goes, because the view is in Week.
- **`app/composables/useOnboarding.ts`.** Tour card 2 (line 33) points at the Year view.
- **Size guard.** `PlannerView.vue` and the Year body must each stay under 400 lines (`tests/unit/fileSize.test.ts`): split by responsibility, do not raise the limit.
- **Checks.** Old `?tab=year` links open the Year view; the Week grid keeps its state when the segment switches; the Year session settings (range, unit) reset as they do today when the view is left.
- **Size.** Medium.

### 6.3 Option A: Today, Plan, Progress

- **`app/composables/useNav.ts`.** `TABS` becomes `today`, `plan`, `progress`. A `section` param (`dreams`, `week`, `year`) is added for `plan`. Old values map: `home` to `today`, `goals` to `plan` with `section=dreams`, `planner` to `plan` with `section=week`, `year` to `plan` with `section=year`, `insights` to `progress`.
- **`app/pages/index.vue`.** Three branches; `plan` renders the segmented shell.
- **New shell.** `app/components/plan/PlanView.vue` (the segment and the section switch) and the Progress shell (`app/components/progress/ProgressView.vue`, the renamed Insights page; the recap card is a later addition, `progress/RecapCard.vue`, proposed).
- **Components moved.** `HaradaView` mounts as the Dreams section (its page title goes); `PlannerView` as the Week section; the `YearView` body as the Year section; `InsightsView` as the Progress page. `HomeView` stays, with the day shell renamed Today in copy only.
- **`app/app.vue`.** Topbar renders three tabs.
- **Links to update.** Every `link('goals', ...)`, `link('planner')`, `link('year', ...)`, `link('insights')` and `link('home')` call, in `HomeActivities.vue` (lines 37, 55, 73), `HomeHabits.vue` (line 35), `AdherenceView.vue` (lines 98, 174, 216), `PlannerView.vue` (line 51), `TimeSplit.vue` (line 51), `YearView.vue` (lines 51, 116), `app/composables/useResetData.ts` (`go('home')`) and `useOnboarding.ts` (lines 32 to 34).
- **Size guard.** Every file in `app/` is under 400 lines on `main` (the largest is about 340), so each new shell or split must stay under the limit (`tests/unit/fileSize.test.ts`).
- **Checks.** Old links land on the right section; the entry form opens from Dreams and Week with the same item; the Back button keeps the segment.
- **Size.** Medium to large.

### 6.4 Option B: one stream and a plan drawer

- **New drawer.** `app/components/plan/PlanDrawer.vue`: full screen, teleported, with the segmented control (Dreams | Week | Year), Escape and Done to close, focus returned to the button that opened it, and the focus rules of `app/utils/focus.ts` on phones.
- **`app/components/home/HomeView.vue`.** Becomes the stream: the day sections (existing), then a Progress section that mounts the Insights page body (`InsightsView` without its page title). The ambition line at the top is new (a view of existing data).
- **`app/app.vue`.** The topbar has the title, "Edit my plan" and the Account avatar; the tab bar is removed. The legal routes and the sign-in gate stay outside the stream.
- **`app/pages/index.vue`.** Renders the stream; the drawer is mounted by `app.vue` or by the stream.
- **`app/composables/useNav.ts`.** `tab` has one value (`today`); `sheet` (`plan` or none) and `section` (`dreams`, `week`, `year`) are added; `item` and `edit` keep their meaning inside the drawer. Old values map to the drawer and its sections.
- **Components moved.** `HaradaView`, `PlannerView` and the `YearView` body mount inside the drawer, with their page titles removed. The Escape stack has to be checked across the drawer, the entry form's confirmations (`useEntryDraft.ts`), the grid's popups (`useGridPopups.ts`) and the Account menu.
- **Links to update.** The same list as Option A, plus Home's own links (`HomeActivities.vue`) that open the drawer instead of a tab.
- **Tour.** Card 3 opens the drawer on Week; card 4 opens Year; card 5 closes the drawer and scrolls to Progress (`useOnboarding.ts`).
- **Checks.** Scroll position is kept when the drawer closes; the grid works at 400 px inside the drawer; the Back button closes the drawer before it leaves Today.
- **Size.** Large.

### 6.5 The model is untouched by every option

Confirmed for all four options:

- `app/types/planner.ts` (`PlannerState`, `Category`, `Activity`, `Habit`, `WeekTemplate`, `settings`) is not changed. `PLANNER_STATE_VERSION` stays 8.
- The stored keys (`timely.showSleep`, `timely.dark` and the planner state in local or Supabase storage) keep their names and shapes. `spec/database/` stays as it is.
- The store (`app/stores/planner.ts`, `app/utils/store/*`) and the pure rules (`app/utils/*`) keep their behaviour. The screens read them as today.
- `view`, `section`, `sheet` and `tab` are URL state for the session, like `tab`, `item` and `edit` are now. None of them is written to storage.
- The ambition line, the stages, the recap and "Done for the week" are views of existing data (ambition, 1-year targets, done ticks, the week). None of them needs a stored field. If a recap ever needs to remember that a week was closed, that is a new field, which would need its own decision, a storage version bump and a reset of local data; this document does not propose it.

---

## 7. What the prototypes must show to decide

Two prototypes are being built (`spec/mockups/prototype-a*` for Option A, `spec/mockups/prototype-b*` for Option B). Options 0 and 1 have no prototype. Option 0 is the current build, which is the baseline for the test (Task 0 to Task 6 in `ux-proposal.md` section 10). Option 1 cannot be judged in a prototype of its own; prototype A's Plan > Week and Plan > Year segment is the nearest proxy, and the result is read as a proxy, not as a test of Option 1.

### 7.1 Prototype A: Today, Plan, Progress

It must show: Today with the day and the ambition line; Plan with the Dreams, Week and Year segment; Progress with the headline, the trend and the recap; the tour card 3 opening Plan > Week.

Questions it answers:

1. Can a new user find Dreams, Week and Year inside Plan without help ("Show me where you set your 5-year goal", "Change one thing in your week")?
2. Are the names Today, Plan and Progress understood in five seconds (Task 0)? Which name is misread?
3. Is "Dreams" read as the ambition and life areas, or as a wish list? Does it replace "Goals" in the person's words?
4. Does the ambition line on Today make the link to the day felt ("Behind this block")?
5. Does the segment in Plan feel like one place, or like three apps?
6. Is the recap opened, and is "Done for the week" read as encouraging (Task 4 and Task 6)?
7. Does the person reach Plan > Year to paint a holiday week, and do they find Apply to several weeks?
8. Time to an accepted plan and to the first tick (the same measures as the rules-path test).

### 7.2 Prototype B: one stream and a plan drawer

It must show: the Today stream with the day, the habits, the journal and the Progress section below; the Edit my plan button and the full-screen drawer with Dreams, Week and Year; the tour cards 3 to 5 as they land in the stream and the drawer.

Questions it answers:

1. Does the person find "Edit my plan" and understand that it holds Dreams, Week and Year?
2. Do they scroll down to the Progress section, and do they see it at all? Record the scroll and the first thing read.
3. Is the day's next action clear in five seconds in the stream (Task 0)?
4. In the drawer, can the person change a block and close back to the same place in the stream? Does Escape or Back do what they expect?
5. Is the drawer usable for the Week grid and the Year painter at 1280 and at 400 px?
6. Does the full-screen drawer feel like leaving Today, and does the person lose their place?
7. Is the lack of tabs read as simpler, or as hidden (Year and Dreams)?

### 7.3 Questions both prototypes answer

- Can the person explain after 60 seconds where to go to change the week, and where to see progress?
- Is the dream link felt on the daily screen?
- Is the first screen after the build populated (a block for today or the next one named)?
- Which words are misread (Today, Plan, Progress, Dreams, Schedule, Add to these hours, Free, Awake time)?
- Wrong turns: the number of times a person opens the wrong place, and how they recover.
- Measures: Task 0 (a next action named in 5 seconds), time to an accepted plan, time to the first tick, the fit score, and the wrong-turn count.

### 7.4 What would make each option lose

These are not conclusions. They are the observations that would count against an option:

- Option 0 loses if the test shows strangers stop on the five-tab bar before the first tick (Task 0 under 4 of 5).
- Option 1 loses if Year is not found inside Week by most people who need it (holiday weeks).
- Option A loses if Dreams or Progress is misread in most attempts, or if the segment inside Plan is read as three apps.
- Option B loses if Progress is not seen, or if the drawer costs more wrong turns than the tabs.

---

## 8. Decision template

Fill this in when the owner decides. Keep it in this file, under the heading of the decision, so the reason is kept with the change.

```
Decision: <option chosen, or "none yet">
Date: <yyyy-mm-dd>
Decided by: <owner>

Evidence used:
- Prototype A test (participants, tasks, date): <summary>
- Prototype B test (participants, tasks, date): <summary>
- Baseline (current build, Task 0 and Task 1): <summary>
- Measures: Task 0 <n of 5>; time to accepted plan <median>; time to first tick <median>; fit <n of 5 at 4 or more>; wrong turns <count>

Scores observed (replace the judgement in section 3):
- Time to value: <good | fair | weak>
- Setup effort: <...>
- Daily effort: <...>
- Dream-to-day link: <...>
- Discoverability: <...>
- Build cost (confirmed): <...>
- Risk (new evidence): <...>

Vocabulary accepted: <list of words from section 5, with changes>
Vocabulary rejected: <list>

Options rejected and why:
- <option>: <reason>

Code change plan: <section 6 entries chosen; order of work; owner>
Model check: <confirmed unchanged (section 6.5), or the new field and its version decision>
Open risks: <list>
Next review date: <yyyy-mm-dd>
```

---

### 8.1 Decision record: option A (2026-11-04)

This is the filled template for the owner's decision. The owner's reasons are recorded here as the reasons this document gives for option A (section 2 and the scorecard, section 3). Test results are not in the repo: the fields that need them say so.

```
Decision: Option A, three surfaces: Today, Plan, Progress. Plan holds Dreams, Week and Year (its sub-nav), Progress holds the adherence view.
Date: 2026-11-04
Decided by: the owner

Evidence used:
- Prototype A test (participants, tasks, date): not recorded in the repo. The prototype shown is A2 (spec/mockups/prototype-a2.html, with its CSS and script).
- Prototype B test (participants, tasks, date): not recorded in the repo. Option B was not built.
- Baseline (current build, Task 0 and Task 1): not recorded in the repo.
- Measures: Task 0 not recorded; time to accepted plan not recorded; time to first tick not recorded; fit not recorded; wrong turns not recorded.

Scores observed (the section 3 judgement stands; nothing was re-measured for this decision):
- Time to value: good (the tour lands on Plan > Week; Today is the default and holds the tick).
- Setup effort: fair (three labels; the Plan segment).
- Daily effort: good (Today is the default; Progress is one tap).
- Dream-to-day link: good (Dreams sits in Plan beside Week and Year; Today can show the ambition line, a later slice).
- Discoverability: fair (Dreams and Year are segments of Plan; Progress is a surface).
- Build cost (confirmed): medium to large, as estimated; slice 4 (this change) is the switch, with the renames at the call sites.
- Risk (new evidence): the Dreams word and the segment in Plan are still to be tested with users; see the open risks.

Vocabulary accepted: Today, Plan, Progress, Dreams, Week, Year.
Vocabulary rejected: Home, Goals and Insights as the names of surfaces (they stay as the old URL names, which still open the new screens). Goals and Insights remain as names inside some copy until slices 5 to 9 rewrite it (the intro, the Progress copy).

Options rejected and why:
- Option 0 (five tabs): five equal labels suggest five equal jobs, and the dream link stays one tab away from the daily screen.
- Option 1 (four tabs, Year inside Week): Year can be missed as a view under Week, and Week becomes the heaviest tab.
- Option B (one stream and a plan drawer): the largest build (a drawer with full-screen behaviour, a stream layout and the grid inside a sheet), and Dreams and Year hidden behind the drawer.

Code change plan: section 6.3 (option A), done in slice 4 of the migration plan (`spec/ux-migration-plan.md`, version 0.1.0). Order: the place model and its tests (`app/utils/nav.ts`); the composable and the URL rewrite (`useNav.ts`, `useNavSync.ts`); the shell (`components/shell/`); the Plan and Progress frames with the `headless` prop; the call sites and the tour; the docs and the version. Owner: the owner decides the copy and the slices that follow.
Model check: confirmed unchanged (section 6.5). PlannerState, the storage version (8) and the saved shape are not changed by the navigation.
Open risks:
- "Dreams" may read as a wish list. It needs a test with users; the copy change went ahead on the owner's decision.
- A segmented control inside Plan may feel like three apps.
- The top bar has a theme switch and the Account menu keeps its own Dark mode switch: two controls for one setting. The owner decides whether the menu row stays.
- Old docs and screenshots name the old tabs (copy only; no data).
Next review date: proposed 2026-12-04, or after slice 8 (Progress), whichever comes first.
```


## 9. Open items

- The owner decides the option (section 8) after the two prototype tests (section 7).
- "Dreams" is the largest word change in the options. It needs a test in both prototypes before any copy changes.
- The proposal's Model C (`ux-proposal.md` section 6c) is Option 0 with unlocking; it is not one of the four options here. It can be combined with any option as a separate decision.
- The recap and the ambition line are not in the app. Their design is in `ux-journey-map.md` (stages 3, 5 and 6); their placement is in section 4 of this file.
- The sub-items of the Insights page (life area bars, habits kept up) can move to Progress or to Dreams; the matrix uses Progress in every option that keeps Insights.

## 8. Data-model check of prototype A2 (2026-11-03)

Checked against `app/types/planner.ts` and `app/utils/goals.ts`. A2 is a mockup with invented numbers; this lists what it shows, where the real data comes from, and what is a product decision. Storage version stays 8 unless a row says otherwise.

| A2 element | Real source today | Verdict |
|---|---|---|
| Ambition line, life areas, 5-year goal, 1-year target text, habits, activities | `ambition`, `categories`, `habits`, `activities` | Exists |
| Week schedules, Year painter, Show sleep | week types, week assignment, `timely.showSleep` | Exists |
| Ticks, day strip, "x of y planned so far", journal | `done`, planned blocks, `journal` | Exists, derived |
| First run, replay | `onboarding`, `buildOnboardingState` | Exists |
| Weekly trend, headline sentence ("about three in four") | adherence in `app/utils/adherence.ts` | Exists, derived; needs a "last eight weeks" window |
| Milestones ("First planned hour ticked", "Physical had a full week") | derivable from `done` history | Derived; rules to write, nothing stored |
| Theme, Lively/Calm | `localStorage` outside the planner state, like `timely.showSleep` | Exists as a pattern; a new local key, not a model change |
| **"62% of the way" to a 1-year target, stages (Starting to Reached), the ambition ring (43%), the dream path dots** | **Not in the model.** `Category.target1y` is free text plus `targetTbd`; there is no progress value | **Product decision.** Either define a derived measure (for example the share of the year's planned habit occurrences ticked so far, per life area) or show no percentage. A stored progress field would be a model change |
| "Done for the week" and the recap's closed state | Not stored | Session-only (resets on reload), or a new optional field (a model change, with its own decision). Recommended first: session-only |
| "Behind this: <1-year target>" on the focal card | block to activity to category to `target1y` | Derived, exists |
| Greeting by name | `Sam Reyes` is invented; the app keeps no name in the planner state (the account menu shows the sign-in name in Supabase mode) | Use the sign-in name when there is one, otherwise no name |

Conclusion: the structure, the flows, the first run, the ticks and the recap content map to the existing model with no change. The one real gap is **progress toward a 1-year target**: it drives the ambition ring, the stages and the dream path, and it has no stored or defined value today. That measure must be decided, and tested with real data, before those components are built. Everything else can be built without touching the stored shape.
