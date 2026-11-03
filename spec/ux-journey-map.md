# Timely: journey map, first visit to first quarter

Status: proposal, not built. Written 2026-11-03 as a companion to `spec/ux-proposal.md` and `spec/ux-information-architecture.md`. No code, data model or storage change: the storage version stays 8 and no field is added to `PlannerState`.

Visual: [mockups/journey-map.html](mockups/journey-map.html) (one standalone file, inline CSS and SVG, light and dark through the system setting, six stages in a row on wide screens and stacked on phones).

**Labels.** Evidence means something seen in the production build (walk-through of 1 to 4 November 2026, shots and notes in the session scratchpad). Hypothesis means a target or a guess to test. Untagged text is a design proposal. Emotion curves are sketches of how a stage may feel, not measured data.

---

## 1. Purpose

The map follows one person from the first visit to the first quarter. It answers, for each stage:

- what the person wants at that point;
- where they go and what they do there;
- how they may feel, drawn as a curve;
- the main reason they might stop;
- the device that keeps them going (gamification, recap or the dream link);
- how much upkeep the stage asks of them;
- how we would know the stage works.

The map is the frame for the information-architecture options in `ux-information-architecture.md`. It does not choose between them: each option changes where a screen lives, not what the stage asks.

---

## 2. Stages at a glance

| # | Stage | User goal | Main screen | Main risk of quitting | Success metric (hypothesis) |
| --- | --- | --- | --- | --- | --- |
| 1 | Land and understand | Know what Timely is for and what to do first | Welcome | Five terms before any action; "start empty" leads to a blank product | A next action named in 5 seconds by 4 of 5 people |
| 2 | Set up, under 3 minutes | A first plan that reads as their life | First-run questions, then the draft | The first question; a generic-looking draft | Accepted plan in under 3 minutes (median) |
| 3 | First day | See today and tick one thing | Home, Today | Nothing planned today; a tick that feels like nothing | A block for today, or the next one named, on day 1 |
| 4 | First week | A week that looks like theirs, and a rhythm that survives a miss | Home, the week so far | Days 2 to 4; fiddly editing; a miss read as failure | Back on day 3 without a prompt |
| 5 | First month | See the shape of the month and change one thing | Progress (headline, trend, recap) | One percentage read as a score; a long page | 3 of 4 weeks with a recap opened or closed |
| 6 | First quarter or year | See the ambition move; confirm the 1-year target | Goals (stages), Home (ambition ring), Year | Progress too slow; an average hides the weak area | At least one life area moves a stage; active at day 90 |

Screen names follow the current build. The information-architecture options rename or move them (see that document).

---

## 3. The stages in detail

### Stage 1: Land and understand

- **User goal.** Know in five seconds what Timely is for and what to do first.
- **Screen and action.** The Welcome dialog. One button starts the path (about 3 minutes); a second offers a starter; the intro is optional. Today the Welcome dialog offers Guide me, Start empty and "Watch the short intro" (evidence).
- **Expected feeling (hypothesis).** Curious, then unsure whether this is for them. The curve dips at the terms.
- **Main risk of quitting.** Reading five new words before doing anything. "Start empty" leads to a blank product with no next step (evidence: eight identical empty Goals rows; a Home with a text link only).
- **Motivation device.** The dream link in one sentence: your ambition, the week that serves it, and what you ticked. No reward yet; the point is to make the purpose clear.
- **Maintenance.** None.
- **Success metric.** 4 of 5 people name a next action in 5 seconds (Task 0 of the test plan, `ux-proposal.md` section 10).

### Stage 2: Set up, under 3 minutes

- **User goal.** A first plan that reads as their own life, saved only after they accept it.
- **Screen and action.** Five questions (six at most), adapted by rule, then a draft plan with every line editable. The buttons are **Accept plan** and **Use a starter instead**. Nothing is saved before Accept (`ux-proposal.md` section 6a).
- **Expected feeling (hypothesis).** Effort while answering; relief when the draft reads right. A flat stretch if the draft looks mechanical.
- **Main risk of quitting.** The first question; a draft that does not fit the person; a long build with nothing to see yet. Setup friction is among the most-cited causes of early abandonment (weak evidence, `ux-proposal.md` section 2).
- **Motivation device.** The draft opens with the ambition in the user's own words. Each life area shows its habit and the answer it came from ("from your answer: Physical").
- **Maintenance.** Once, about 3 minutes. Later changes are made in place, not in a second setup.
- **Success metric.** Accepted plan in under 3 minutes (median); fields edited before Accept (a high count means the draft is off); starter use; first tick under 4 minutes (all hypotheses).
- **Today.** Guide me is 4 clicks, 3 typed fields and about 5 decisions. The first screen after Build shows 66 h, 3 h planned and 3 h of 105 h, and 66 h includes 63 h of sleep (evidence; finding 1 of the proposal).

### Stage 3: First day

- **User goal.** See what is due today and tick one thing.
- **Screen and action.** Home, Today: the next block, one tick, the progress ring. Nothing else is needed to complete the day's first step.
- **Expected feeling (hypothesis).** Anticipation, then a small win. The ring turning into a green check is the best moment in the product today (evidence).
- **Main risk of quitting.** Nothing planned today, so the first screen is empty. After Guide me, 4 of 7 days land on "Nothing planned today" (evidence: Sunday 1 November; Monday showed "Run, 0 of 1 done"). A tick that feels like nothing happened.
- **Motivation device.** One quiet line on the first tick, once. "All done for today" when the day is complete (existing, FR-HOME-19). "Behind this block" names the 1-year target the block serves.
- **Maintenance.** Under 2 minutes.
- **Success metric.** For every rules-path run, Home shows a block for today or names the next one (a design rule, to be checked in the prototype); first tick on day 1 (hypothesis).

### Stage 4: First week

- **User goal.** A week that looks like theirs, and a rhythm that survives a missed day.
- **Screen and action.** Home, the week so far: seven cells and one sentence ("3 of 5 planned sessions so far"). The Week tab only to add a block. Goals only if they want to look.
- **Expected feeling (hypothesis).** High on day 1, a dip on days 2 to 4, recovery when the week has a shape. The dip is the likeliest quit window (estimate; the walk-through notes in the session scratchpad, `journeys.md`).
- **Main risk of quitting.** Editing the grid may feel fiddly (taste: the grid's action bar has five verbs, `ux-proposal.md` concept inventory). Numbers that look like failure after one miss. Empty screens elsewhere: Goals shows seven rows "Add a goal", Insights says "Tick activities on Home", Year shows slivers.
- **Motivation device.** A consistency strip that forgives misses: no streak counter, no reset, "a missed session costs one session, nothing else" (mechanic A). A quiet line for the first full week (mechanic C).
- **Maintenance.** About 5 minutes once to add blocks; then the daily tick.
- **Success metric.** Back on day 3 without a prompt; ticks on at least 3 days of the first week; one entry added or edited (all hypotheses; the test is Task 2 and the return check in `ux-proposal.md` section 10).

### Stage 5: First month

- **User goal.** See the shape of the month and change one part of the week.
- **Screen and action.** Progress: a headline in words ("You ticked about three in four planned hours"), an eight-week trend, and the weekly recap with **Done for the week**. Then Week for one change.
- **Expected feeling (hypothesis).** Pride when the headline matches how the month felt. A dashboard feeling when the page is long.
- **Main risk of quitting.** One percentage read as a score (evidence: 77% repeated in the headline, the donut, four bars and eight life-area bars). A long page that is reference, not a story. A recap that reads like a report card.
- **Motivation device.** The recap closes with one line and "Plan next week" (mechanics C and D). The trend shows the shape the headline cannot.
- **Maintenance.** About 5 minutes a week for the review (part of the weekly 10-minute budget).
- **Success metric.** 3 of 4 weeks with a recap opened or closed; at least one change to the week after a review; Progress read in under 30 seconds (hypotheses).

### Stage 6: First quarter or year

- **User goal.** See the ambition move, and decide whether the 1-year target still fits.
- **Screen and action.** Goals, for one life area's progress and its stage; the ambition ring on Home (the unweighted average of the 1-year targets, with the method named); Year for the planned hours by month.
- **Expected feeling (hypothesis).** Meaning when a stage moves; drift when nothing moves for weeks.
- **Main risk of quitting.** Progress too slow to feel. An average hides a weak area. A holiday breaks the rhythm (Year and the painter handle it). The quarter passes with no review.
- **Motivation device.** Stages per life area from the 1-year target, with calm names (Starting, Building, Steady, Strong, Reached; mechanic B). The ambition ring (mechanic E). The 5-year line on Home.
- **Maintenance.** About 20 minutes each quarter to confirm or change the 1-year targets (estimate).
- **Success metric.** The 1-year target confirmed or changed each quarter; at least one life area moves a stage; still active at day 90 (a retention hypothesis; not measured).
- **Today.** No stages, no ambition ring. Year shows a red ceiling line for "Available per month" (evidence; finding 10 of the proposal).

---

## 4. The weekly loop

The loop repeats every week after the first. It is the same three moments in every option.

| Moment | When | Where (today) | What the person does | Time |
| --- | --- | --- | --- | --- |
| Plan | Once a week | Week tab; the review prompt | Looks at the week, adds or moves a block | About 5 min |
| Do and tick | Every day | Home, Today | Ticks each block done; optional journal line | About 2 min a day |
| Review | Once a week | Recap (proposed, in Progress) | Reads the week, closes it with "Done for the week", then "Plan next week" | About 5 min |

**Budget.** Two minutes a day for the do-and-tick moment and ten minutes a week for planning and review together. Over a week that is about 24 minutes at most. The product must not ask for more: a new feature that adds a step to any moment is a cost to justify.

**Open question for the owner.** If "10 a week" was meant as 10 minutes in total, the daily budget falls to about 1 minute. The map uses the reading above until the owner decides. This is also the reason the weekly review (about 5 minutes) and the planning top-up (about 5 minutes) are kept separate.

**What the loop needs from the screens.**

- Home answers "what now" in one screen, with one primary action (a tick).
- The week can be changed in under a minute without the grid (or with the grid, when the person wants it).
- The review has one place, and it can be skipped without a penalty; a skipped week is not shown as a failure.

---

## 5. Motivation across the map

The devices come from `ux-proposal.md` section 7. Gamification stays with an opt-out for each mechanic; rewards for partners stay out (owner decision, 2026-11-03).

| Device | Stage it serves | Rule |
| --- | --- | --- |
| Dream link: "Behind this block" and the ambition line | 1, 3, 6 | Shows the purpose; never a score |
| Consistency strip that forgives misses (A) | 4, 5 | No streak counter; nothing resets |
| Quiet first-tick and first-week lines (C, F) | 3, 4 | One a day at most; off switch; never blocks a tick |
| Weekly recap with "Done for the week" (C, D) | 5 | One closing line; "Plan next week" is the next action |
| Stages per life area from the 1-year target (B) | 6 | Moves with the target, not with ticks |
| Ambition ring, unweighted average (E) | 6 | Small, method named under it |

**Guardrails.** No guilt copy and no notification that names a missed item. No leaderboard. No red for a ceiling or a miss. Ticking more does not raise a stage by itself.

---

## 6. What the map asks of the information architecture

The map constrains the options in `ux-information-architecture.md`:

1. The first-run end state must be a Home with a block for today (stage 3). Any option that starts on an empty Home fails this.
2. Progress (stage 5) and the ambition (stage 6) must be reachable from the first day, even if they are empty. Hidden until unlocked is possible, but the unlock must say what it needs.
3. The weekly review (stage 5) needs one place. Options that split it across tabs add a step.
4. The dream link (stages 1, 3, 6) needs the ambition and the 1-year target on the daily screen. Options differ on how close they put it.

---

## 7. How to test the map

The map uses the test plan in `ux-proposal.md` section 10 (four or five people outside the project, with a laptop and a phone). For each stage, the test records:

- the stage's success metric, as observed;
- where the person stopped or hesitated, and the words they used;
- one line on how they felt, in their words (to check the emotion curve, not to score it).

Five people show whether a step breaks. They do not confirm a retention rate. Report observations, then update the curves and the metrics here.

---

## 8. Open items

- The owner decides the reading of "10 a week" (section 4).
- Stage 2 needs the rules-path prototype to measure. The prototype is `spec/mockups/prototype.html`.
- The emotion curves are sketches. Replace them with observed notes after the test.
- Retention at day 90 (stage 6) cannot be measured without the analytics decision in the Privacy Policy (`app/utils/legal.ts`); keep it a test-only measure until then.
