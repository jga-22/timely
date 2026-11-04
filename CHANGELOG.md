# Changelog

All notable changes to Timely, newest first. Versions follow [Semantic Versioning](https://semver.org/); `0.x` is dev mode: no production users, no backward compatibility promised. Saved state version is 8.

## Unreleased

### Changed
- A week with no schedule of its own is blank everywhere (owner decision, 2026-11-05). Today shows nothing planned for a day in such a week, and says so, with a link to Year to give the week a schedule. Year and Progress count no hours for it, and the Year count line reads "N with no schedule". Weeks that used to show the active schedule as a default now show nothing until they are given one (paint them in Year, or start from onboarding, which gives every week one).
- The Year planner's Clear leaves a week with no schedule; its tooltip says so. Its hint and result lines no longer name an active schedule, and the legend reads "No schedule".
- The Week tab's card is titled "Schedules" (it was "Week"), with the schedule chips at its top.
- Plan > Year: the card is called "Year planner". Its year switcher is in the card's head; the paint tools and "Apply to several weeks" are in the card, under a one-line hint. The last paint chip reads "Clear", and its tooltip says it sends the week back to the active schedule. The lede at the top is gone, and the grid has room under its last row.
- Plan > Week: the schedules, the week grid and the entry buttons are one card, and "Where the week goes" is a card below it. The line at the top says how to use the grid and no longer names a schedule.
- Plan > Year reads like the A2 mockup, in its words and look. A line at the top says which schedule a week without its own uses. The paint tools are the schedules and "Clear to <schedule>", which sends a week back to that schedule.
- "Which weeks use which schedule" is a card: the count of weeks each schedule uses, the year grid with its legend, and the current week outlined. A week with no schedule of its own stays blank and uses the active schedule; a quiet month label sits above each row of the grid.
- The planned hours of the year are a card: the hours against the awake time, one bar with Free hatched, the life areas with Free as the last row, and Show sleep. The monthly bars and the range controls are under "More detail", closed by default. The card and its list are in hours; the unit applies to the bars.
- The Year view says "schedule" where it said "week type". The entry form still says "week type".
- The Year grid has no row labels any more: the month labels above the weeks say the months. The 14 columns take the width (squares 62 px on a desktop, 23 px on a 400 px phone; the squares on a phone have square corners and a 2 px gap, and the current week's frame is drawn inside its square). The current week's outline no longer touches a month label, and each week and row is named for screen readers.
- The Week grid's edge handles are the border of the selected run: a flat line across its full width, 4px thick (6px and darker while hovered or pressed), with no round grip and no room taken inside the block. Each edge takes a 32px target on a mouse, centred on the edge, and a one-hour run splits its height between its top and bottom targets. Touch keeps the 44px target.

### Fixed
- The edge handles were hard to click: a 4px grip on a 24px target, the target mostly beside the block, and on a one-hour block the two targets overlapped the block's middle. The grip is now the edge itself and the target is larger. The grid's behaviour (drag, keys, Save and Cancel) is unchanged.

## 0.1.1 - Today, rebuilt

### Changed
- Plan > Week reads like the A2 mockup, in its words and look. A line at the top says which schedule every week uses ("Schedule: Standard Week. Every week uses it unless Year says otherwise."). The schedules are the chips under it, at the 44 px target; "Schedule" labels them and "+ New schedule" adds one.
- "Where the week goes" is a card above the grid: the ring, the planned, free and awake hours, and a list whose last row is Free. Before, the time split was the last section of the tab and its last row was "Not planned".
- Blocks on the week grid print the activity's name on wide screens and its short code on phones (480 px and narrower). Before, every block showed only its code.
- The grid: Show sleep sits at the left above it; every hour has its label; the selection is a dashed frame with its hours in a pill; the first button on an empty run is "Add to these hours…", and its menu says what the choice does. The grid works as before.
- The schedule panels say "schedule" as well: "New schedule", "Edit schedule", "Add schedule" and "Delete schedule". The entry form and Year still say "week type" for now.
- Today's focus follows the clock on today: the block in progress (ticked or not), else the next block, else the most recent ended block not ticked, else the first undone daily habit. Before, it was the first undone item in list order, so a block in progress could sit behind an earlier one left undone. The list under the focus is now "Today's list": every item of the day, the one in focus marked "On now", "Next" or "Ended". A ticked block in focus reads "Done · next at 2 PM". A clock tick keeps the keyboard on the same item.
- Today has a new look. The next thing to do is the large card at the top, with its time, a countdown ("In 40 min", "On now · 1 h left") and the 1-year target it stands behind. Below it: the rest of the day, the week so far, the journal line and all your habits.
- When the day is done, Today says so with a check and offers to plan tomorrow. When nothing is planned, it offers to plan the habit furthest behind its count in Week.
- The day line is one track over your awake hours: a segment for each block of the day, filled when you tick it, a marker for now, and the hours 7 AM, 12 PM, 6 PM and 10 PM under it.
- The progress ring on Today is now a count line ("2 of 7 done today"). It counts your blocks and your daily habits; weekly and monthly habits are not counted there.
- All habits lists every habit by life area, with the round tick for the day at its right end (the same circle as your blocks), or "Planned as a block" on a day a block of its activity is scheduled.
- Today matches the A2 mockup more closely: the glow of the time of day behind the page (Lively only), the brand mark and the Today, Plan and Progress icons, the 788px column, the one-line journal for the day shown, "Last one for today", a warm line after a tick, and "Behind this: <area>. No 1-year target yet." when an area has no target.
- The Show sleep switch is no longer on Today. The setting is still in Week and Year, and Today follows it.
- Ticks work with the keyboard. After a tick, the keyboard stays on the tick you pressed. The ticks in the list sit at the right end of their row.

### Fixed
- Ticking your day from the focus card now ends in the same state as ticking it from the list. The focus had walked into weekly and monthly habits, ticking them and showing habits that are not part of the day. The focus now walks only your blocks and your daily habits, and the day is done when they are.

### Added
- "Where the week goes" tells you how many weeks of the year use the schedule you are looking at ("used in 37 weeks of 2026").
- A week strip on Today shows each day so far: all done, some done, not ticked, nothing planned, and the days still to come.

## 0.1.0 - three screens

Timely has three screens now: **Today**, **Plan** and **Progress**. The five tabs are gone, and what is inside each screen works as before. Your saved data is unchanged.

### Changed
- Today (was Home) is the first screen, as before.
- Plan holds Dreams (was Goals), Week and Year. A row of three links at the top moves between them. Plan opens on the one you used last, until you close the tab.
- Progress (was Insights) shows your adherence, as before.
- On a computer, the three screens are in a rail on the left. On a phone, they are a bar at the foot of the screen, and the page leaves room for it.
- The top bar has the dark mode switch and the account menu.
- Old links still work. A link to Home, Goals, Week, Year or Insights opens the matching screen, and the address is tidied to the new form once.

### Added
- A "Skip to content" link, the first stop for keyboard users, goes past the navigation to the page.

## 0.0.2 - a lighter app and a calmer look

A calmer look and the groundwork for the next changes. The screens keep their layout and behaviour; the colours, corners and type sizes are softer.

### Changed
- A calmer palette: a warm paper page with white cards and one blue accent. Dark mode is a neutral grey. Planned colours stay readable on both.
- Rounder corners, a 3-pixel focus ring, and type sizes in rem, so the browser's font size is respected.
- Dark mode, the motion choice and the tint by time of day are applied before the first paint, as dark mode was before.
- Buttons are outlined pills at least 44 pixels high (36 pixels for the dense ones; 44 on a touch screen). Chips and fields follow them, and fields use 16-pixel text, so an iPhone does not zoom in on them.
- Icons replace the text arrows of the year and day controls and the pencil of the edit buttons.
- Show sleep is a switch that shows on or off, instead of a button whose label changes to Hide sleep.
- The List or Grid choice in Goals, the Month or Week and range choices in Insights and Year, and the sleep nights share one segmented control.
- Reset my data keeps its dialog and its buttons. The dialog uses the browser's own dialog: Tab stays inside it, and focus goes back to the account button when it closes.
- Done ticks on Home keep their labels and behaviour.

- Smaller download: the main style sheet drops from about 560 KB to about 52 KB (from 90 KB to 10 KB compressed).
- Dark mode works as before: the same switch in the Account menu, and the choice is kept across reloads.

### Added
- The design system: `spec/design-system.md` (tokens, colour, motion, the CSS structure, the checks that keep them in line) and the plan behind it (`spec/ux-design-system-plan.md`).
- A Motion choice in the Account menu: Lively (the default) or Calm. Calm stops the movement (the tick pop, the rings and bars drawing in, the tint); every number and state stays. When the system asks for less motion, the page is calm and the menu says so.
- In Lively, the page takes a soft tint of the time of day (morning, afternoon, evening), and a done tick pops when it turns on.
- A living style guide at `/_styleguide` in the development build (or a build with `TIMELY_STYLEGUIDE=1`): every control and token in every state, in light and dark, Calm and Lively.
- The Dark mode and Motion choices and Show sleep are kept in this browser, outside the saved planner data.

### Notes
- Saved data is unchanged.

### Removed
- The component library that drew the page frame and the theme, its icon font (four font files) and the packages behind them.

## 0.0.1 - quick wins

First patch of the 0.0.x line: the trust fixes and small changes that came out of the UX review, plus the security work merged after 0.0.0.

### Added
- Security headers on every response (nosniff, strict Referrer-Policy, X-Frame-Options DENY, Permissions-Policy) and a Content-Security-Policy with a per-page nonce for HTML.
- The A2 migration plan in `spec/ux-migration-plan.md`: the gap per screen, the decisions to take and the twelve slices, each one PR and one patch version.

### Changed
- One rule for awake hours: the Week meta line, the week type chip and the guided tour say the same numbers, for example "3 h planned of 105 h awake". Sleep is not planned time and is taken out of the 168 hours.
- Home: the sentence about hidden sleep is removed; the Show sleep control stays. With nothing planned for the day, the day shows an "Open Week" button.
- Guided build: a goal's first session falls on today's weekday, when the build runs.
- Dependencies: `npm audit fix` without forced upgrades (Nuxt 4.6.3, Vue 3.5.44, Vite 8 through Nuxt); high and critical advisories cleared; the 15 left (moderate and low) are in build and dev tooling, not in the production server bundle.

### Fixed
- The week type chip, the Week meta line and the guided tour counted Sleep as planned time (for example "66 h for Physical" for a new user with a 3-hour habit in Physical). They now leave Sleep out.

## 0.0.0 - first checkpoint

A stable point taken before the next UX iteration.

### What the app is
- **Five tabs:** Home (today's blocks with day progress, habits), Goals (Harada grid: one ambition, eight life areas, 5-year goal, 1-year target, habits), Week (week grid with range select, edge handles and edit box, Time split, week types), Year (year painter and planned-hours bars) and Insights (adherence).
- **Storage:** local-first in the browser; optional Supabase with Google sign-in.
- **Structure:** every large file is split by single responsibility (planner utils, CSS, Goals detail, week grid composables, entry form, Home, shell). A unit test fails when a source file in `app/` passes 400 lines.
- **Checks:** unit tests, typecheck and build run in CI.

### Fixed in this version
- Escape with a delete or "no time" confirmation open in the entry form closes only the confirmation; a second Escape closes the form.

### Known open items
- Security hardening: npm audit findings, CSP and security headers, a size limit on the stored state.
- Real-phone testing; some older screenshots in `spec/screens/` may be stale.
