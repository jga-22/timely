# Timely: UX proposal for strangers

Status: proposal, not built. Written 2026-11-02 from the owner's walk-through of the production build (headless Edge, 1280 and 400 px, light and dark), the analysis notes in the session scratchpad (journeys, concepts, navigation, charts, states) and the earlier technical audit. Nothing in the app has changed. Updated 2026-11-03: the first run is rules-based, and AI is a later option (section 6a).

How to read the labels: **evidence** means something we observed in the build or measured; **taste** means a judgement about what looks or reads well; **hypothesis** means something we think will help and have not tested. Vendor and market claims are weakly sourced (section 2) and are marked as such.

Mockups (static HTML, sample data, one file each): [index](mockups/index.html), [first run, rules-based](mockups/first-run.html), [Home as a cockpit](mockups/home-cockpit.html), [charts](mockups/charts.html), [Week in plain words](mockups/week-grid.html), [motivation without pressure](mockups/gamification.html), and a [working prototype](mockups/prototype.html) of the whole product with dummy data. They are sketches for discussion, not the app, and nobody has tested them.

---

## 1. Question and verdict

**Question:** is Timely ready for strangers to adopt, for its simplicity and its visual design?

**Verdict: not yet.** The visual system is sound (one font, calm blue, quiet surfaces, good dark mode), and the daily loop works once there is something to tick. But a stranger meets the product in the wrong order and with the wrong numbers:

- The first numbers contradict each other. After "Guide me" the same screen says 66 h, 3 h planned and 3 h of 105 h, and the 66 h includes 63 h of sleep (evidence).
- Four of seven days after Guide me, Home is empty or near empty (evidence, from the production build on the owner's first-run path, with one habit three times a week).
- The first sentence on Home is internal logic: "Sleep is hidden: its hours are left off the bar, and a nap counts as unplanned" (evidence).
- Every screen has several equal-weight controls and no single focal point (evidence, from the screenshots; taste on what "focal" should mean).
- Vocabulary load is high: about 9 terms in onboarding, 9 to 11 on the Week tab alone (evidence from the DOM text inventory).

The product idea is strong (linking an ambition to a weekly plan and to what was ticked is not common, section 2). The adoption problem is the first 5 minutes and the first empty screens, which are fixable without changing the model. The recommended first step is a short rules-based first plan that ends on a populated Home with a first action for today (section 6a). No AI is planned for now.

**What would change the verdict:** a stranger reaches a populated Home in under 3 minutes, names the next action in 5 seconds, and comes back on day 3 without prompting (section 10 tests this with 4 to 5 people).

---

## 2. Market and positioning

Short, and weakly sourced. We did not verify current features, prices or user numbers for any product named here in this round; treat the names as a map of categories, not as a competitive audit.

- **Planners that schedule the day or week:** Sunsama, Structured, Motion, Reclaim. They are about turning tasks into a calendar. Most assume a task list already exists.
- **Habit trackers:** Streaks, Finch. They are about a daily tick and a streak. Most are built around a counter that resets, and several use reward mechanics (section 7).
- **Harada goal tools:** Harada.app, Open64, OW64. The Harada 64-cell method is a small niche: people who know the method come for it, and it is rarely combined with a calendar.

**Timely's gap:** the link between the long-term ambition, the weekly plan and what was actually ticked. A habit points at an activity, the activity fills hours in the week, and the ticks show whether the plan was lived. Planners do not usually hold the 5-year why; habit trackers do not hold the calendar; Harada tools do not hold the week.

**The category's main risk is retention.** Users arrive with intent and leave after a few days, and the setup burden is a known cause of early abandonment in planning and habit apps (general literature and vendor blogs; the evidence is weak and mostly from people who sell the tools). For Timely this is a hypothesis to test, not a fact: the first-run path ends on an empty Home for many days of the week (section 4, finding 2).

---

## 3. Adoption criteria and scorecard

Five criteria. Scores 1 (fails) to 5 (a stranger does it without help). Scores are our judgement from the walk-through, not from users. Evidence is the walk-through and the screenshots in the scratchpad (`shots/`).

| Criterion | Score | Evidence |
| --- | --- | --- |
| **5-second understanding**: what is this and what do I do now? | 2 | The first screen after Guide me is the Week tab with a tour card on top of the grid, and the card says 66 h (evidence). Home opens with the sleep sentence (evidence). The Goals list is clear (the best-composed screen). |
| **Time to first value**: first block, then first tick, from the first click. | 2 | Guide me is 4 clicks to a block and 5 to 7 to Home, about 3 minutes with 3 typed fields (evidence, est.). Start empty: 6 to 9 steps to a first block, with no guide (est., not walked). |
| **Daily loop**: does Home do its job on an ordinary day? | 3 | On a day with blocks, Home is good: the list, one tick, the ring turning into a green check (evidence). On a day with none, Home is a heading, an empty bar and one line, and no next action beyond a text link (evidence). |
| **Visual quality**: calm, clear, one focal point per screen. | 3 | Chrome, type and dark mode are calm and consistent (evidence). The data is loud: saturated week blocks, a red Year ceiling, near-black painter cells, and equal-weight outlined buttons everywhere (evidence, taste on "loud"). |
| **Trust**: do the numbers and the words match, and does the product respect me? | 2 | Numbers disagree on one screen (evidence). Sleep is counted in one place and not another (evidence). Red is used for a ceiling, which reads as an error (evidence, taste on the reading). Privacy and reset are present and plain (evidence). |

Average 2.4. A product with these scores is ready for enthusiasts who will read the manual and not for strangers.

---

## 4. Findings, ranked

Ranked by severity first, then by how much a stranger is stopped. Severity: **H** blocks adoption or reads as a bug; **M** visibly unpolished or slows the first 5 minutes; **L** nitpick. Effort: **S** under 2 days, **M** 2 to 5 days, **L** more than 5 days (our estimate, one developer). Each finding is marked evidence (E) or taste (T).

| # | Sev | Finding | Evidence | Fix | Effort |
| --- | --- | --- | --- | --- | --- |
| 1 | H | **Contradicting hour numbers after Guide me.** The tour card says "Timely placed 66 h for Physical". The chip says "My week 66h". The grid header says "3 h planned". The donut says "3 h planned of 105 h". The 66 h includes 63 h of sleep. | E: `j-guide-04-tour1-1280` | One rule, one place: awake hours only (105 h), sleep shown only as "sleep, not counted". Every number on the screen uses that rule. The card's text is rewritten (section 6e). | S |
| 2 | H | **Empty Home four days in seven after Guide me.** With a habit three times a week, the first block lands on one weekday. On other days Home shows "Nothing planned today". | E: `s-one-home-1280` (Sunday), `s-one-home-400` (Monday shows "Run, 0 of 1 done") | First run ends on a block that is today (first-run mockup, section 6a). Home with nothing planned offers one next action (cockpit mockup, state 4). | M |
| 3 | H | **Internal logic as the first sentence on Home.** "Sleep is hidden: its hours are left off the bar, and a nap counts as unplanned." A "Show sleep" button sits above an empty bar. | E: `s-empty-home-1280`, `s-full-home-1280` | Remove the sentence from Home. Show sleep is one setting, out of the way. The bar shows the day, not the rules (section 6b). | S |
| 4 | H | **Too many clicks to the aha.** The first tick is 5 to 7 clicks from Guide me and only exists if today has a block. | E: `journeys.md` tally | The first run ends on a block for today (section 6a). Target: an accepted plan and a populated Home in under 3 minutes. | M |
| 5 | M | **Week vocabulary load.** Week type, Apply, Change, Edit, Save, Cancel, Sleep hours, Show sleep, Time split, Not planned, Paint with, Erase, block, short codes (WRK, TRN). About 9 to 11 terms on one tab. | E: concepts inventory | Plain words (section 6e): Schedule, Where the week goes, Free, Add to these hours. Short codes off by default. One action per selection. | M |
| 6 | M | **Year is premature for a new user.** With one week type, 53 identical tiles, a painter with one option, and bars that are slivers under a red line. | E: `s-one-year-1280` | Show Year's painter only once a second schedule exists. Until then, a line: "Every week uses My week. Add a second schedule to plan holidays." (section 6d) | S |
| 7 | M | **Insights repeats one percentage.** The headline says 77%; the donut repeats it; four weekly bars repeat it; life-area bars and two sub-lines repeat it again. | E: `s-full-insights-1280` | One headline, one weekly trend, one legend (section 6d). Life areas move to Year and Home. | M |
| 8 | M | **Goals empty state is eight identical rows.** "No 5-year goal yet / No target yet · No habits or activities yet / Add a goal", repeated eight times. | E: `s-empty-goals-1280` | Show the one area the user chose, and a single "Add your first area" line for the rest. Empty areas stay in the list, folded to one line (proposal section 6c). | S |
| 9 | M | **No focal point per screen.** Every tab opens with a 28px title and 40 to 60px of space, then equal sections separated by hairlines. Buttons are outlined and equal everywhere. | E: `states.md` issues 13 and 14 | One primary action per screen, named by the screen's job (Tick, Add to these hours, Plan next week). Titles that say something ("Today", "This week"). | M |
| 10 | M | **Navigation shows five equal labels.** Five tabs imply five equal jobs; on day 1 four of them are empty or generic. | E: `navigation.md` | Model C: Home and Week up front; Year and Insights say what unlocks them and are reachable from the first day (section 6c). | M |
| 11 | L | **Small issues.** Week on phone shows 5 of 7 days with the day headers cut and no cue that it scrolls. The Home ring is 28px and almost invisible at 0. Insights' Month/Week and More options wrap onto two uneven rows on phone. Mixed microcopy: warm lines next to system lines ("Counted from 9 October 2026 to today, 24 days."). | E: `s-full-planner-400`, `s-one-home-400`, `s-full-insights-400`, `s-full-insights-1280` | A scroll cue and a fade on the Week grid (week-grid mockup). A larger ring beside the title (cockpit). One line of copy style (section 5). | S |

What works and should not change: the Goals list, the calm palette, the dark theme, the Home tick and ring, the Week grid as a calendar, the honest empty-state line on Year ("Plan the week in Week and the hours show here") and the Insights headline itself.

---

## 5. Design principles to adopt

These are the rules we would check each change against.

1. **One focal point per screen.** Each screen has one thing the eye lands on first, and one primary action. Taste, backed by the scorecard's visual score.
2. **One question per chart.** Each chart answers one question and has one number to read first (section 6d). Evidence: the Insights and Time split screens answer several questions at once.
3. **Plain words.** Use the words the user will see in their own life. Keep the model's words (entry, block, week type) out of the screens (section 6e). Taste.
4. **Progressive disclosure.** Hide what is not needed yet: second schedules, painter, Show sleep, short codes, Grid view, More options. Show it when the user has the thing it works on. Evidence: findings 5, 6, 7.
5. **Calm colour; red only for real alarms.** Red is for an error the user must act on. A ceiling, a target or a warning is neutral or amber. Evidence: the Year line, finding 6.
6. **Human microcopy.** Say what happened and what to do, in one line. "Nothing planned today. Add something for 6 PM?" rather than a rule about hidden sleep. Taste, applied to empty states and onboarding first.
7. **Craft practices (reference only; from jakub.kr/skills, not adopted as a standard):**
   - Concentric radii: an inner radius equals the outer radius minus the padding (the mockups use 28 px outer, 12 px padding, 16 px inner on phone frames).
   - Optical alignment: align icons and numbers to the text baseline and the centre of their hit area, not to their box edge.
   - Hit areas: 44 px minimum for every tap target, even when the visible mark is 22 px (the cockpit's tick is a 44 px button around a visible circle).
   - A type scale with few steps (the tokens use 12, 13, 15, 18, 28; the mockups add 22 and 34 for headlines only).
   - Contrast: body text 4.5:1 or better; non-text controls 3:1 (the tokens already meet these; the mockups use them).
   - Copy for empty states and onboarding is written as a short, warm sentence with one action.

---

## 6. Proposed direction

### 6a. First run: a rules-based plan, built in under three minutes (recommended)

Decided 2026-11-03 (owner): the first run is rules-based. No AI is part of the plan now. An AI-drafted version is kept as a later option (see "Later" below), not as a phase.

**Goal:** a stranger ends the first run with a plan they have read and edited, and a first action for today on Home.

**Recommended flow** (mockup: [first-run.html](mockups/first-run.html), parts A to C; the working screens are in [prototype.html](mockups/prototype.html), first run):

1. **Welcome.** One screen: what the next three minutes do, with "Start, about 3 minutes" and "Use a starter instead". Nothing is saved until the user accepts a draft.
2. **Five questions, adapted by rule (six at most):**
   - What do you want to become? (one sentence, free text; required)
   - What matters most this year? (one to three life areas as chips; at least one; required)
   - One follow-up on the top area, from the fixed rule table below (chips with presets, plus "Not sure").
   - What does a normal week look like? (chips for working days, evenings and weekends; free text optional)
   - How many hours can you give to your goals each week? (a stepper, 1 to 20 hours, default 5. Sleep is never asked.)
   - Optional: what do you already do? (chips; can be skipped)
3. **A draft plan, shown before anything is saved.** The ambition, each chosen life area with a 1-year goal, its habit and linked activity, the week (a mini grid), and the first action for today. Every field is editable. The line "A draft from your answers. Edit anything." sits on the draft. Buttons: "Accept plan" and "Use a starter instead" (the starter replaces the draft and is shown as a draft too).
4. **Home, populated.** The accepted plan is written through the existing store actions. Home shows the first action for today, one tick, and the ambition in one line.

**Adaptive rules (fixed, in code; no model).** The rule table covers Physical, Professional and Relational in this round. Any other area gets one default habit, which the user can change.

| Answer | Next question or result |
| --- | --- |
| Physical | "What would a good month look like for Physical?" Presets: Run, three times a week; Walk, daily. Default: Run. |
| Professional | "Which piece of work would make this year count?" Presets: Focused work, three mornings a week; Weekly planning. Default: Focused work. |
| Relational | "Who do you want more time with?" Presets: Family evening, twice a week; Call a friend or relative. Default: Family evening. |
| Two or three areas | The follow-up is asked for the first area chosen. The others get their default habit. |
| Hours under 3 a week | Says why ("three hours is enough to start; you can add more later") and offers the starter. |
| "Not sure" to a follow-up | The rule default is used, and the draft says which default it used. |

**What "mandatory" means.** The required answers are the ambition sentence and one area with one habit (a preset, or the starter). Until the plan is accepted or the starter is chosen, Home shows the plan step, not an empty Home. It is not a sign-up wall: every answer can be changed later.

**Limits that keep it short:** an accepted plan in under 3 minutes; at most six questions; every question has a default; "Not sure" is an allowed answer.

**Safe escape.** "Use a starter instead" is always on screen. It applies the Physical and Family starter (one habit each, a week already set) as a draft, and asks for Accept. It skips the typing, not the plan. A plain "Skip" that leaves an empty Home is not offered (open decision 1).

**Storage and trust.** The draft is held in memory until Accept. Accept goes through the same store actions in local and Supabase mode, so both store the same state. The answers are not kept after the draft is accepted or discarded. The first run reads no journal, ticks or other data. No new storage field: `onboarding` already marks the first run (FR-ONB).

**Why rules first.** The rules path proves the flow and gives the time-to-value baseline. It needs no server, no provider, no consent text and no privacy change, and it works offline. Its output is the same planner state any later version would produce.

**The tension, stated plainly.** Setup friction is among the most-cited causes of early abandonment in this category (weak evidence, section 2). A mandatory step adds friction. It only works if it is short and shows value at the end: the draft must read as the user's own life, and the first tick must come within minutes. If the test (section 10) shows a median above 5 minutes to an accepted plan, the mandatory part goes and the starter becomes the default.

**Risks**

| Risk | Likelihood and impact (our estimate) | Mitigation |
| --- | --- | --- |
| Setup abandonment at the first question | High, high | Short flow, starter always visible, time measured in the test |
| A plan that does not fit the person (generic presets) | Medium, medium | Every preset editable before Accept; "Not sure" is a clear answer |
| Trust in a draft that looks mechanical | Medium, medium | Every line names the answer it came from; edit before Accept; the fit question in the test |

**Time to first value (the test).** Measure from the first screen to (1) an accepted plan and (2) the first tick of the first action. Targets (hypotheses): an accepted plan in under 3 minutes (median), the first tick in under 4 minutes. Baseline: the current build, where a first block takes 5 minutes or more (section 10, Task 1). Also record: questions answered or skipped, fields edited before Accept (a high count means the draft is off), starter use, and return on day 2 or 3. Five people show whether the flow breaks; they cannot confirm a target.

**Later: AI-drafted wording (not planned, not scheduled).** If the owner reopens this, it would be an optional phase after the rules flow has been tested. It would need: a Nuxt server route (for example `server/api/first-plan.post.ts`) with the provider key server-side only; an explicit consent screen before any answer is sent, naming the provider; the Privacy Policy and Terms updated (`app/utils/legal.ts`, `lastUpdated`); a per-user rate limit and a monthly cost ceiling with a hard stop; a timeout with the rules path as the fallback; the model's output checked against the planner types before the store (ids made by the app, hours and times computed by the app, unknown fields dropped); and no answer text in logs. The rules path would stay the default and the fallback. The risks of that phase (provider choice, cost, legal review, prompt injection) are not assessed here.

**Phases**

- **(a) Rules-based first run (recommended).** Section 6a as written. Effort: M to L. Roadmap P2.
- **(b) AI-drafted wording.** Later, not scheduled (see above).
- **(c) Refinements** ("make my week lighter") as previewed edits. Later, not scheduled.

### 6b. Home as a cockpit

**Goal:** Home answers three questions in one screen: what is next, what is it for, and how is the year going.

**Shape (mockup: [home-cockpit.html](mockups/home-cockpit.html)):**

- **Header:** the date, the week number and the ambition in one line, with a small ambition ring at the right (the average of the 1-year targets, unweighted, so there is no hidden weighting).
- **Today's focus:** the next block as a large card, with its time, its life area, the one line "Behind this block: ..." that links it to the 1-year target and shows how far along it is, and a 44 px tick.
- **Today's blocks:** the day's list with a tick each, and a small ring for "1 of 3 done".
- **This week so far:** seven small cells (done, partly done, missed, to come) and one sentence: "3 of 5 planned sessions so far. A missed session costs one session, nothing else: no streak resets." Forgiveness is the default (section 7).
- **1-year progress by life area:** slim bars, one per area, with the percentage at the end and "Set one in Goals" for areas with no target.
- **Habits, grouped by life area:** the habits due this week, with a tick each, under their area name. The count is "3 of 6 ticked today".
- **Journal:** one prompt line, "What got in the way today?", with a "Write a note" button that is secondary.
- **States:** all done (the focus becomes a calm "Today is complete" line; one milestone line at most), and nothing planned (one suggested next action, built from the habit that is most behind its target this week, with a button and a dismiss).

**Rules:**
- The sleep sentence leaves Home. Show sleep moves to the Week tab and to Settings.
- Numbers on Home use awake hours only.
- One primary action on screen: the focus tick, or the next action in the nothing-planned state.

**Evidence:** findings 2, 3, 9. **Taste:** the layout and the grouping. **Hypothesis:** that "behind this block" makes the link between ambition and daily action felt.

### 6c. Navigation: Model C with unlocking

From the navigation analysis in the session scratchpad (navigation.md) and the proposed direction. Model C: Home first, Week second, and Goals as a card on Home until it is needed as a tab.

- **Tabs from day one:** Home, Week, Goals, Year, Insights. Keep all five reachable (the tab list is the same for all users) but make the first two the primary path.
- **Year and Insights say what unlocks them.** On day 1 Year reads: "Year opens once you have a second schedule, or after your first full week." Insights reads: "Insights fills after about a week of ticks. Tick on Home to start." Each has one action that does the unlocking.
- **Goals:** the empty state shows the one area the user chose, and one line for the rest (finding 8). The Harada grid stays as an opt-in view.
- **Return visits:** nothing relocks. A tab that has content is never hidden again.

**Risks:** "where did my tab go" after a data reset (mitigate: reset returns to the first-run state, with the tabs visible); patronising feel (mitigate: the unlock text is one line, never a lecture). **Evidence:** finding 10 and the vocabulary counts. **Taste:** the tab order. **Hypothesis:** that strangers stay longer with three working tabs than five, which we have not tested.

### 6d. Charts: one question each

Three charts are proposed in [charts.html](mockups/charts.html). Each one has its question, its one number and the change from today.

**Time split (Week tab). Question: where does my week go?**
- Today: a donut with "69%", "72 h planned of 105 h", and a separate "Not planned" row.
- Proposed: one stacked bar of the 105 awake hours by life area, with the free time as a hatched segment, and the sum written out: "72 h planned + 33 h free = 105 h awake". Sleep (63 h) is left out and says so.
- Why: the donut answered "how full" while the colours answered "by area". Free time is shown as a segment, not as a missing row.

**Year, planned hours (Year tab). Question: how full is each month?**
- Today: 12 stacked bars in life-area colours with a red dashed line for "Available per month: up to 525 h", drawn in pieces.
- Proposed: one bar per month of planned hours, and a neutral dashed line for the awake time of that month. No stacks, no red. The life-area split is in Week and Home.
- Why: one question; a ceiling that reads as a ceiling, not as an error.

**Insights, adherence (Insights tab). Question: am I doing what I planned?**
- Today: a headline "Done 77% of planned", a donut at 77%, four weekly bars, eight life-area bars and two sub-lines, all saying the same thing.
- Proposed: one headline in words ("You ticked about three in four planned hours."), one weekly trend of 8 weeks with the current week drawn as a dashed outline, and one legend. Life areas are removed from Insights (they are on Year and Home). Habit lists move to Home.
- Why: each figure appears once. The trend shows the shape the headline cannot.

**Chart rules (taste):** label bars directly where there are fewer than 13; one colour for one meaning; no red for a ceiling; the number to read first is the largest one on the chart.

### 6e. Plain vocabulary: old to new

Taste. The new words are proposals to test with the five people in section 10, not decisions.

| Old (in the app today) | New (proposed) | Where |
| --- | --- | --- |
| Week type | Schedule | Week, Year, onboarding |
| + New week type | + Another schedule | Week |
| Paint with / Erase | Use schedule / Clear weeks | Year |
| Apply to several weeks | Set several weeks | Year |
| Apply (on a selection) | Add to these hours | Week grid |
| Change… / Edit / Save / Cancel | Change / Edit / Save / Cancel (kept; fewer on screen) | Week grid |
| Time split | Where the week goes | Week |
| Not planned | Free | Week, Year, Home |
| Available per month: up to 525 h | Awake time in the month | Year |
| Sleep is hidden: its hours are left off the bar, and a nap counts as unplanned | (removed from Home; "Show sleep" in Week) | Home |
| Show sleep | Show sleep (kept) in Week and Settings only | Week, Settings |
| One activity or habit for it | One thing you will do for it | Onboarding |
| Block / "13 of 16 blocks" | Planned session / "13 of 16 sessions" | Insights, Home |
| Habits 0 of 10 ticked (collapsed) | Habits: 0 of 10 ticked (open when 5 or fewer) | Home |
| Short codes (WRK, TRN) | off by default; the name is on the block | Week |
| Done 77% of planned | You ticked about three in four planned hours. | Insights |
| Counted from 9 October 2026 to today, 24 days. Earlier weeks are not tracked yet. | Counted from 9 October, 24 days. | Insights |

---

## 7. Motivation

Owner request (2026-11-02): include gamification to motivate and retain. Owner decision (2026-11-03): gamification stays, with an opt-out for each mechanic; perks stay out (section 7.5). Mockups: [gamification.html](mockups/gamification.html), and the weekly consistency strip and ambition ring in [home-cockpit.html](mockups/home-cockpit.html).

### 7.1 Principle

Timely is an ambition cockpit, not a time tracker and not a points game. So the rewards point at **progress toward the 1-year targets** and at the user's own week, not at ticks. Two rules follow:

- Ticking more does not raise a stage by itself. A stage moves when the target moves.
- Nothing is shown about other people. No leaderboards, no comparisons, no social feed.

### 7.2 Research risk (read first)

- **Streak guilt.** Streak counters that reset to zero are a known cause of quitting after a missed day in habit apps. Evidence: general habit-app literature and vendor blogs, weak and partly self-interested. Our view: treat as a strong hypothesis, and design so that a miss never resets anything.
- **Too much setup.** Long setup is a known cause of early abandonment (the same weak sources). Timely's first run is already long for some users (finding 4). Gamification must not add setup.
- **Rewards for the wrong behaviour.** If the reward is for ticking, people tick things they did not do, or tick to get the reward and stop when the reward stops. This is a well-known pattern in incentive research (the "overjustification" literature), applied here as a risk, not a measured effect in Timely.
- **Motivation or nagging.** A reminder that feels like a nag makes people leave or switch off all notifications. We cannot tell which side a given user is on without testing (section 10).

Confidence in these points: low to medium. Each is a hypothesis for the test in section 10.

### 7.3 Mechanics compared

Six mechanics, from the owner's list and our additions. Effort is one developer's estimate.

| # | Mechanic | What the user sees | Pros | Cons and risks | Effort | Our view |
| --- | --- | --- | --- | --- | --- | --- |
| A | **Weekly consistency that forgives misses** | Seven cells for the week, "3 of 5 planned sessions so far", and "a missed session costs one session, nothing else". No streak counter. Optional streak freeze is not needed if nothing resets. | Fits the research risk above; no guilt; simple data (already in Home's done ticks). | A lower-stakes signal, so some users may find it flat. Needs a clear week boundary. | S | **Adopt.** Core of Home. |
| B | **Stages per life area from the 1-year target** | Five calm stages (Starting, Building, Steady, Strong, Reached) from the target progress, with the next stage named. | Ties rewards to the ambition, the product's reason to exist; no ticks needed. | Only works for areas with a target; slow to move, so a long wait between stages. Needs the target to be set first. | M | **Adopt**, with the stage names kept calm. Use percentages in Goals, not on the badge. |
| C | **Milestones and a short weekly recap** | One line when a first thing happens (first tick, first full week of an area, a stage reached), and a recap card for the week with one closing line. | Gentle; the recap is a reason to open the app once a week. | Milestones can feel like a pop-up if they are loud. Must never block a tick. | M | **Adopt**, quiet version only (fade, no sound, dismiss). |
| D | **Weekly review ritual with a closing moment** | A "Done for the week" button on the recap, and "Plan next week" as the next action. | The review is a known practice in planning methods; it moves planning forward, not guilt backward. | Only useful if people do it; a button alone does nothing. | S | **Adopt** as part of C. |
| E | **Ambition progress ring** | One ring in the Home header: the average of the 1-year targets. | Shows the whole ambition at a glance; one number. | Averages hide weak areas; a single number can read as a score. Show it small and name the method. | S | **Adopt**, small, with the method named. |
| F | **Gentle celebration moments** | The all-done state, the first tick, the first full week. Fade-in, one line, no confetti, no sound. | Cheap and calm; marks real progress. | Too many moments become noise. Cap to one per day and let the user switch them off. | S | **Adopt** with the cap and the opt-out. |

**Not proposed:** points for ticks, badges for streaks, leaderboards, daily challenges, and push notifications that name what was missed. These are the mechanics that drive the research risks above.

### 7.4 Guardrails (apply to every mechanic)

- **No dark patterns.** No countdowns, no "you will lose your progress", no fear copy, no forced re-engagement.
- **No guilt notifications.** Reminders are off until the user turns them on, and they never name what was missed.
- **Opt-out, per mechanic.** Recap, milestones and stages each have their own switch in Account. Off by default for notifications, on for in-app lines (owner decision, section 9).
- **No leaderboard by default.** Nothing compares one user with another.
- **Calm tone and motion.** One line, a fade, no sound, no confetti, no red.
- **Data stays local** for A to F, in the same storage as the planner (no new data is sent anywhere).

### 7.5 Not now: partners and rewards

Partner discounts (for example a sports shop for Physical) are out. Owner decision (2026-11-03): perks stay out of Timely for now. The owner finds them hard to validate: we have no evidence that offers help retention, and each step needs things Timely does not have yet, namely a server for verified progress, signed partner agreements, a privacy and consent update, resistance to gaming and legal review. Nothing is built, and no partner appears in the product or the mockups. Reopening is not planned. If it were ever raised again, it would need the gamification test (section 10) to show that rewards help without pressure, a server route that already exists, and a clear partner and consent model; any sharing would be opt-in, one fact per offer, and nothing shared by default.


---

## 8. Phased roadmap

Each phase lists what it changes, a size estimate (one developer, our estimate) and what to verify. Each keeps the storage version unchanged unless noted, and each visual change is checked in light and dark at 1280 and 400 px.

### P1: quick wins (about 1 to 2 weeks)

- Numbers consistency: one awake-hours rule for every screen; sleep shown as "not counted" (finding 1). **S.**
- Remove the sleep sentence from Home; move Show sleep to Week and Settings (finding 3). **S.**
- Empty states: one line and one action per tab; Goals shows one area and a single "Add your first area" line (findings 8, 11). **S.**
- Plain words in the Week tab and the Time split heading (section 6e, the first half of the table). **S.**
- Phone Week cue and fade; Home ring beside the title (finding 11). **S.**

**Verify:** the 1280 and 400 captures before and after; the browser checks on the Week grid; the unit tests for the awake-hours rule (`tests/unit`, dates passed explicitly).

### P2: rules-based first run and Home (about 4 to 6 weeks)

- The rules-based first run: the welcome, the five questions with the rule table, the draft preview with edit and Accept, the starter, and Home with the first action for today (section 6a, phase a). **M to L.**
- Home cockpit: the focus card, "Behind this block", the day list, the week so far, 1-year progress per area, and the two states (section 6b). **M.**
- Forgiving weekly consistency (mechanic A) and the ambition ring (mechanic E). **S.**

**Verify:** time to an accepted plan and to the first tick in a small test (section 10); no new storage field (the first run writes the normal planner state, and `onboarding` already exists); the Home captures in four states; the first run works with the network off.

### P3: charts, Year and Insights (about 2 to 3 weeks)

- Time split as one stacked bar (section 6d). **S.**
- Year: one question, neutral ceiling, painter shown only with a second schedule (findings 6, section 6d). **M.**
- Insights: one headline, one weekly trend, one legend; life areas moved to Year and Home (finding 7). **M.**
- Navigation Model C: unlock text for Year and Insights (section 6c). **M.**

**Verify:** the 1280 and 400 captures of the Year tab with one and two schedules; the Insights page under 1,000 px tall at 1280 (the current build is about 1,960 px); the unit tests for the adherence rules, unchanged.

### P4: motivation and polish (about 2 weeks)

- Milestones and the weekly recap with "Done for the week" (mechanics C and D). **M.**
- Stages per life area (mechanic B), once enough areas have a 1-year target. **M.**
- Account switches for each mechanic (recap, milestones, stages), each with its own opt-out; quiet motion (section 7.4). **S.**
- Motion pass: the fade on milestones, the ring's first draw, reduced motion respected. **S.**

**Verify:** the reduced-motion setting; the opt-out switches work after a reload; no guilt copy in any state (a short list checked by eye).

### Later, not scheduled

- AI-drafted wording for the first run (section 6a, "Later"). Only after the P2 test, the owner's decision and legal review.
- Refinements as previewed edits ("make my week lighter"). Only if the AI question is settled. Each edit is previewed, can be undone, and is validated before the store.

### Not in the roadmap

Partner offers and rewards (section 7.5).

---

## 9. Open decisions for the owner

**Decided 2026-11-03 (owner):**

- The first run is rules-based. AI is not part of the plan. Items 5 to 6 are kept for a later decision and are not needed now.
- Perks and partners stay out (section 7.5).
- Gamification stays, with an opt-out for each mechanic: the weekly consistency strip that forgives misses, the ambition ring, progress per life area, the weekly recap, calm milestone moments.

Each open question has our recommendation. The owner decides.

**First run**

1. **Mandatory first plan, or optional with a starter as the default?** Open. Recommendation: a short mandatory build with the starter always one tap away. Test first (section 10).
2. **Rules path as the only first run for now.** Decided (see above). Phase (a) is the build.
3. **Skip.** Should a first run with no plan at all exist? Open. Recommendation: no. A starter is one click; a skipped first run leads to the empty Home the walk-through found.
4. **Language.** Answers in any language, the interface in English. Open. Recommendation: yes, and the English interface stays until the owner decides otherwise.

**Later: only if AI is reconsidered (not decided)**

5. **Provider, consent copy, cost ceiling, and where answers live.** Not needed now. When it is reconsidered: a written comparison of at least two providers (no training on the data, a retention limit, an EU data location if wanted, a price per call that can be capped, timeouts and rate limits); consent that names the provider, after legal review; a small monthly ceiling with a hard stop; answers kept nowhere once the draft is accepted or discarded.
6. **Local mode without a server.** Not needed now. The rules path works everywhere, so no server route is required.

**Gamification**

7. **Which mechanics ship in P2 and P4?** Recommendation: A and E in P2; C, D, B and F in P4. No points, no streak counter, no leaderboard (section 7.3).
8. **Milestones and in-app lines: on by default?** Recommendation: on in the app; notifications off. The prototype has the switch.
9. **Stage thresholds (25, 50, 75, 100%) and names.** Recommendation: keep as proposed, and test whether they feel fair.
10. **Ambition ring: an unweighted average.** Recommendation: yes, with the method named under the ring.
11. **Does the research risk change the design (no streak counter)?** Recommendation: yes (section 7.2).

**Structure and content**

12. **Navigation: Model C, or a full unlock?** Recommendation: Model C first (section 6c).
13. **Vocabulary.** Test the five headline words (Schedule, Where the week goes, Free, Add to these hours, Planned session) before adopting the table (section 6e).
14. **Time budget per life area** (an earlier idea). Recommendation: after the test; it adds a vocabulary item.
15. **Sample data name:** "Professional" (the seed) or "Career" (the owner's brief). Recommendation: "Professional", to match the app. The prototype uses "Professional".
16. **Partners and rewards.** Decided: stay out (section 7.5).
17. **Who tests.** Recommendation: four or five people outside the project, not people who already know the model.

---

## 10. Test plan

**Goal:** find out, with four or five real people, whether a stranger can build a first plan with the rules path and reach a populated Home, whether the plan fits their life, and whether the motivation features feel motivating or like a nag.

**Caveat:** five people is a qualitative test. It shows a broken step; it does not show a retention rate or prove a target. Report observations, not statistics.

**Setup:**
- Participants: four or five people who do not know Timely, who have used at least one planner or habit app, and who are not close to the owner.
- Device: their own phone for half the tasks, a laptop for the rest. Local mode, no account, fresh browser. Record the screen and the spoken thinking, with consent.
- Facilitator: says nothing about the product beyond the task. Helps only after 60 seconds stuck.
- Prototypes: the current production build for the baseline (Tasks 0 and 1). The prototype ([prototype.html](mockups/prototype.html)) for the rest: its first run runs the rules path with dummy data, and its Home, Week, Year and Insights show the proposed screens. The cockpit, charts and motivation screens are mockups only.

**Script (15 minutes):**

| Min | Task | What to observe | Success measure |
| --- | --- | --- | --- |
| 0 to 1 | Read Home (current build, no tour): "What is this app for, and what would you do first here?" | Whether they name a next action; the words they use. | Names a next action in 5 seconds (target: 4 of 5). |
| 1 to 5 | **Task 1, first run, current build (baseline):** "Set this up so it is useful to you. Stop when you feel it is set up." | Clicks; time to a first block; each hesitation; the words they stumble on (ambition, life area, habit, activity, week type). | First block under 5 minutes (baseline); first tick under 6 minutes. |
| 5 to 8 | **Task 2, first run, prototype (rules path):** "Set this up. Tell me if you want to skip anything, and why." | Whether they answer the questions without help; whether they find "Use a starter instead" and whether it appears to them as an option; which question they find odd. | Accepted plan in under 3 minutes (a hypothesis). |
| 8 to 10 | **Task 3, the draft:** "Change one thing in this plan you do not agree with, then accept it." | Whether they find Edit; how many fields change; "How well does this plan fit your week?" on a 1 to 5 scale. | Edit found in under 20 seconds; fit 4 or more from at least 3 of 5. |
| 10 to 12 | **Task 4, a missed day** (cockpit mockup with one missed session): "How does this make you feel about the week? What would you do next?" | Encouragement or blame; whether the miss is the first thing they see. | Reads it as encouraging (target: 4 of 5). |
| 12 to 13 | **Task 5, charts** (charts mockup and the current Year chart): "Where does your week go? How full is March?" | Time to an answer; whether the totals (105 h, 72 h planned, 33 h free) are trusted; whether the red line is read as an error. | Both answered in under 30 seconds each; the numbers agree. |
| 13 to 15 | **Task 6, motivation** (prototype Insights, the weekly recap and the milestone line; gamification mockup): "Does this make you want to keep going? Does anything feel like it is pushing you?" Score 1 to 5 on "motivated" and on "nagged". | The words used; irritation at the milestone line; whether the stages are understood; whether they find the switch that turns milestones off. | Motivated 4 or more and nagged 2 or less, from at least 3 of 5 people. |

**Also record, for every task:** whether they used the words in the script; what they said about sleep without being asked; whether any screen made them stop.

**First-run measures, summed up:** time to an accepted plan (median); time to the first tick (median); questions skipped; fields edited before Accept; starter use; the fit score.

**Decisions this test informs:** section 9 items 1, 3, 7 to 11, 13 and 15, and the go or no-go for P2 and for any AI phase (section 6a, "Later").

**Stop rules:**
- If the median time to an accepted plan is over 5 minutes, drop the mandatory part (section 6a).
- If the fit score is below 3 for three of five people, rework the rule table and the presets before P2 ships.
- If three of five people say a mechanic feels like pressure, remove it from the roadmap.
- If three of five cannot name a first action on Home (Tasks 0 and 2), P2 comes before P3.

**After the test:** write down what broke, what was understood and what was not. Update the scorecard in section 3 with the observed scores, and mark them as observations.

---

## Appendix: files

- `spec/ux-proposal.md` (this file).
- `spec/mockups/index.html`, `first-run.html`, `home-cockpit.html`, `charts.html`, `week-grid.html`, `gamification.html`. Static, inline CSS, IBM Plex Sans from Google Fonts, light and dark through the system setting.
- `spec/mockups/prototype.html` with `prototype/prototype.css` and `prototype/prototype.js`: the whole product with dummy data and no business logic (first run, Home, Goals, Week, Year, Insights). Relative paths; open the HTML file directly.
- Screenshots of the mockups were taken with headless Edge (puppeteer-core in the session scratchpad, not in the repo) at 1280 and 400 px, light and dark.
