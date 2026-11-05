> The plan for the A2 migration (prototype A2 into the app), dated 2026-11-03. Copied as is from the planning notes; slices are built one PR each.

# Timely: migration plan, five tabs to prototype A2

Planner, read-only, 2026-11-03. Sources: `.claude/agent.md`, `spec/ux-proposal.md`, `spec/ux-journey-map.md`, `spec/ux-information-architecture.md` (option A, sections 4, 6.3, 8), `spec/mockups/prototype-a2.html` + `prototype-a2/a2.css` + `a2.js`, and the app on `main` (a92177d; the docs branch adds only specs). Tags: **[fact]** read in code or measured; **[assumption]** check it; **[rec]** recommendation.

Owner rule applied throughout: keep A2's style, components and philosophy as far as possible; every A2 feature the current model cannot hold is logged in section 3 (feature parity log) with the closest alternative built only from existing data, derived values, session state or localStorage preferences outside the planner state. Nothing is dropped silently; the model is not changed.

Hard constraints in every slice: `PLANNER_STATE_VERSION` 8 and `PlannerState` unchanged; CI green (npm test, typecheck, build); no `.vue`/`.ts` in `app/` over 400 lines; pure rules in `app/utils` with tests (dates and minutes passed in); CSP unchanged (only the existing nonce'd head script may grow; no new origin); light and dark; a11y (44 px targets, focus return, live regions, reduced motion); components never import `app/utils/storage/*` (store and composables only, so the later relational backend does not touch UI); jsonb store length untouched.

---

## 1. Gap analysis per screen

### 1.1 Shell and global
| A2 | Today | Gap |
|---|---|---|
| Rail (232 px) on desktop: brand, Today / Plan / Progress with icons; top bar + bottom tab bar on phone | `app.vue` topbar: brand, 5 text tabs (`role=tablist`), `AccountMenu` avatar; footer Terms and Privacy | New rail, tab bar, top bar; 3 entries |
| Theme button in the top bar; account menu: Motion (Lively / Calm), Replay first run, Reset | Dark switch in `AccountMenu.vue`; `timely.dark` + pre-paint head script (`nuxt.config.ts`) | Move the dark toggle (Q3); new Motion control |
| Warm paper #f4f2ec, surface #fffefb, cobalt #2a55c4, radii 10/14/20/28, soft shadows, 36 px titles, 16 px body | `tokens.css`: white, #1b4b8f, radius 6 px, 15 px body, hairlines; `frontend-design.md` says calm blue, minimalist | Replace token values; rewrite the design spec (Q1) |
| Ambient time-of-day tint (off in Calm), View Transitions, toast, chart tooltips | none (`NuxtRouteAnnouncer` only) | New: CSS + small composables |
| No Vuetify | Vuetify used only for `VApp` and `useTheme` [fact]; `@mdi/font` via `icons.defaultSet: 'mdi'`; built `entry.css` = **559 KB (91 KB gzip) with 7,462 `.mdi-*` classes and 5 `.v-*` selectors** [fact, `.output` of 2026-11-03]; 4 icon font files shipped | Remove (slice 2) |

### 1.2 Today (was Home)
| A2 | Today's code | Gap |
|---|---|---|
| Eyebrow date + week number; prev / Back to today / next, 60 days | `HomeView.vue`, `dayAllowed`, `dayTitle`, `dayHeaderLine` | Same logic, new markup |
| Greeting by time of day, with a name | none | New pure `greeting()`; name: section 3 |
| "For: <ambition>" | ambition in store | New view of existing data |
| Ambition ring 64 px | `AdherenceRing.vue` | Ring reused; value derived (2.1) |
| Focal card: next undone item, 44 px tick, "Next · 9 AM to 12 PM · Area", live countdown pill, "Behind this: <target>, n% of the way" | `dayBlocks`, `isNowBlock`, `blockDoneKey`, `toggleDone` | New focal rule and countdown; "Behind this" exists (block, activity, category, `target1y`); % derived (2.1) |
| Day line 7 AM to 10 PM, segments, now marker, "x of y done today" | `HomeTimeline.vue` (24 segments, axis 9/12/18/22, sleep edge), `HomeActivities.vue` ring | Replace with the A2 day line; remove the sleep sentence (`HomeTimeline.vue:20`) |
| States: normal / "Today is done." / nothing planned with illustration and "Add Run this evening" | all-done green check (FR-HOME-19); nothing planned = text link | New states; the one-day block is not possible (section 3) |
| "Also today" rows; cheer line; sparks, count-up, glide, tilt | `HomeActivities.vue` rows | Rows reused; motion in slice 11 |
| "This week" strip + "x of y planned so far. A missed one costs only itself; nothing resets." | none (`isDone`, `dayBlocks` exist) | New pure `weekStrip()` |
| One-line journal | `JournalCard.vue` (AutoTextarea, own day nav, debounced save) | Keep behaviour, restyle |
| "All habits (n)" by area, Tick chips, "Planned as a block" | `HomeHabits.vue` (habits with no day only: `habitHasDay`, `habitProgressText`) | Extend to all habits (Q8) |

Day count: A2 counts daily habits not covered by a block in "x of y done"; FR-HOME-19 counts blocks only [fact] (Q7).

### 1.3 Plan (Dreams, Week, Year)
| A2 | Today's code | Mapping |
|---|---|---|
| Pill sub-nav Dreams / Week / Year | none | New `plan/PlanView.vue` + `PlanSubnav.vue` (links with `aria-current`) |
| Dreams: ambition card + Edit; area rows (dot, name, 5-year goal, bar, %, stage); detail with in-place edit of goal and target, habits, quick add habit, activities with "n blocks a week" | `HaradaView`, `AmbitionCard`, `LifeAreaList`, `CategoryDetail`, `CategoryEditFields`, `CategoryEntryList` (+ `ActivityForm`), `CategoryManage`, `AddLifeArea`, `HaradaMap` | `HaradaView` mounted as Dreams (title off). Bar, %, stage derived (2.1). [rec] keep Grid view and Add life area (A2 omits them) |
| Week: schedule chips + New schedule; "Where the week goes" donut with Free; Show sleep switch; grid; selection bar Add to these hours / Clear / Cancel; ghost block; day tabs on phone | `PlannerView`, `WeekTypeBar` (+ New and Edit panels), `ActivityGrid` + `WeekGridDay/Bar/Menu` + 5 grid composables, `EntryActions`, `SleepEditor`, `TimeSplit` + `TimeSplitDonut` (`templateSplit`) | `PlannerView` mounted as Week. Keep the real grid (A2's has no edge handles, edit box or undo); restyle, plain words, Time split above the grid, Free slice, ghost label. Phone day tabs deferred (Q12) |
| Year: Paint with chips + Clear; 53-week grid, legend, this week outlined, count; one stacked bar "planned of awake"; shares + Free | `YearView`, `YearPainter` (paint, apply to several weeks, Erase), `PlannedBars` (monthly, red capacity line, range controls, unit), `ShareList`, `RangeControls`, `YearNav` | `YearView` body mounted as Year; new `YearSummary` from `insightsBars(..., 'year')` [fact: supported]; monthly bars under "More detail" (Q14); neutral capacity line |

### 1.4 Progress (was Insights)
| A2 | Today's code | Mapping |
|---|---|---|
| Headline in words over 8 weeks | `AdherenceView` headline as a %, chosen range | New `inWords()` over `adherenceReport(..., 'week')` |
| Week-by-week trend (8 bars, this week dashed, tooltips) | bars by weekday / week / month | New `ProgressTrend.vue` |
| Dream path (8 nodes filled by progress) | none | New, derived (2.1) |
| Weekly recap card + 4-step ceremony, Done for the week, Plan next week, Reopen | none | New; closed state in section 3 |
| Milestones list; settings switches (recap, milestones, calm line) | none | New, derived; local keys |
| (not in A2) range controls, weekday/month bars, life-area bars, habits kept or slipping, journal nudge | `InsightsView`, `AdherenceView`, `RangeControls` | [rec] keep under "More detail" for 0.1.0 (Q13) |

### 1.5 First run
| A2 | Today's code | Mapping |
|---|---|---|
| Full-page setup, progress bar, Step n of 6 | `OnboardingFlow.vue` dialogs (Welcome, ambition, goals), `OnboardingIntro`/`IntroPlayer`, `OnboardingTour` (3 cards), `useOnboarding.ts` | Replace Flow + Tour; keep `IntroPlayer` (sign-in page uses it) |
| Welcome: Start / Use a starter (no Skip) | Guide me / Start empty / Watch the intro | Remove Start empty (2.4) |
| 5 questions: ambition, 1 to 3 areas, rule follow-up (+ Not sure), week chips, hours 1 to 20 | ambition, 1 to 2 goals with times and hours | New pure rule table and draft builder |
| Draft preview, editable, first action named, Accept / starter; ends on Today with a toast | builds at once, tour on Week | Draft in memory; Accept = `replaceState(...)` as today; end on Today |

### 1.6 Removed or moved
- Removed: five-tab bar; tour cards (`OnboardingTour.vue`); Start empty; Home sleep sentence; `vuetify`, `vuetify-nuxt-module`, `@mdi/font`, `vuetify.config.ts`.
- Moved: Goals to Plan > Dreams; Week to Plan > Week; Year to Plan > Year; Insights to Progress (detail under a disclosure); dark toggle to the top bar (Q3); Show sleep leaves Today.
- Unchanged: store and `app/utils/store/*`, storage adapters, `ActivityForm` and entry composables, grid composables, legal pages, sign-in gate, reset dialog, security plugin.

### 1.7 Component map
| Existing | New place |
|---|---|
| `app.vue` topbar tabs | `shell/AppRail.vue`, `shell/AppTabBar.vue`, `shell/AppTopBar.vue`; `app.vue` keeps gate, footer, dialogs |
| `pages/index.vue` (5 branches) | 3 branches: `TodayView`, `PlanView`, `ProgressView` |
| `home/HomeView.vue` | `today/TodayView.vue`; day state to `composables/useShownDay.ts` |
| `home/HomeTimeline.vue` | `today/TodayDayLine.vue` |
| `home/HomeActivities.vue` | `today/TodayFocus.vue` + `today/TodayList.vue` |
| `home/HomeHabits.vue` | `today/TodayHabits.vue` |
| `home/JournalCard.vue` | `today/TodayJournal.vue` (same behaviour) |
| new | `today/TodayHeader.vue`, `TodayWeekStrip.vue`, `TodayAmbition.vue` |
| `harada/*` | unchanged files, mounted by `PlanView` as Dreams |
| `planner/*` | unchanged files, mounted as Week (TimeSplit moved up) |
| `year/YearView.vue` | `year/YearSection.vue` (body) + new `year/YearSummary.vue`; header in `PlanView` |
| `insights/InsightsView.vue`, `AdherenceView.vue` | `progress/ProgressView.vue`; `AdherenceView` under "More detail" |
| new | `progress/ProgressTrend`, `RecapCard`, `RecapDialog`, `Milestones`, `ProgressSettings`, `DreamPath` |
| `onboarding/OnboardingFlow.vue`, `OnboardingTour.vue` | `firstrun/FirstRunView`, `FirstRunWelcome`, `FirstRunQuestion`, `FirstRunDraft`; tour deleted |
| `onboarding/IntroPlayer.vue`, `OnboardingIntro.vue` | kept |
| `account/AccountMenu.vue` | + Motion control; "Replay first run" |
| `AdherenceRing.vue` | reused for the day ring and the ambition ring |
| new | `shell/AppToast.vue`, `shell/AppTooltip.vue` |

---

## 2. Decisions before building

### 2.1 Progress toward a 1-year target (ambition ring, stages, dream path, "n% of the way")
`Category.target1y` is free text plus `targetTbd`; nothing measures it [fact]. A stored value would be a model change, so the number must be derived.

**[rec] "Year kept": share of a full year of the area's habits that has been kept, counted from the area's first tick.**
- Required per year, per habit: day = 365 x count, week = 52 x count, month = 12 x count. Area required = sum.
- Kept, per habit: ticks inside the window (its `h:<habitId>` tick, or a block tick `a:<activityId>@h` of its linked activity, as A2's `habitWeek`), **capped at the habit's count in each day / ISO week / month**, so over-ticking adds nothing.
- Window: from the area's first tick to today, at most the last 364 days (rolling after a year).
- Year kept = min(100, round(kept / required x 100)).
- Stage from Year kept: Starting under 25, Building 25, Steady 50, Strong 75, Reached 100 (proposal 9.9).
- Secondary line (no extra number to learn): pace in words over the same window, kept / required-so-far, via the same `inWords` as Progress ("keeping about three in four").
- Ambition ring = unweighted mean of the areas that have a value, with the method and the count named ("Average of 3 life areas").
- Sleep never counts. Pure module `app/utils/targetProgress.ts`, unit tested, dates passed in.

**No division by zero, no false 0%:** each area returns a state, not a bare number:
| Area state | Shown | Ring and path |
|---|---|---|
| No `target1y` text (or `targetTbd`) | "No 1-year target yet" / "Target to define" | excluded; hollow dot |
| Target, no habit | "Add a habit to track it" | excluded; hollow dot |
| Target + habit, no tick yet | "Not started" | excluded; hollow dot |
| Target + habit + at least one tick | "8% · Starting" | included |
The ring shows only when at least one area is included; otherwise the line "Your progress starts with your first tick." Required is computed only in the last branch, where it is at least 1 (a habit has count 1 or more [assumption: entry validation enforces it; guard with `required > 0` anyway]).

**How it reads on the real seed (`createInitialState`)** [fact: every seed area has a target and habits; the seed has no `done`]:
| Area | Required per year | Today (no ticks) | After 4 weeks of full keeping |
|---|---|---|---|
| Physical (Exercise 6/wk, Sleep regular daily, Water daily) | 312 + 365 + 365 = 1,042 | Not started | 24 + 28 + 28 = 80 -> 8% Starting |
| Spiritual (Read 3/wk, Quiet time daily) | 156 + 365 = 521 | Not started | 12 + 28 = 40 -> 8% |
| Relational (Call 2/wk, Family 1/wk) | 104 + 52 = 156 | Not started | 12 -> 8% |
| Economic (two monthly) | 24 | Not started | 2 -> 8% |
| Cognitive (Study 3/wk, Project 2/wk) | 260 | Not started | 20 -> 8% |
| Social (monthly + weekly) | 64 | Not started | 1 + 4 = 5 -> 8% |
| Professional (weekly + monthly) | 64 | Not started | 4 + 1 = 5 -> 8% |
| Environment (weekly) | 52 | Not started | 4 -> 8% |
Ambition ring: hidden on the seed; 8% after the four weeks. Full keeping adds about 1.9 points a week in every area, so the scale is the same for all areas (Steady after about 26 weeks, Reached after a full year). Half keeping on Physical exercise only (3 of 6) with daily habits kept gives 12 + 56 = 68 -> 7%.

**New account (`createOnboardingState`):** 8 areas, no targets, no habits -> every row "No 1-year target yet", no ring, path with 8 hollow dots and the line above. After the first run with a target and one habit: that area "Not started" until the first tick, then a value; the other areas stay "No 1-year target yet". A first run without a target text (the target is optional in the build [fact]) keeps the area at "No 1-year target yet"; [rec] the A2 draft always proposes a target line ("First step: Run."), so it is set unless the user clears it.

Honest limits: it measures habits kept, not the target itself, so it partly contradicts proposal 7.1 ("ticking more does not raise a stage"); the per-period cap limits that. It moves slowly (A2's sample shows 62% because the numbers are invented). Adding a habit raises the required count, so the % drops (the model has no habit creation date to pro-rate it). **Run it on the owner's real save before slice 10**; if it feels wrong, show the target text and the stage words without a %.

### 2.2 "Done for the week": session-only or stored
Storing it in the planner state is a model change: not allowed. [rec] A browser key outside the planner state, `timely.weekClosed` = the ISO week key last closed (one string), in `useWeekClosed()` built like `useShowSleep`. It survives a reload (session-only would reopen the recap on every reload and read as a bug); it is per device, also in Supabase mode. Fallback if the owner wants no new key: `useState` (session only).

### 2.3 Greeting name
No name in `PlannerState` [fact]. [rec] Supabase mode: first word of `useAuth().state.user.name` (Google full_name) [fact: available]. Local mode: no name ("Good morning."). No prompt, no field. Pure `greeting(minutesOfDay, name?)`.

### 2.4 First run: no skip
[rec] No Skip and no Start empty; "Use a starter instead" on every step (a draft that still needs Accept); Escape does not close the first run. Saves without `onboarding` never see it [fact: `needsOnboarding`], so the owner's data is safe. "Replay first run" for a user with data: warn before Accept ("This replaces your current plan"), because the build replaces the whole state [fact] (Q11). `useSampleData` stays reachable only under `import.meta.dev` [assumption: the owner uses it].

### 2.5 Calm / Lively persistence
[rec] `timely.motion` = `calm | lively` in localStorage, outside planner state; default Lively; `prefers-reduced-motion: reduce` always means calm. Applied before first paint by extending the existing dark-mode head script in `nuxt.config.ts` (it gets the nonce, `addScriptNonce` covers every `<script>` [fact]) to set `html[data-motion]`, `data-choice` and `data-part` (time of day). `useMotion()` + pure `resolveMotion(choice, reduce)` and `partOfDay(minutes)`. All animation CSS sits under `html[data-motion="lively"]`. Same pattern for the gamification switches: `timely.recap`, `timely.milestones`, `timely.celebrate` (default on).

### 2.6 Vuetify
[rec] Remove `vuetify`, `vuetify-nuxt-module` and `@mdi/font` (slice 2). Only `VApp` and `useTheme` are used; the Vuetify theme mirrors the CSS tokens; the icon font puts about 470 KB of CSS into the render-blocking entry stylesheet. Risk: Vuetify's reset and `.v-application` rules disappear (`base.css` lines 37 to 44 hook into them): font, background, line-height, min-height, button and input resets. Mitigation: plain `html, body` rules in `base.css` and before/after screenshots of every screen. Needs the owner's OK to change dependencies (installs ask).

### 2.7 Route model
[rec] Keep the `?tab=` query (no new pages; `ClientOnly` and the legal routes unchanged):
- `tab` = `today | plan | progress`; `view` = `dreams | week | year` with `plan` (default: Q9); `item` and `edit` keep their meaning per view (dreams: category id; week: entry id with `edit=1`; year: week type id).
- Callers use places: `link(place, target)` and `go(place, target)` with `place = today | dreams | week | year | progress`, so the 15 call sites stay one-line changes (HomeActivities 37/55/73, HomeHabits 35, AdherenceView 98/174/216, PlannerView 51, TimeSplit 51, YearView 51/116, useResetData 31, useOnboarding 32 to 34, app.vue tabs).
- Old URLs: pure `resolveNav(query)` in `app/utils/nav.ts`: home to today, goals to plan/dreams, planner to plan/week, year to plan/year, insights to progress, `visualization` or unknown to today, keeping `item` and `edit`. `useNav` reads through it, and a one-time `router.replace` writes the canonical query so Back is clean.
- Tour routes: `stepTarget` returns places in slice 4; the tour is deleted in slice 9.

---

## 3. Feature parity log (every A2 component against the model)

Classes: **As is** = buildable from existing data and code; **Derived** = buildable with a derived measure (pure rule, nothing stored); **Alternative** = A2's version needs data we do not keep, so a close alternative is used; **Not possible** = cannot exist without a model change, alternative proposed. Slice = where it ships.

### 3.1 Shell, global, Today
| A2 feature | Class | Source or alternative | Slice |
|---|---|---|---|
| Rail, bottom tab bar, top bar, skip link | As is | new components | 4 |
| Theme button, light and dark | As is | `timely.dark` | 3, 4 |
| Lively / Calm switch, reduced motion = calm | As is (pref) | `timely.motion` outside planner state (2.5) | 3 |
| Ambient time-of-day tint | As is | clock after mount; CSS | 3 |
| View Transitions + fade fallback | As is | native API, lively only | 11 |
| Toast, tooltips, live region | As is | new components | 8, 11 |
| Greeting by time of day | As is | clock | 5 |
| Greeting with the user's name ("Sam") | Alternative | sign-in name in Supabase mode, no name in local mode (2.3) | 5 |
| Date, week number, day switch, 60 days back | As is | `HomeView` logic | 5 |
| "For: <ambition>" | As is | `ambition.statement` | 5 |
| Ambition ring % | Derived | mean of Year kept (2.1); hidden until one area has ticks | 10 |
| Focal card (next undone item, 44 px tick) | Derived | `firstUndone` over `dayBlocks` + daily habits | 5 |
| Countdown pill ("In 40 min", "On now · 1 h left", "Ended at 3 PM. Tick it if it happened.") | Derived | block start and end hours + clock; whole hours only (the model's slots are hourly) | 5 |
| "Behind this: <1-year target>" | As is | block, activity, category, `target1y` | 5 |
| "... 62% of the way there" | Derived | Year kept (2.1); omitted when the area has no value | 10 |
| Day line 7 AM to 10 PM with now marker | Derived | the awake range from the day's sleep (`dayRange`) instead of a fixed 7 to 22; sleep left off unless Show sleep | 5 |
| "x of y done today" (incl. daily habits) | Derived | blocks + daily habits not covered by a block (Q7) | 5 |
| Cheer line after a tick | As is | copy from day counts | 11 |
| Sparks, count-up, glide, card tilt | As is | lively only | 11 |
| "Today is done." state, "Plan tomorrow" | As is | link to Plan > Week | 5 |
| Nothing planned: illustration and copy | As is | | 5 |
| Nothing planned: "Add Run this evening" (adds a block to today only) | Not possible | the model has slots per week type only, no one-day block (A2's `S.extra` is invented). Alternative: the button names the most-behind weekly habit (derived like A2's `nextAction`) and opens Plan > Week with today's column and 6 PM preselected in session state; a habit with no time gets a Tick for today (`h:` tick) instead | 5 |
| Day off for one date (A2 preview `dayOff`) | Not possible | no per-date override. Alternative: a time-off week type painted on a whole week in Year (exists) | n/a |
| "Also today" rows with ticks | As is | done keys | 5 |
| Week strip (done / part / missed / free / future) | Derived | `weekStrip` from `done` and the effective template per date | 5 |
| "A missed one costs only itself; nothing resets." | As is | copy | 5 |
| One-line journal, "Saved for this day" | As is | `journal` | 5 |
| All habits by area with "n of m this week", "Planned as a block" | Derived | `weekTicks`, `monthTicks`, `habitHasDay` | 5 |

### 3.2 Plan
| A2 feature | Class | Source or alternative | Slice |
|---|---|---|---|
| Pill sub-nav Dreams / Week / Year | As is | `view` query | 4 |
| Ambition card with in-place Edit | As is | `AmbitionCard` | 4 |
| Area rows: name, 5-year goal | As is | categories | 4 |
| Area rows: bar, %, stage word | Derived | Year kept + stage (2.1); status text until slice 10 | 10 |
| Detail: stage eyebrow, bar under the target | Derived | same | 10 |
| In-place edit of the 5-year goal and 1-year target | As is | `CategoryEditFields` (A2 edits one field at a time: restyle only) | 4 |
| Quick "New habit, n a week, Add habit" row | As is | the store's habit save (`saveEntry`) with a weekly count, no time [assumption: a habit without an activity is valid, as today] | 4 |
| Activities "n blocks a week in My week" / "Not in a week yet" | Derived | runs of the activity in the Goals week type (`goalsTemplate`) | 4 |
| Schedule chips + "+ New schedule" | As is | week types, `NewWeekTypePanel` | 6 |
| "Used in N weeks of 2026" | Derived | `appliedWeeks` + unassigned weeks rule | 6 |
| "Where the week goes" donut + Free + "x h planned · y h free · z h awake" | Derived | `templateSplit`; awake hours = 168 minus the week type's sleep hours, not A2's fixed 105 | 6 |
| Show sleep switch | As is | `timely.showSleep` | 6 |
| Grid, selection, "Add to these hours", chooser, "Clear these hours", Cancel | As is | the real grid (copy only; it keeps edge handles, Edit, Save, undo) | 6 |
| Ghost block with the hour count | As is | selection state of `useGridSelection` | 6 |
| Day tabs on phone (one day at a time) | As is, deferred | grid behaviour change (Q12) | later |
| Paint with + "Clear to My week", drag to paint | As is | `YearPainter`, Erase | 7 |
| 53-week grid, legend, this week outlined, counts | As is / Derived | `appliedWeeks`, ISO weeks | 7 |
| "Planned hours in 2026 of N awake hours" bar + shares + Free | Derived | `insightsBars(..., 'year')`, `availableShares` | 7 |

### 3.3 Progress, first run, account
| A2 feature | Class | Source or alternative | Slice |
|---|---|---|---|
| Headline in words, last 8 weeks | Derived | `adherenceReport` + `inWords`; window trimmed to the first tick (no "fewer than half" before any tick: empty state instead) | 8 |
| Week-by-week trend, current week dashed, tooltips | Derived | weekly bars of `adherenceReport` | 8 |
| Dream path nodes filled by progress | Derived | Year kept (2.1); hollow dots for areas without a value | 10 |
| Recap card "x of y planned hours ticked", steadiest and most-missed area | Derived | `recapData` from `done` and blocks | 8 |
| Recap ceremony (4 steps), carry-forward habit | Derived | most-behind weekly habit | 8 |
| "Done for the week" closed state, "Week 45 is closed", Reopen | Alternative | `timely.weekClosed` local key, per device (2.2) | 8 |
| Milestones list with dates ("First planned hour ticked", "Physical had a full week") | Derived | replay of `done` history | 11 |
| Milestone "Relational reached Steady" | Derived | replay of Year kept by date; ships only if 2.1 is accepted | 11 |
| Milestone and all-done toasts, one a day | Alternative | the "one a day" cap needs memory: `timely.lastToast` date key (local, outside planner state) | 11 |
| Settings: recap, milestone lines, calm line | Alternative | local keys (2.5) | 8, 11 |
| First-run welcome, 5 questions, rule table, Not sure | As is | pure code | 9 |
| Hours a week (1 to 20) | As is, not kept | used to build the draft only; the model has no budget field (Q15) | 9 |
| "A normal week" chips | As is, not kept | used for day order and start hour only | 9 |
| "Anything else? (optional)" free text | Not possible to keep | no field; A2 also ignores it. Alternative: [rec] drop the field, or offer to put it in today's journal note on Accept (Q16) | 9 |
| Editable draft, mini week, first action | Derived | draft in `useState` until Accept | 9 |
| Starter draft | As is | fixed rules | 9 |
| "Your plan is saved" toast | As is | | 9 |
| First-run seen flag (`timely.a2.seen`) | As is | existing `onboarding` field | 9 |
| Account: name, "Saved on this device only" | As is / Alternative | save status exists; name per 2.3 | 4 |
| Sample person, history, 62% / 43%, milestone dates | Not possible as shown | invented. Alternative: real derived values and honest empty states; a test-only fixture with a generated `done` history (`tests/unit/fixtures.ts` + a scratch loader) for screenshots, never in the app | 5 to 11 |
| Preview states footer, `?now=9:20` | Not shipped | prototype tools. Alternative: fixture saves and puppeteer clock emulation for captures | checks |

---

## 4. Slices (12; each mergeable and releasable)

Every slice: branch from `main` (`feat/a2-<n>-<name>`), CRLF kept, one PR, CI green, patch bump + CHANGELOG section in the PR, tag `v0.0.N` after merge, doer told "commit, do not push" (the owner pushes and merges). Browser checks: production build served from `.output/server/index.mjs`, headless Edge with puppeteer-core in the session scratchpad, 1280 and 400, light and dark, no horizontal overflow, no console errors (watch CSP violations), compared by eye with the A2 page at the same size and theme (`?now=9:20`).

### Slice 1. Version 0.0.1 and quick wins (S, 1 session)
- Goal: fix the cheap trust findings; start the release line (owner rule: first app PR bumps to 0.0.1).
- Files: `package.json` + lockfile version (`npm version 0.0.1 --no-git-tag-version`), `CHANGELOG.md` (`## 0.0.1`); `onboarding/OnboardingTour.vue` (hours per area leave out the Sleep activity, `isSleepActivity`); one awake-hours text helper `awakeHoursText` in `app/utils/planner/format.ts`, used by `ActivityGrid.vue` meta line and the week type chip in `WeekTypeBar.vue` ("3 h planned of 105 h awake"); `home/HomeTimeline.vue` (remove the sleep sentence, line 20); `home/HomeActivities.vue` (nothing planned: one line and one button to Week); `app/utils/onboarding.ts` (sessions start on today's weekday when they fit: pass `todayWeekday` into `buildOnboardingState`).
- A2 delivered: one awake-hours rule ("Sleep is not counted"), a block today after the guided build, no internal logic on the daily screen. Alternatives: none.
- Tests: build on a Sunday puts a session on Sunday; `awakeHoursText` with and without sleep.
- Risk: low. Rollback: revert. Verify: Guide me path at 1280 and 400; tour card, chip and grid agree.

### Slice 2. Remove Vuetify and the icon font (S, 1 session; owner OK on dependencies)
- Files: `package.json` + lockfile (uninstall `vuetify`, `vuetify-nuxt-module`, `@mdi/font`), `nuxt.config.ts`, delete `vuetify.config.ts`, `app/app.vue` (no `VApp`/`useTheme`; the dark watch sets only `data-theme`), `assets/css/base.css` (plain rules replace `.v-application*`), agent.md (Stack, Open items).
- A2 delivered: none visible (A2 has no framework). Faster first paint; target entry CSS under 80 KB, measured in the PR.
- Risk: medium-low (reset differences). Rollback: revert. Verify: before/after screenshots of all screens, sign-in, legal pages, entry form, grid edit box.

### Slice 3. Tokens, themes and Motion (M, 1.5 sessions)
- Files: `tokens.css` (A2 palette light and dark, radii, shadows, type scale; old variable names kept as aliases so feature CSS keeps working), `base.css`, `buttons.css` (pill, 44 px), `shell.css`, new `motion.css` (last import in `main.css`, all under `html[data-motion="lively"]`, ambient tint), `nuxt.config.ts` head script (data-motion, data-choice, data-part), `composables/useMotion.ts`, `utils/motion.ts`, `account/AccountMenu.vue` (Motion segmented control and note), check `utils/palette.ts` fill rule (3:1) on the new surface.
- A2 delivered: look and feel on the existing screens, Lively / Calm, ambient tint. Alternatives: area colours stay user data (`category.color` via `usePlannerFill`), not A2's fixed `--c-<id>`.
- Tests: `motion.test.ts` (reduce forces calm; unknown value means lively; part of day at 5, 12, 17); fill contrast on the new surface.
- Risk: medium (contrast, cascade). Rollback: revert. Verify: contrast spot checks; reduced-motion emulation; `curl -I` CSP unchanged.
- Docs: `spec/frontend-design.md` palette, radius, type, motion (Q1).

### Slice 4. Shell and routes: Today / Plan / Progress (M-L, 2.5 sessions)

**Done 2026-11-04** on `feat/three-screens` (not pushed), version 0.1.0: the place model (`app/utils/nav.ts`, the route model of 2.7 as built), the shell (rail, tab bar, top bar, skip link, `<main>`), Plan (Dreams, Week, Year) and Progress as frames over the unchanged views (`headless`), the call sites, the tour's places and the old-URL rewrite. The owner chose option A on the same day (`ux-information-architecture.md`, section 8.1). Deviations: the skip link sits in `app.vue` (the first stop in the DOM, before the rail); the theme switch is a top bar button and the Account menu keeps its Dark mode switch (the owner decides whether the menu row goes); the Plan sub-nav class is `plan-subnav`; the CSS for the shell and Plan is in `features/shell.css` (no `plan.css`).
- Files: new `app/utils/nav.ts` (`resolveNav`, `PLACES`, `toQuery`), `composables/useNav.ts` (places API; `tab`, `view`, `item`, `edit`), `shell/AppRail.vue`, `AppTabBar.vue`, `AppTopBar.vue`, `app/app.vue`, `pages/index.vue` (3 branches), `plan/PlanView.vue` + `PlanSubnav.vue`, a `headless` prop (no `<h1>`) on `HaradaView`, `PlannerView`, `YearView`, `progress/ProgressView.vue` (wraps today's Insights content), all call sites listed in 2.7, `useOnboarding.ts` `stepTarget` (places), new `plan.css` and rail styles in `shell.css`.
- A2 delivered: rail, tab bar, top bar, sub-nav, three surfaces, account name line. Alternatives: name per 2.3; screens inside are still today's (A2 content comes in 5 to 8).
- Tests: `nav.test.ts` (every old `?tab=` with and without `item`/`edit`, unknown, `plan` without `view`, round trip). `plannerStoreActions.test.ts` unchanged.
- Risk: medium-high: grid popups are teleported and measure the grid (`useGridPopups`), and the rail shifts the left offset; Escape order across sub-nav, grid box and entry form; focus on route change. Rollback: revert (no data).
- Verify (trace as in `refactor/split-views`): grid select, Apply, edge drag, Save, Cancel, Escape at 1280 mouse and 400 touch, same results as `main`; deep links `?tab=planner&item=<id>&edit=1`, `?tab=year&item=<wt>`, `?tab=goals&item=<cat>`, `?tab=insights`, `?tab=visualization`; Back and Forward keep the view; tour still lands on Week, Year, Today; route announcer reads the title.
- Docs: agent.md (Where things are, URL state, Navigation order), PRD FR-UX-5 + new FR-NAV-*, README; fill the decision template in `ux-information-architecture.md`.

### Slice 5. Today (M, 2 sessions)

Status: done (2026-11-05, `feat/today-screen` from `main` 0.1.0, not pushed; no version bump). Built as planned with the alternatives from 2.3, 3.1 and section 9 (Q7 and Q8 rec, still open for the owner). The three states, the focus rule, the countdown, "Behind this" (no %), the week strip, the day line on the awake range and All habits are in; the ring and the Today sleep switch are out. The FR-TODAY requirements are in the PRD; the parity log rows of 3.1 for Today are met except the % (slice 10) and cheer and sparks (slice 11).
- Files: `app/utils/today.ts` (`firstUndone`, `todayItems`, `weekStrip`, `countdownText`, `greeting`, `behindLine`, `nextHabitAction`), `composables/useShownDay.ts`, `components/today/*` (1.7, each under about 150 lines), `today.css` in place of `home.css` (same import position), `home/*` deleted once moved.
- A2 delivered: greeting, ambition line, focal card with countdown and "Behind this: <target>", day line with now marker, Also today, week strip with the forgiving note, one-line journal, all habits disclosure, the three states. Alternatives: name (2.3); the "Add Run this evening" button becomes "Plan Run in Week" (opens Plan > Week with today 6 PM preselected) or a habit Tick (3.1); day line range from sleep, not fixed. Deferred: "% of the way" (slice 10), cheer and sparks (slice 11).
- Tests: `today.test.ts` (focal order; habit focal when no block; strip classes for full, part, none, free, future; countdown texts; greeting boundaries; behind line with and without target; next habit action picks the most-behind weekly habit with an activity).
- Risk: medium (30 s clock on the client only; tick double-click). Rollback: revert.
- Verify: normal, all done and nothing planned with fixture saves; keyboard ticks; live region; 60-day limit.
- Docs: PRD FR-HOME-* to FR-TODAY-*, screens `today-*`.

### Slice 6. Plan > Week in A2 words and look (S-M, 1.5 sessions)
- Files: `PlannerView.vue` (order: chips, Where the week goes, Show sleep, grid, entry buttons), `TimeSplit.vue` + `TimeSplitDonut.vue` (title, Free slice and row, sum line, sleep note, "used in N weeks"), `WeekTypeBar.vue` (Schedule, + New schedule), `WeekGridBar.vue` + `WeekGridMenu.vue` (Add to these hours, Clear these hours), ghost label on the selection in `WeekGridDay.vue`, `utils/insights.ts` (Free label), week CSS files.
- A2 delivered: chips, Where the week goes with Free and awake hours, Show sleep switch, selection bar words, ghost block. Alternatives: awake hours from the real sleep hours; the real grid's extra verbs (Edit, Save) stay. Deferred: phone day tabs (Q12).
- Tests: label updates in `insights.test.ts`; a `weeksUsing(state, templateId, year)` test.
- Risk: low-medium (aria labels used as focus targets). Verify: the slice 4 grid trace again; phone scroll cue.
- **Status (2026-11-04, `feat/plan-week-a2`, not pushed): done.** Built: the lede; the schedule chips at the 44 px target and "Schedule", "+ New schedule", "Edit schedule", the panels' words; "Where the week goes" above the grid with the awake hours (`awakeMinutes`, FR-SLEEP-9; the same numbers as the meta line and the chip), Free as the last row, and "used in N weeks of <year>" (`weeksUsing`, tested); Show sleep at the left; every hour labelled; the dashed ghost with its hours in a pill; "Add to these hours…" and the menu line; the lede's "Schedule: <name>". Grid state, composables, `utils/weekGrid.ts`: unchanged; the 320-step grid trace at 1280 and 400, light and dark, matches the 0.1.0 build apart from those words and a sub-pixel popup position. Left, and why: the blocks print the activity code (the owner's phone choice; the name is in the block title and the menu); the planned fill stays the 3:1 rule (blocks are stronger than A2's 24% tint); the grid rows stay 28 px (the grid's geometry constant); the phone day tabs (Q12); the bar stays a popup beside the release point (its placement is the grid's rule), not the sticky bar; no "Clear these hours" on an empty run (the menu has it); the ghost does not ease (it would lag a drag); no Today marker on the day heads (grid markup); the body text is 15 px and the page title 30 px (global type, not Week's); the Free dot is hollow (the A2 hatch is a 10 px pattern); the card padding is 24 px (the token scale; A2 uses 28 px); the entry form and Year keep "week type" until slices 7 and 8; the ring turns in as arcs draw (A2 rotates it).

### Slice 7. Plan > Year, one question (S-M, 1 session)
- Files: `year/YearSection.vue`, new `year/YearSummary.vue` (one stacked bar + shares + Free), `YearPainter.vue` (Paint with, Clear to <default>, legend, counts, this week outlined), `PlannedBars.vue` (neutral capacity line, inside "More detail" with `RangeControls`), `ShareList.vue` (Free).
- A2 delivered: paint chips, week grid with legend, planned of awake bar, shares. Alternatives: monthly bars kept under a disclosure (A2 has none) until Q14.
- Tests: year summary total equals the sum of the monthly bars.
- Risk: low. Verify: one and two schedules; drag at 1280, tap at 400.
- **Status (2026-11-04, `feat/plan-year-a2`, not pushed): done.** Built: the lede; the paint tools, with "Clear to <active schedule>" as the erase chip; the schedule card (the count of weeks each schedule uses through `weeksUsing`, the grid of four rows of 14 weeks, the legend, the current week outlined; an unassigned week stays blank, and month labels sit above each grid row); `year/YearSummary.vue` (one stacked bar, the shares with Free last, Show sleep in its head; `yearSummary` in `utils/insights.ts`, tested: the planned total is the sum of the monthly bars and Free is the awake time less the planned hours); More detail (the range controls and the bars, closed by default); "schedule" and "Free" on the view. The files are `YearView.vue` and `YearPainter.vue` (no `YearSection.vue`: the card is the painter's own, and the summary is its own file). The alternative kept: the monthly bars stay under More detail (A2 has none). Left, and why: the mockup's 900 px column (the shell's 1120 px `.view`, the same for every Plan view; a shell decision); the row labels are removed (2026-11-04 follow-up), so the month labels above the weeks are the only months, as in the mockup; the schedule colours come from the saved data, so the mockup's colours differ; the week squares are 23 px at 400 px, 20 px at 360 px and 62 px at 1280 (phone: square corners, a 2 px gap) (a 44 px target would need a scroll across 14 weeks; the numbers stay); no "Plan · Year" eyebrow and "The year" title (the sub-nav names the view, as Week has no title); the summary is always in hours (the unit stays with the bars). Checks: the painter trace (sample, one schedule and an empty plan, 1280 mouse and 400 touch, base and branch) keeps the saved state identical at each step.
- **Follow-up (2026-11-05, `feat/year-planner-layout`, from `origin/main` 41d828e, not pushed):** the owner's five fixes. Year: the card is "Year planner" with the year switcher in its head; the paint tools and "Apply to several weeks" are inside it, under one hint line ("Pick a schedule, then click or drag across the weeks."); the last chip reads "Clear"; the lede is removed; the grid has bottom padding. Week: the schedules, the grid and the entry buttons are one card, and "Where the week goes" is a card below it. The Week lede names no schedule: it said every week uses the schedule, which the blank Year weeks contradict.

### Slice 8. Progress: headline, trend, recap (M, 2 sessions)
- Files: `app/utils/progress.ts` (`lastWeeks`, `trend`, `inWords`, `recapData`), `composables/useWeekClosed.ts`, `useProgressSettings.ts`, `progress/ProgressView.vue`, `ProgressTrend.vue`, `RecapCard.vue`, `RecapDialog.vue` (dialog, aria-modal, focus trap, Escape, focus return), `ProgressSettings.vue`, `AdherenceView` under "More detail", `progress.css`.
- A2 delivered: headline in words, 8-week trend with tooltips, recap card and ceremony, Plan next week, settings, tooltip component. Alternatives: closed state in `timely.weekClosed` (2.2); settings as local keys. Deferred: dream path (10), milestones (11).
- Tests: `progress.test.ts` (inWords at .85, .7, .45; no ticks gives the empty state, not "fewer than half"; current week flagged; recap with one area; window trimmed to the first tick; closed key for the current ISO week only).
- Risk: medium (dialog a11y, week rollover). Verify: keyboard-only recap; reload keeps closed; Monday rollover with an emulated clock.

**Status (2026-11-05, `feat/progress-a2` from `origin/main` (1eb570e), not pushed): built, except the dream path (10), milestones and the calm-line switch (11), and "% of the way" and the ambition ring (10).** Built: the eyebrow "Weeks 38 to 45" and the title Progress; the headline in words (`utils/progress.ts`: `inWords` at .85, .7 and .45; no tick gives "Your progress starts with your first tick."; planned hours with none in the tracked weeks gives "Nothing was planned in these weeks yet."); the Week by week trend (`ProgressTrend.vue`: eight columns, the figure always shown, the current week dashed as "So far", tooltips on hover and focus, bars grow under lively motion only); the Weekly recap card and its four-step dialog (`ProgressRecap.vue`, `ProgressRecapDialog.vue` on UiDialog; Done for the week closes the ISO week, Reopen opens it, Plan next week goes to Plan > Week); Settings with the Weekly recap switch (`ProgressSettings.vue`); the adherence view under "More detail" (closed; `InsightsView` unchanged). Rules: `utils/progress.ts` and `utils/recap.ts`, both on the adherence rules (`recordOf`, `habitRowsOf` and `measureOf` are exported now; no result changed). Local keys: `timely.weekClosed` (the ISO week key; the key was reserved and unread) and `timely.recap` (on by default), both in `utils/prefs.ts`. Storage version 8; no data-model change; no dependency.
Alternatives (2.2 and 2.5): the closed state is `timely.weekClosed` per device; the settings are local keys. Deferred as the plan says: the dream path card (10), the milestones card and its calm-line switch (11), "% of the way" and the ambition ring (10). The Settings card has the one switch that does something today. Log: the file names keep "Insights" (the body is `InsightsView`; renaming was not cheap).
Data-model gaps: none new. A recap that names areas and a carried habit uses the same day records as adherence. With nothing ticked this week the steadiest and most-missed areas are not named (every area is 0).
Checks: `progress.test.ts` (16 cases: the inWords thresholds; the empty states; a blank week; the current week; the trend and the headline equal the adherence weeks; the window trimmed to the first tick; the recap areas, the carried habit and the one-area case; the closed key for its ISO week only, across Monday); `prefs.test.ts`. Browser, production build copy at 1280 and 400, light and dark, Calm and Lively: 30 checks in one flow (the recap opened and closed with the keyboard, Escape with focus return, Done for the week, the closed card, reload, Reopen, the Weekly recap switch off and on across a reload, a Monday rollover with a faked clock from Sunday 8 to Monday 9 November, the tooltip, no overflow); no console errors. Focus was placed on each button by script and the key pressed; the Tab order was not walked key by key.
Mockup comparison (computed styles of the matching elements, `pg-probe`): the headline (30px, 500, the accent share), the card radius and shadow, the card title (18px, 600), the recap title and text, the switch and the page title size match, or differ only as recorded in the report. Left, with reasons: the content width (the app's view is 1120 px by the slice 3 and 4 decision for every surface; the mockup's column is 900 px less 56 px padding; the owner decides for all surfaces); the card padding (the app's 32 px card token, the mockup 28 px); the page title (30 px, the title token every screen uses, the mockup 36 px); the notes at 14 px (the nearest token to the mockup's 15 px); the bar height 150 px as the mockup.
Screens: `spec/screens/progress-*` (desktop and phone, light and dark, the dialog, the closed card, the Monday rollover, the empty state and a blank week).
NOT VERIFIED: a signed-in (Supabase) account; a real phone or a touch screen; a screen-reader pass (the markup and the focus were checked, the speech was not); the Tab order key by key; reduced motion beyond the `data-motion` attribute; the trend tooltips at 400 px (checked by the computed content, not on a touch screen).

### Slice 9. Rules-based first run (L, 3 sessions)
- Files: `app/utils/firstRun/rules.ts` (follow-up table for all 8 default areas, presets, defaults; ids from `createLifeAreas` [assumption: stable ids, check `seed.ts`]), `firstRun/draft.ts` (`buildDraft(answers, today, stamp)`: habits, activities and slots within the hours budget, day order from the week chips, **first session today when it fits**, `firstAction`, "x of y sessions fit"), `firstRun/starter.ts`, `firstRun/toState.ts` (draft to `PlannerState` via `createOnboardingState` + `applyActivityCells`, sharing code with `buildOnboardingState`), `composables/useFirstRun.ts` (replaces `useOnboarding.ts` phases; answers and draft in `useState`, never saved), `firstrun/*` components, delete `OnboardingFlow.vue`, `OnboardingTour.vue` and tour CSS, `app.vue` (full-page first run hides the shell), `AccountMenu.vue` (Replay first run with the replace warning).
- A2 delivered: welcome, five questions with the rule table and Not sure, hours stepper, editable draft with mini week and first action, starter, toast, ending on Today. Alternatives: hours and week answers used for the draft only; "Anything else" dropped or put in the journal (Q16); no Skip (2.4).
- Tests: `firstRun.test.ts` (each rule; Not sure says which default; budget caps sessions; weekends-only order; first action today when today has room; starter; `toState` passes `validatePlannerState` at version 8; unique short codes, never `SLP`).
- Risk: high (whole-state replace; Supabase first-run path never run on a real project [fact, agent.md]). Rollback: revert restores the old flow.
- Verify: fresh profile to Accept by hand under 3 minutes; starter; network off; saves without `onboarding` never see it; Escape does not close; focus to each step heading; reload mid-way reopens Welcome while `pending`.
- **Tag 0.1.0 after this slice.**
- **Status (2026-11-05, branch `feat/first-run-a2` from `origin/main`, local commit, not pushed; the version stays 0.1.1 and nothing is tagged):** built as above. The guided path, the tour cards, `OnboardingIntro.vue`, the "Watch the short intro" link, Start empty and `useOnboarding.ts` are gone; `IntroPlayer.vue` stays for the sign-in page. Checks: 810 unit tests in 38 files, typecheck 0, production build clean; 66 browser checks on a production build copy at 1280 and 400, light and dark, Calm and Lively, mouse and keyboard (Not sure, weekends only, hours at 1, 5 and 20, the starter, offline, a pending reload, Escape, Replay with data (Cancel, Escape, Keep my plan, Replace), an empty plan, a save without the flag). Screens: `spec/screens/firstrun-*.png`. Found and fixed while checking: the component folder `components/firstrun/` did not resolve in Nuxt (`<firstrunpage>` rendered as a plain element; renamed `first-run/`, and the typecheck does not catch it); the starter's Back led to an empty draft (a starter sets the answers too, and Hours sends a missing answer back to its question); the seven-day mini week broke words on a phone (under 480 px each day is a row). Not verified: Supabase mode on a real project (code read only).
- **Follow-up (2026-11-05, same branch, one commit):** the theme button is on the first-run page, top right (`ThemeButton.vue`, shared with the top bar; `timely.dark`, the same preference). The mini week's blocks rise in one after another in Lively (`--i` and `--stagger`, the mockup's `.mini .mb`); Calm shows the week at once.
- **Built instead of a data field (no model change):** "Anything else" is dropped (Q16, the plan's first recommendation; there is no field, and the mockup does not keep it either). The hours and the week chips shape the draft only (Q15). The 1-year target of each area is the Harada seed wording, not the mockup's "First step: X" placeholder, so each draft target is real text the owner already reads on Goals. The starter is the rules' own draft (Run three times, a family evening twice, five hours, evenings), not fixed slots. The toast says "Today shows what is next." because Today shows the next block of the day, not always the first action. Keep my plan is the exit of a replay (no Skip, and Escape does nothing). The sample-data link shows in development only (`import.meta.dev`, the plan's 2.4 assumption).
- **Left, and why:** Motion is not on the first-run page (the A2 setup has no motion choice; Lively shows the page rise, the mini week's stagger and the toast; Calm shows all). The theme button is on the page since the follow-up below. The "Working days" chip has no effect of its own (it only switches off the weekend-only order; weekends last is already the default), so the owner may drop it; a free-time answer does not add sessions beyond one a day per habit, so Free weekends with a weekly habit of three gives two sessions (stated in the note).

### Slice 10. Year kept: %, stages, ambition ring, dream path (M, 2 sessions; blocked on 2.1 sign-off with the owner's real save)
- Files: `app/utils/targetProgress.ts` (`areaProgress` returning the four states of 2.1, `stageOf`, `ambitionAverage`), `today/TodayAmbition.vue`, `TodayFocus.vue` ("n% of the way there"), `harada/LifeAreaList.vue` (bar, %, stage), `harada/CategoryDetail.vue` (stage eyebrow, bar), `progress/DreamPath.vue` (SVG path, node buttons to Dreams, wide and narrow layouts by `matchMedia`), a "stages" switch in `useProgressSettings`.
- A2 delivered: ambition ring, stages, % on rows and focal card, dream path. Alternatives: derived Year kept, hollow states instead of 0%.
- Tests: `targetProgress.test.ts` (cap per day/week/month; window from the first tick and rolling at 364 days; the four states; mean of included areas only; seed with no `done` gives no ring; the seed table in 2.1 as fixtures).
- Risk: medium (a number that feels wrong). Rollback: switch off or revert.

### Slice 11. Lively layer and milestones (M, 1.5 sessions)
- Files: `composables/useViewTransition.ts` (route change only, lively only, promises caught, focus to `#main` after), Today motion (sparks, count-up, glide, tilt, cheer line; CSS keyframes and a small count-up helper, no library), `app/utils/milestones.ts` (first tick, first full week of an area, stage reached if slice 10 shipped), `shell/AppToast.vue`, `timely.lastToast` cap, `motion.css`.
- A2 delivered: transitions, sparks, count-ups, glide, tilt, cheer, toasts, milestones list. Alternatives: one-a-day cap via a local key.
- Tests: `milestones.test.ts`; cap test.
- Risk: medium (transition a11y, bundle). Budget: no dependency, under 5 KB gzip JS added, measured in `.output`. Verify: Calm and reduced motion show every number and line; the count is announced once; the toast clears the phone tab bar.

### Slice 12. Polish, docs, screens (S-M, 1 session)
- Empty states per surface, copy pass against proposal 6e, `spec/screens/` replaced, `frontend-design.md` final, README, PRD changelog, `build-plan.md`, agent.md Current state trimmed. Tag 0.2.0.

---

## 5. Sequencing, parallel work, old tabs

Order: 1, 2, 3, 4, then 5 / 6 / 7 / 8 in any order, then 9, 10, 11, 12.
- 1 first: cheap, independent, starts the version line.
- 2 before 3: tokens should not fight Vuetify's reset. 3 before 4: the shell is styled once.
- 4 is the one big switch; everything after depends on its routes.
- 5, 6, 7, 8 touch separate folders and CSS files: parallel worktrees are possible if each adds its own CSS file and `main.css` line; agent.md and CHANGELOG conflicts are small. [rec] two at a time for review load (5 + 6, then 7 + 8).
- 9 needs 5 (ends on Today). 10 needs the 2.1 sign-off, 5 and 8. 11 last among features.
- The 2.1 check on the owner's save can run any time before 10 (a scratch script calling `targetProgress` on an export).

Old tabs: [rec] **direct replacement, no feature flag.** Dev mode, no users, solo owner; a flag would keep two shells, two cascades and two route models live and double the browser checks. Slice 4 is complete on its own (every old screen reachable inside the three surfaces, every old URL redirected), so `main` is releasable after it. If slice 4 stalls, it stays on its branch.

---

## 6. Risks, tests, rollout

### 6.1 Risks
| Risk | Slice | Mitigation |
|---|---|---|
| Week grid regressions (popups, edges, touch slop, Escape) | 4, 6 | Grid composables untouched; the split-views trace re-run at 1280 mouse and 400 touch, compared with `main` |
| Deep links | 4 | `resolveNav` tests for every old form; canonical replace; 8-URL browser list |
| Tour routes | 4 to 9 | Places in `stepTarget` (4); tour deleted (9) |
| CSS cascade order | 3 onward | New files appended at the end of `main.css` in a documented order; emptied files deleted; no new `!important` |
| Contrast with the new palette | 3 | Measured checks; fill rule re-verified |
| Animation weight | 11 | No libraries; native View Transitions; `.output` sizes in every PR |
| View Transitions a11y | 11 | Route change only, lively only, focus after `finished`, skipped on a second navigation, fade fallback |
| Hydration | 4, 5 | Views stay in `ClientOnly`; clock and greeting after mount |
| CSP | 3, 11 | Only the existing head script grows; no inline handlers; `curl -I` check |
| First run replaces the state | 9 | Never for saves without `onboarding`; Replay warns |
| Size guard | 4, 5, 8, 9 | Components pre-split; `npm test` after each file |
| A2's invented data read as a spec | 5, 8, 10, 11 | Parity log (section 3) is the contract; reviewer checks each slice against it |

### 6.2 Test strategy
- Unit (Vitest): every new pure module (`nav`, `motion`, `today`, `progress`, `targetProgress`, `milestones`, `firstRun/*`, `awakeHoursText`), dates and minutes passed in.
- Characterisation: `plannerStoreActions.test.ts` and `store*.test.ts` unchanged in every slice (proves no store change); `toState(draft)` validated at version 8.
- Browser traces (scratchpad puppeteer, not committed): grid trace, deep links, first-run path, recap keyboard path, reduced motion; JSON pass/fail plus screenshots.
- Fixtures: a generated `done` history in `tests/unit/fixtures.ts` for derived rules and for screenshots (the seed has no ticks).

### 6.3 Rollout
- Patch tag per merged slice (0.0.1 = slice 1, 0.0.2, ...), CHANGELOG section in each PR.
- **0.1.0**: owner decision on 2026-11-04, cut at slice 4 (three screens: Today, Plan, Progress; old links redirected; saved state version 8 unchanged). It was planned after slice 9; the first-run rebuild (slice 9) follows in a later version. Release notes in CHANGELOG; the tag and the GitHub release are the owner's to make.
- **0.2.0** after slice 12: Year kept, stages, ring, dream path, lively layer, milestones.
- Before 0.1.0: load an export of the owner's save in a local build and walk every surface.

---

## 7. Documentation per slice
| Slice | agent.md | frontend-design.md | PRD | screens / README |
|---|---|---|---|---|
| 1 | Current state | - | FR-ONB-5, FR-HOME-10 | - |
| 2 | Stack, Open items | Vuetify note | - | - |
| 3 | Style | palette, radius, type, motion | new FR-UX-10 (motion) | - |
| 4 | Where things are, URL state, Navigation | shell, sub-nav | FR-UX-5, new FR-NAV-* | README, `nav-*` |
| 5 | Today section | Today parts | FR-HOME-* to FR-TODAY-* | `today-*` |
| 6 | Week | vocabulary | FR-PLAN-23, 27 | `plan-week-*` |
| 7 | Year | year chart | FR-YEAR-7, FR-INS-P5 | `plan-year-*` |
| 8 | Insights to Progress, local keys | charts, recap | FR-INS-P6, P7 to FR-PROG-* | `progress-*` |
| 9 | Onboarding | first run | FR-ONB-* rewritten | `firstrun-*` |
| 10 | Model and decisions (derived Year kept) | stages | FR-GOALS-28, FR-PROG-* | - |
| 11 | - | motion rules | milestones | - |
| 12 | trim | final | changelog | all refreshed |
Also: keep the parity log (section 3) in `spec/` (for example in `ux-information-architecture.md` section 8) and tick it per slice; the privacy page lists the new local keys if it lists any.

---

## 8. Effort (doer sessions, rough)
1: 1 · 2: 1 · 3: 1.5 · 4: 2.5 · 5: 2 · 6: 1.5 · 7: 1 · 8: 2 · 9: 3 · 10: 2 · 11: 1.5 · 12: 1. **About 20 doer sessions**, plus one planner/review pass per slice. Confidence low-medium; slices 4 and 9 carry most of the spread (either could double).

---

## 9. Open questions for the owner
1. Palette: adopt A2's warm paper and cobalt in place of white and #1b4b8f (rewrites `frontend-design.md`)? Ambient tint in Lively: yes?
2. Year kept (2.1): accept, after a check on your real save, or show no percentage?
3. Dark toggle in the top bar (A2) or in the Account menu?
4. Done for the week: local key (rec) or session only?
5. Remove Vuetify and the icon font (dependency change)?
6. Gamification switches on Progress (A2), in the Account menu, or both?
7. Today's "x of y done": include daily habits (A2, rec) or blocks only (FR-HOME-19)? Progress adherence stays blocks only.
8. Today's habits: all habits (A2) or only habits with no day (today)?
9. Plan's default view: Dreams (A2) or Week? Rec: last view in the session, default Week.
10. Keep "Watch the short intro" on the first-run Welcome?
11. Replay first run for a user with data: warn and replace, or preview only?
12. Phone week grid: keep the 7-column scroll now, A2 day tabs as a later slice?
13. Progress: keep the old range controls and bars under "More detail" for 0.1.0?
14. Year: keep the monthly bars under "More detail"?
15. Empty Today: "Plan Run in Week" (preselected hours) instead of A2's one-day block (needs a model change)?
16. First-run "Anything else" text: drop it, or put it in today's journal note on Accept?
17. Version cadence: patch tag per slice, 0.1.0 after the first run, 0.2.0 after polish?
