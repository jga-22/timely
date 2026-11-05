# Timely front-end design spec

This file describes the visual style that the code uses today. Every value here was read from the source (`app/assets/css/` (`tokens.css` and the feature files), the component `<style>` blocks, `app/app.vue`, `nuxt.config.ts`, `app/utils/planner/templates.ts`) and cross-checked where noted. Where a value could not be verified, it is marked **(unverified)**.

Source of truth: the code. The old `design/` folder (terracotta and serif look) is a stale export and must not be used. The Harada prototype in `spec/references/grille-harada-meilleure-version.html` is the origin of the blue palette and the Goals layout; it is a reference only.

Reference screenshots (current build, headless Edge, light unless noted):

| Screen | Desktop 1280 | Mobile 400 |
| --- | --- | --- |
| Goals | [goals-desktop-light.png](screens/goals-desktop-light.png) (every life area listed, with its target status and entry counts; Grid view: [goals-grid-desktop-light.png](screens/goals-grid-desktop-light.png); category detail: [goals-detail-desktop-light.png](screens/goals-detail-desktop-light.png); category detail in edit mode: [goals-detail-edit-desktop-light.png](screens/goals-detail-edit-desktop-light.png)) | [goals-mobile-light.png](screens/goals-mobile-light.png) |
| Planner | The week grid is the original range-select grid (`ActivityGrid.vue`, section 4.12): a 52 px hour gutter, seven day columns, 28 px hour rows and a frame of at least 540 px that scrolls sideways inside `.wk-scroll` on phones (the page does not). The Activities list (section 4.17) is a row of chips under the grid. The year grid is full width (13 week columns, 32 px cells, a quarter label per row) and collapsible. Measured in the 2026-10-26 run (section 11). |
| Today | [today-desktop-light.png](screens/today-desktop-light.png) (dark: [today-desktop-dark.png](screens/today-desktop-dark.png); the past day: [today-past-desktop-light.png](screens/today-past-desktop-light.png)) | [today-mobile-light.png](screens/today-mobile-light.png) (dark, all done: [today-mobile-dark-all-done.png](screens/today-mobile-dark-all-done.png)) |
| Year | [year-desktop-light.png](screens/year-desktop-light.png) (Apply to several weeks open: [year-apply-several-desktop-light.png](screens/year-apply-several-desktop-light.png); dark: [year-desktop-dark.png](screens/year-desktop-dark.png)) | [year-mobile-light.png](screens/year-mobile-light.png) (dark: [year-mobile-dark.png](screens/year-mobile-dark.png)) |
| Insights | [insights-adherence-desktop-light.png](screens/insights-adherence-desktop-light.png) (Week: [insights-adherence-week-desktop-light.png](screens/insights-adherence-week-desktop-light.png)) | [insights-adherence-mobile-light.png](screens/insights-adherence-mobile-light.png) |

---

## 1. Design principles

1. **Calm and minimal.** Few colours, one accent, lots of whitespace. The accent is reserved for the thing the user can act on or the thing that is selected.
2. **One font family.** IBM Plex Sans only, in weights 400, 500 and 600. No serif, no monospace.
3. **Whitespace over borders.** Sections are separated by hairline rules, not boxes. Containers with a full border are the exception (the week grid, the Harada grid, inputs, popovers).
4. **Progressive disclosure.** Details that are not needed for the task sit behind a quiet "Details" toggle or a native `<details>` element (`.disclosure`). Only one habit's details are open at a time.
5. **Sentence case everywhere.** No `text-transform`, no uppercase micro-labels. Tab labels, buttons and headings are sentence case.
6. **Nothing under 12px.** The smallest text is 12px (`--fs-xs`). Known exceptions are listed in section 2.4 and in the gaps list.
7. **Hairline dividers instead of boxed cards.** Sections use `border-top: 1px solid var(--rule-2)`; list rows use `border-bottom` of the same colour.
8. **No shadows except floating menus.** `--shadow` is used only on the colour popover, the activity menu and the selection action bar.

---

## 2. Tokens

Moved to [design-system.md](design-system.md), section 2 (tiers, colour roles with contrast, type, space, radius, elevation, focus, motion, z-index, sizes, breakpoints) and section 3 (dark mode, motion and part of the day before first paint, preference keys). Token names: the old names and their replacements are in its section 10.

---

## 3. Layout

### 3.1 App shell (FR-NAV, slice 4, 0.1.0)

The shell has three surfaces, Today, Plan and Progress (option A of `spec/ux-information-architecture.md`, chosen 2026-11-04). Its parts are in `app/components/shell/`: `AppRail.vue` (the desktop rail), `AppTabBar.vue` (the phone bar), `AppTopBar.vue` (the top bar) and `AppNavLink.vue` (one surface link). `app/app.vue` renders `.app` (a flex row: the rail, then `.shell-column` with the top bar, the page and the footer; the phone bar is fixed) and the dialogs. The page component (`app/pages/index.vue`) is the `<main id="main">` and switches on the surface, read by `useNav()` (`app/composables/useNav.ts`, the rules in `app/utils/nav.ts`).

- **Rail (769px and wider).** Sticky, the full height of the window, `--rail-w` (232px) wide, with its own padding (`--sp-8` at the top and `--sp-6` at the bottom). The brand (the `brand` icon and "Timely") links to Today; below it the three surfaces, Today, Plan and Progress, each with its icon. A surface is a 48px row (`--hit-lg`) with `--radius-md`; the current one sits on the card surface with `--elev-1` and a semibold label, and its icon is in the accent.
- **Top bar.** `.topbar`, not sticky, with no background of its own: the ambient glow shows behind it, as in the mockup. Its row is the page's width (`max-width` 1120px, the `.view` maximum) with the views' side padding, so the tools line up with the content. On a phone it shows the brand (the link to Today); on a desktop the rail carries it. At the right: the theme switch (a 44px icon button, moon or sun, `aria-pressed`, labelled "Dark mode"; the same state as the switch in the Account menu) and the account menu.
- **Phone bar (768px and narrower).** Fixed to the foot of the screen, `--z-tabbar`, three equal columns, on the card surface with a hairline above. Each item is an icon above its label (13px), at least 48px high, with the safe-area inset at the bottom. The column leaves room for the bar (its padding is the bar's height plus `--sp-8` and the safe area), so the last content and the footer are never under it.
- **Current surface.** Each link has `aria-current="page"` on the surface shown. The links are not tabs: the rail and the bar are `nav` landmarks, and no element has `role="tab"`.
- **Skip link.** "Skip to content" is the first stop on the page (`.shell-skip`, hidden until it has focus). It targets `#main`, the page's `<main>`, which has `tabindex="-1"` and no focus ring. The legal pages and the sign-in page have the same `<main id="main">`.
- **Plan sub-nav.** Under the page title Plan: `nav.plan-subnav` with Dreams, Week and Year as a row of pills (44px, `--radius-pill`, the current one on the card surface). Each view below it is mounted with the `headless` prop, so it shows no title of its own; its controls stay (the year switcher on Year, the List or Grid choice in Dreams).
- **Progress.** The title "Progress" over the adherence view; the view is mounted headless.
- **Account menu.** `AccountMenu.vue` keeps its place in the top bar, its rules and its look (`features/account.css`). It has the save status, the Dark mode switch (the same state as the top bar's button), Motion, Replay tour, Reset my data and Sign out.

`NuxtRouteAnnouncer` is mounted. Its visually hidden span measures 199px wide and is `overflow: hidden`, so the overflow probe reports it. It is not a layout issue.

### 3.2 Phones and the top bar

- At 768px and narrower the rail is hidden and the phone bar is shown. The top bar keeps the brand, the theme switch and the account menu in one row.
- Plan's sub-nav wraps on a narrow screen; each pill keeps at least 44px of height.
- The page has no horizontal overflow at 400px in any surface (checked in the slice 4 captures: Lively in light and dark, Calm in light).

Tab semantics: none. The rail and the phone bar are `nav` landmarks with `aria-current` on the surface shown; Plan's sub-nav is a `nav` with the same attribute.

### 3.3 Content width and gutters

`.view`: `width: 100%; max-width: 1120px; margin: 0 auto; padding: var(--space-7) 40px 96px`. Padding changes at breakpoints:

| Viewport | Padding (top, sides, bottom) |
| --- | --- |
| above 1280px | 48px, 40px, 96px |
| 1280px and below | 40px, 32px, 80px |
| 1024px and below | 32px, 28px, 72px |
| 768px and below | 24px, 16px, 72px |
| 480px and below | 16px, 16px, 64px |

The side gutter is 16px at 400px, which meets the minimum.

### 3.4 Breakpoints

| Breakpoint | Where | Effect |
| --- | --- | --- |
| 1280px | `layout.css` | `.view` padding |
| 1024px | `layout.css` | `.view` padding |
| 768px | `shell.css`, `shared.css`, others | Topbar wraps; page title 18px; metrics one column; goal rows and category rows compact; The Year chart defaults to monthly (`YearView.vue`) |
| 1100px | `HaradaView.vue` (scoped) | The List / Grid toggle (`.goals-view-toggle`) shows from here up; the Harada matrix is the Grid view (opt-in) and hidden (`display: none`) below. The list is the default view and the only one below 1100px |
| 480px | `home.css`, `shared.css`, others | Home: period selector full width, Day rows put the time on its own line |
| `(hover: none)` | `home.css`, `week-grid.css` | Block hover actions hidden on touch devices |


### 3.5 Phone behaviour at 400px

Measured with a headless Edge run against the production build, 400px wide, on each tab. The document never scrolls horizontally (`scrollWidth - clientWidth = 0` on every tab).

| Area | Behaviour |
| --- | --- |
| Shell | The rail is hidden; the top bar holds the brand, the theme switch and the account menu; the Today, Plan and Progress bar is fixed at the foot, with the safe-area inset, and the page leaves room for it. No horizontal overflow at 400px on any surface (checked). |
| Goals | Single column. Harada grid two columns; the centre ambition cell spans both columns first. Habit rows stack. |
| Planner | The week grid (`ActivityGrid.vue`, section 4.12) has a 52px hour column, seven day columns and 28px hour rows, always editable for an hourly template. Its frame is at least 540px and scrolls sideways inside `.wk-scroll` on phones. |
| Year grid | Fits without a scroll: 14 columns of squares, 23px at 400px, 20px at 360px and 62px at 1280, with the week numbers, and the month labels above each row (slice 7, 2026-11-04; the row labels are gone). |
| Year | The summary card, the schedule card and More detail fit 400px with no page overflow (measured at 400px, light and dark, slice 7). |
| Insights | The adherence view fits 400px with no page overflow (measured, light and dark). |
| Home | The period selector is full width. Day rows put the time range on its own line above the name; Edit stays at the row end. Week and Month rows keep name, hours and share on one line. Measured at 400px: no page overflow in any period, light or dark. |

Rule: only tables, the year grid and charts may be wider than the viewport, and each is in its own `overflow-x: auto` container. Everything else must wrap or stack.

---

## 4. Component catalogue

Class names below are in the feature files in `app/assets/css/` (the file is named where it matters) unless a file is given. Components with a `<style scoped>` block are noted.

### 4.1 Page header (`.page-head`)

- Anatomy: `h1.page-title` (28px 600, `-0.015em`, line height 1.2, bottom margin 8px), `p.page-lede` (15px, `--ink-3`, `max-width: 60ch`, line height 1.6), optional `p.page-meta` (13px, `--ink-2`, tabular, top margin 12px). Bottom margin of the header is 32px.
- Mobile: title 18px, lede 13px.
- Copy is an active voice sentence, not a label. Example: "Design your ideal week, hour by hour."

### 4.2 Sections (`.section`, `.section-head`, `.section-title`, `.section-lede`)

- `.section`: `margin-top: 48px; padding-top: 32px; border-top: 1px solid var(--rule-2)`. On phones: 32px and 24px.
- `.section-title`: 18px 600, `-0.01em`, bottom margin 4px. `.section-lede`: 13px, `--ink-3`, line height 1.6.
- `.section-head` bottom margin 24px.

### 4.3 Disclosure (`.disclosure`)

- Native `<details>`. Summary is inline flex, 13px 500, `--ink-2`, padding 4px 0, no native marker. A 6px chevron (1.5px border, rotated -45deg; rotated 45deg when open) sits before the label.
- States: default `--ink-2`; hover `--ink`; open chevron rotates; focus uses the global focus ring.
- Body: `.disclosure-body` top padding 16px.
- Not used on Insights or Year since feat/year-tab: the Year and Week collapsible sections are native `details` (4.17b), and "More options" is a button with `aria-expanded` (4.11).
- Habit "Details" is not a disclosure; it is a text toggle button (4.11).

### 4.4 to 4.8 Buttons, chips, colour popover, form fields, AutoTextarea

Moved to [design-system.md](design-system.md), section 6 (built today, and the planned primitives for slice 3b). The rules that apply to every screen (one primary action per block, destructive actions text-coloured, icon-only buttons labelled) are in its section 6.1.

### 4.9 Goals (Harada), `app/components/harada/HaradaView.vue` (scoped)

Slice 3 (FR-GOALS-13 to 22). Page: `h1` "Goals" and a lede. Order top to bottom: ambition, Harada map, then the life area list with its detail (PRD 11.5).

- **Ambition** (`section.vision`; with no ambition yet, `section.vision.vision-new` shows the prompt "Write your 5-year ambition" with "Save ambition", disabled while blank, and saving creates it): `h2.section-title` "Ambition, N years" (N from the stored horizon, shown, not editable) and an Edit button (`aria-label` "Edit ambition"). View mode: the statement at 18px 500, line height 1.45. Edit mode: `AutoTextarea` "Ambition statement" that applies at once; Done returns focus to Edit; Escape leaves. Vision edit mode is local to the screen (one field), not in the URL. Opening it ends a category edit, and selecting a category ends it.
- **Map** (`.harada-grid`, read-only; shown only from 1100px, hidden below): 3x3 with hairline gaps. The centre (`.harada-centre`) shows "Ambition, N years" and the statement. Eight outer cells are `button.harada-cell` with a colour dot (16px), the order (`.cell-num`, "01" to "08"), the name (`.cell-title`) and "To define" (`.cell-status`, warn). Nothing else: no hints, counts or hours. A missing category leaves an empty placeholder (`.harada-empty`, `--bg-2`, `aria-hidden`). The selected cell has `--bg-4`, a 3px accent bar and `aria-pressed="true"`. Focus: the 2px inset accent ring (section 2.8). Keyboard: Tab between cells; Enter or Space selects; arrow keys move focus and skip the centre and empty slots without wrapping.
- **Life areas** (`section.section.browse`): on desktop, the list (300px) sits left and the detail right, separated by a 1px `--rule-2` rule with 32px padding. Phones stack them (section 3.5).
  - List (`ul.cat-list`, one `.cat-item` per life area holding a `button.cat-row`, min height 44px): colour dot, name (15px 500), then the 5-year goal (`.cat-goal`, 13px ink-2): a 16px target icon (concentric rings with a centre dot, `currentColor`, ink-3) and the goal text, at most two lines (line clamp; the full text in the `title`), or "No 5-year goal yet" in ink-3 with the icon at lower emphasis. Then a status line in 12px ink-3 (`.cat-meta`): the 1-year target status ("Target set", "No target yet", or "Target to define" in warn), a middle dot, and the entry counts ("3 habits · 2 activities", or "No habits or activities yet"). Text carries the status, never colour alone. The line wraps onto as many lines as it needs: no ellipsis, no line clamp, and the row grows with its text (the dot sits on the first line). There is no outline, flag or legend for status any more. The selected row has `aria-current="true"` (set from the URL selection only, so on a phone with nothing selected no row is marked), `--bg-4` and a 3px accent bar; its secondary text uses `--ink-2` on the tint. Up and Down arrows move focus between rows.
  - Note under the list above eight categories (13px ink-3): "Only the first 8 categories appear on the Harada map. The others work everywhere else." (FR-GOALS-21).
  - "+ Add life area" (`.chip-add`) reveals a form (progressive disclosure, FR-GOALS-19): name (`.timely-input`, "Name can't be empty" as `.field-error` when submitted blank), colour (inline palette `.color-pop-inline`), primary "Add category" and "Cancel"; Enter submits; Escape closes. The new category opens selected in edit mode with its name focused.
- Empty state (no categories): "No goals yet. Start from the starter grid and adapt it." with "Load starter grid" (`.btn-primary`, FR-GOALS-10). The ambition still shows above it.
- Phones (768px and below): the ambition and the map stack above the list. When a category is selected the vision, map and list are hidden and the detail shows full width with "Back to categories" (`.detail-back`, FR-UX-8); Back restores the scroll position and focuses the row. The map is hidden on phones and tablets.
- Closing (desktop and phones): the Back to life areas button (`.detail-back`, chevron and text, on its own line above the title at every size) and Escape clear the selection (`item` and `edit` leave the URL) and return to the list. Escape in edit mode first leaves edit mode, then closes. With nothing selected, desktop shows a placeholder beside the list; phones show the list alone.

### 4.9a Removed: needed and planned comparison (2026-10-29)

The comparison of what the habits need with the time planned for each life area (`PlanComparison.vue` in Insights, `PlanBadge.vue` in Goals) was removed on 2026-10-29. The owner judged it circular: both sides come from the same habits. Nothing of it remains in the screens. The Year tab keeps the available time (the Life areas list, 4.11a); the donut is kept unused (4.9c); Goals keeps each habit's plain need text (4.10). A time budget per life area is the later idea, not built.

### 4.9c Where the week goes (Week tab, `app/components/planner/TimeSplit.vue`, FR-PLAN-27; A2 words and look, 2026-11-04)

Since 2026-11-05 the card sits below the Week card (the schedule chips, the week grid and the entry buttons, 4.12). It shows how the typical week of the active schedule divides its available time: 168 hours, less the sleep when Show sleep is off (the awake hours of `app/utils/awake.ts`, FR-SLEEP-9). It is a card (`.where`: `--surface`, the xl radius, `--elev-1`, 24px by 32px padding) with no disclosure. With no active schedule it is not drawn. With nothing planned it reads "Nothing planned in this schedule yet." (`.acts-empty`) in the same place.

- Layout (`.where-grid`): the ring (220px wide) at the left and the words and the list at the right. Under 480px the ring sits above the words, centred, full width.
- Title and summary: "Where the week goes" (`h2.where-title`, 14px, `--ink-3`, regular), then the summary line (`.where-sum`, 17px): "{planned} planned · {free} free · {available} awake", the numbers bold. With Show sleep on the last words read "in the week" (sleep sits under Physical then).
- Ring (`planner/TimeSplitDonut.vue`, classes `.where-donut*` in `features/week-where.css`): one slice per life area with planned hours, in its colour, from 12 o'clock in list order; the rest is Free (`--line`). Stroke 16 units, 20 when selected. SVG only. The slices draw in under Lively only (`motion.css`, the `draw` keyframe); Calm shows the ring at once. Each slice and the ring have a `<title>`. The centre shows the planned hours and "planned" (`.where-donut-value`, `.where-donut-sub`); with a slice selected it names the slice.
- List (`ShareList` with `rest-label="Free"`, selectable): one row per life area (dot, name linked to its Goals item, hours, percent of the available time), then Free as the last row with a hollow dot. Rows are 34px high with no rules between them (`.where .share-row`). The shares add up to 100.
- Note (`.where-note`, 14px, `--ink-3`): "Sleep is not counted." (or "Sleep is counted under Physical." with Show sleep on), then "{schedule} is used in N weeks of {year}.". N is `weeksUsing`: only the weeks that have this schedule (2026-11-05; a blank week counts for none, FR-INS-P3 superseded). With none, the line reads "No week of <year> uses <schedule> yet."
- Selection: as before. A click or tap on a slice or a row selects it; the others dim (opacity 0.5); the centre names it; a second click, a click on the centre or Escape clears it. The name of the rest is Free.
- Rules: `templateSplit(state, template, showSleep)` and `FREE_LABEL` in `app/utils/insights.ts`; `weeksUsing(state, templateId, year)` in the same file. Tests: `tests/unit/insights.test.ts` (the sum to 100, the sleep rule, the awake hours of the one awake rule, the weeks a schedule is used in).

### 4.9d Insights adherence (`app/components/insights/AdherenceView.vue`, FR-INS-P6; rules in `app/utils/adherence.ts`)

This is the whole Insights page (since feat/year-tab, FR-INS-P7; there is no chart choice any more). The range controls sit above it (4.11). Top to bottom:

- **Headline.** A 96 px ring (SVG, `.adh-ring-*`, arc in `--accent`, or `--ok` when only habits count) with the percent in the centre, and the text beside it: "Done 5% of planned" (`--fs-lg`, 600), then the planned hours ticked, the blocks ticked and "Habits: x of y target ticks (z%)" in `--fs-sm`, then a muted line "Counted from 9 October 2026 to today, 21 days." (counting starts at the first tick), then the quiet note "Earlier weeks are not tracked yet." when periods were trimmed. The ring is decorative (`aria-hidden`); the text carries the figure.
- **Key.** Swatches for planned time ticked and habits against target, plus "not yet" (dashed) only while a dashed bar is drawn; `--fs-xs`, `--ink-3`. The bars are trimmed (see FR-INS-P6): they start at the period holding the first tick and end at the current one.
- **Bars.** The Insights bar grid (`.insights-chart`, `.insights-axis`, `.insights-ticks`) at a 0 to 100% scale. Each bar is a value row (16 px, `.adh-value`, shown on 12 bars or fewer) above a track (`.adh-track`) with a fill (`.adh-fill`): `--accent` for planned time, `--ok` for habits only. Future bars are a dashed outline (`--cell-line`); a period with no plan is a 2 px line in `--cell-line`; a period before the first tick is dashed too, titled "Not tracked yet"; a 0% bar keeps a 2 px fill so it still reads as planned. Every bar has a `title` with its numbers. No red.
- **By life area.** Rows (`.adh-area`, a grid with named areas): dot and name (a link to its Goals item), the detail line in `--ink-3` ("13 of 272 blocks, 30 of 673 habit ticks"), a meter and the percent in `--ink`. Stacked on phones below 560 px.
- **Habits.** Two short lists side by side (`.adh-habits`, one column on a phone): "Kept up" and "Could use another go", each row the name and "8 of 10". Empty lists say so in neutral words.
- **Journal nudge.** A quiet panel (`.adh-nudge`, a 1 px `--rule-2` frame): the count of days with a note, the prompt "What helped this week? What got in the way?" and an "Open Home" button.
- **Empty state.** No tick in the range: "Tick activities on Home and your adherence shows here." and "Open Home" (`.adh-empty`). The other parts are not shown.

Wording stays neutral: no streaks, no "missed", no red. A quarter or year choice shows a note: "Quarter and Year show one bar per month." Verified at 1280 and 400 px, light and dark, with real mouse clicks; see the PRD row FR-INS-P6.
### 4.9e Adherence ring (`app/components/AdherenceRing.vue`)

A shared donut of an adherence percent. Props: `percent` (null shows "-" and no arc), `basis` (`habits` draws the arc in `--ok`, else `--accent`), `size` (px, 240 by default, shrinking on a narrow screen) and `showValue` (default true). viewBox 200, r 70, stroke 28, `pathLength="100"`, track `--bg-3`. `aria-hidden`: the figure is in the text beside it. Used on Insights (Adherence, 240px with its value) and on Home (28px, no value).

### 4.10 Category detail (`CategoryDetail.vue`, scoped; its list is 4.20)

`HaradaCategoryDetail` (FR-GOALS-16 to 18; FR-GOALS-20 is not built). Keyed by the category, so its drafts reset on change.

- Head: `h3.detail-name` (dot and name, 18px 600) and Edit (`.btn-sm.btn-outline`, `aria-label` "Edit {name}") or Done (`.btn-primary`). Done returns focus to Edit. Escape closes a removal confirmation first, otherwise leaves edit mode. Back to life areas (`.btn-sm`, `.detail-back`: chevron and text, on its own line above the title) clears the selection.
- View mode:
  - "5-year goal" and "1-year target" (`.detail-text`, "Not written yet." in ink-3). The "To define" flag (warn) sits above the target text when the target is flagged.
  - Superseded by section 12, formerly "Goals vs. planned" (`.detail-goal`): a caption "Hours a week in {template}, through this category's habits.", the track (`.goal-track`, `.goal-fill`, `.goal-target` tick) drawn on the largest value across all categories (the Insights scale), figures in `.goal-figures` ("X h of Y h a week", or "X h a week scheduled" without a target), the quiet total ("Z h scheduled in total") and flags ("No target yet", "No time planned", "N habits not linked to an activity"). The computation (`categoryAlignments`) was removed on 2026-10-29.
  - "Habits": read-only rows (`.habit-row`): name, "N a week, M min", then "Linked to {activity}" (a link to the activity in Planner) with the activity's category in brackets when it differs from the habit's own, or "Not linked" (FR-GOALS-22) as quiet text: 12px `--ink-3`, not bold, no badge or warning colour, because it is not a problem (`.habit-meta.is-unlinked`). The linked line is the informative one. Empty: "No daily habits yet for this life area."
  - "Activities": rows with name, short code and hours a week in the active template, and an "Edit" link to the activity in Planner with edit mode (FR-UX-4). Empty: "No activities in this category yet. Add one in Planner."
- Edit mode (edits apply at once, FR-UX-6):
  - Name (`#cat-edit-name`, `.timely-input`); an empty name shows "Name can't be empty" and is restored on blur.
  - Colour: inline palette (`.color-pop-inline`); recolouring changes only activities still on the old colour (A6, store rule).
  - 5-year goal and 1-year target: `AutoTextarea`. "Target still to be defined" is a native checkbox (`.check`, accent colour) that sets `targetTbd`.
  - Habits: one row per habit with Edit (`aria-label` "Edit {name}", `aria-expanded`) that opens its form inline; one form open at a time. The form: name (`AutoTextarea`), times (number), period (`.timely-select`), minutes each (number), linked activity (`.timely-select` with an `optgroup` per category: the habit's own category first, then the others in order, categories without activities omitted). "Remove habit" opens an inline confirmation (`.inline-confirm`) and removes nothing before "Remove". "+ Add habit" (`.chip-add`, below the list) is in view mode, in edit mode and in the empty state. It opens a draft form with the same fields (`HabitForm.vue`, shared with each habit's edit form). Save habit adds the habit through the store; Cancel and Escape discard the draft; a missing name is refused with a message; focus moves into the name.
  - Activities: the read-only rows above.
  - Move up and Move down (`.btn-sm`, disabled at the ends); Remove life area (`.btn-danger`) opens an inline confirmation (`.inline-confirm`) that names the impact: "Its N activities and M habits must move to another category before X is removed." with a select of the other categories and "Move and remove"; with no content, "Remove X? It has no activities or habits." Without another category: "Add another category first, then remove X." Removal selects nothing afterwards.
- Removed 2026-10-29: the "Time against need" block and its "See in Insights" link. The habit lines keep "Needs 6 h a week" as plain text (`entries.ts`, `needText`).
- Shared classes (`forms.css`, `shared.css`): `.form-stack`, `.form-row` and `.form-row-3`, `.form-actions`, `.inline-confirm`, `.inline-confirm-text`.

### 4.11 Insights (`app/components/insights/InsightsView.vue`, the Adherence view)

Since feat/year-tab (2026-11-01) Insights is the adherence view only (FR-INS-P6, FR-INS-P7; the view is in 4.9d). The planned hours and the life areas moved to the Year tab (4.11a). Read-only.

- **Page.** Title "Insights" (`.page-title`), then the range controls (`RangeControls.vue`, state key `insights`, no unit row): the year switcher (`YearNav`) and Month or Week (`.segmented`) on the first row, then "More options" (`.btn-sm`, `aria-expanded`, `aria-controls="insights-more"`; ": <setting>" in `--ink-3` while closed when a setting is not the default).
- **More options** (`#insights-more`, `.insights-more`): a 1px `--rule-2` frame with 6px radius and 16px padding, holding Year or Quarter and One year or Several years (with the horizon select). Closed by default. There is no Hours, Days or Weeks choice here.
- **Chart.** The adherence view (4.9d): the headline, bars by weekday, ISO week or month, life areas, habits, and the journal nudge. No Show sleep toggle and no capacity label; sleep never counts.
- **Empty.** No tick in the range: the empty state of 4.9d.

### 4.11a Year (`app/components/year/`, the Year view of Plan; A2 words and look, slice 7, 2026-11-04)

The Year view of Plan (`?tab=plan&view=year`). The page title is Plan with the sub-nav (Dreams, Week, Year), so the view has no title of its own. Since 2026-11-05 there is no lede, and the year switcher is in the Year planner card. Top to bottom, in the A2 order of the mockup (`spec/mockups/prototype-a2/`):

- **Lede:** removed on 2026-11-05. It said that weeks with no schedule of their own use the active one, while the year grid shows those weeks blank; the view opens on the Year planner card.
- **Paint tools** (`YearPainter.vue`, `.paint-tools.year-paint`, inside the Year planner card under its hint): "Paint with", then a chip per schedule (44 px, `--hit`; the dot takes the schedule's colour through `areaVars`) and the last chip "Clear" (2026-11-05; it was "Clear to <active schedule>"), whose accessible name and tooltip say "Clear: leaves the week with no schedule" (2026-11-05; it named the active schedule before). Clear is the erase tool: a week it clears has no schedule (blank). Under the chips, "Apply to several weeks" (`.btn-outline`, `aria-expanded`, `aria-controls="weeks-panel"`, 4.17b) is closed by default. Open, the panel holds "for weeks [from] to [to] [Apply]", the hint "Applies <schedule> to these weeks." or "Clears these weeks to <active schedule>.", and the result "Weeks 2 to 5 use <schedule>." or "Weeks 2 to 5 are cleared to <active schedule>.". Escape closes it. A schedule id in the URL (`item`) is chosen in Paint with and opens the panel.
- **Schedule card** (`section.year-card`, `details.year-details`, open by default, in memory only): the title "Year planner" (`.section-title` with the chevron; "Which weeks use which schedule" before 2026-11-05), the year switcher (`YearNav.vue`) at its right, beside the disclosure and not inside its summary, and the count line "37 Standard Week · 12 Deep Work Week · 4 Vacation" (`weeksUsing`: only the weeks that have that schedule; the blank weeks are a line of their own, "N with no schedule", and a schedule with no weeks is left out). The body: the hint "Pick a schedule, then click or drag across the weeks." (2026-11-05: the "above" line and the outlined-week clause are gone; the legend says "This week"), then the paint tools and "Apply to several weeks", then the grid; with one schedule, the line "Every week of <year> uses <name>." only when every week of the year has it; the year grid: four rows of 14 weeks (`yearRows(weeks, 14)`), no row labels (the month labels say the months), and above each row a quiet line of month labels (`.year-months`, `.year-month`, the caption size, `--ink-3`) at the first week of each month, by its Thursday (`monthMarks`); a label with no room before the next one or the row's end is left out. A week with a schedule of its own is a square in that schedule's colour; a week with none stays blank (the empty cell) and plans nothing. Each square carries its number; the current week has a 2px `--ink` frame drawn inside its square (an inset shadow, so the scroll area never clips it). The grid scroll area has 8 px of bottom padding under its last row (2026-11-05), so the squares of the last row are not cut. The legend (`.year-legend`) has a swatch per schedule, "No schedule" (blank) and "This week". Each square is named for a screen reader by its week, month and schedule (`weekCellName`), and each row is a group named by its weeks ("Weeks 1 to 14"). Hovering a week shows its readout: its schedule, or "No schedule yet. Click to paint.".
- **Summary** (`year/YearSummary.vue`, `section.year-card`): the eyebrow "Planned hours in <year>" with the Show sleep switch (`UiSwitch`) at its right; the figure "4,232 h of 5,565 awake hours" (`--text-hero`; "hours" instead of "awake hours" with Show sleep on); one stacked bar (40 px, pill-shaped, the hatch behind it is Free): each life area's segment in its colour, its width its share of the available time, growing from the left in Lively only; the life areas list (`ShareList.vue`, not selectable): hours and percent, names link to Goals, "Free" as the last row; the note "Sleep is not counted. Awake time is each week less its Sleep hours." (or "Sleep is counted under Physical." with Show sleep on). The numbers are `yearSummary` (`utils/insights.ts`): the planned total is the sum of the monthly bars, Free is the available time less the planned hours (a blank week plans nothing, and its awake hours are Free), and the shares add up to 100. The hours are always hours; the unit choice is for the bars.
- **More detail** (`details.disclosure.year-detail`, closed by default): the range controls (`RangeControls.vue`, state key `year`: Month or Week, More options with Quarter or Year, one year or several, the unit), the capacity key (`.insights-cap-key`: "Available per month: up to 525 h", a neutral 2px line, `--ink-2`, not the attention red of the other charts) and the planned-hours bars (`year/PlannedBars.vue`, rendered as YearPlannedBars). Unassigned weeks count the schedule that governs them (FR-INS-P3).
- **Empty.** No planned hours in the range: the summary card is replaced by a card "Plan the week in Week and the hours show here." with "Open Week" (`.btn-outline`), and More detail is not shown.

The view keeps the `.view` width of the other Plan views (1120 px maximum); the mockup's 900 px column is a shell decision (slice 4). On a phone the grid's squares are 23 px at 400 px, 20 px at 360 px (62 px at 1280): square corners, a 2 px gap and a 12 px card side on a phone (480 px and narrower, `.year-schedule` and the grid rules in `year.css`); the numbers stay and the squares do not scroll (the mockup has no numbers).

### 4.12 Week grid (`app/components/planner/ActivityGrid.vue`, styles `.wk-*` in `week-grid.css` and `week-grid-select.css`)

The day columns are `app/components/planner/WeekGridDay.vue`; the pure rules are in `app/utils/weekGrid.ts`.

Layout (2026-11-05, the Year planner's order): the Week tab is one card, `.week-card` in `week-grid.css` (the surface, the xl radius and `--elev-1`, as the Year planner card; 12 px sides on a phone). Its one section, `.wk-details` (the "Schedules" title and the meta line first), holds in order: the tip (`.week-tip`, the hint style of the Year card, under the title), the schedule chips with their panels (New schedule, Edit schedule, the "X added" line; `WeekTypeBar.vue` stays mounted when the section is collapsed), Show sleep and the grid, then the entry buttons (`.wk-details > .entry-actions`). The whole section collapses (open by default, in memory only). "Where the week goes" (4.9c) is a card below the Week card. The grid's state, its composables and `utils/weekGrid.ts` are unchanged: the grid trace (320 steps at 1280 and 400) matches the previous build, apart from the moved chips and buttons and the heading word in focus strings.

Slice 6 (2026-11-04, A2 words and look): Show sleep sits at the left above the grid (`.wk-tools`). The selection is a ghost: a dashed accent outline (`.wk-sel`, solid while an activity is being edited) over a 12% tint, with its hours in a pill at the top right (`.wk-dur`, "3 h"). The action bar's first word on an empty run is "Add to these hours…" ("Change…" on a block, as before). The bar and the menu are lifted cards (`--elev-2`, the lg radius). The menu opens with "Choose what goes in these hours. It replaces what is there." (`.wk-menu-lede`). The grid's state, its composables and `utils/weekGrid.ts` are unchanged: the 2026-11-04 trace (320 steps at 1280 and 400, light and dark) matches the previous build apart from these words, the hour labels and a sub-pixel popup position.

Restored on 2026-10-26 to the original interaction (FR-PLAN-23); it replaces the slice 7 brush grid. Mounted inside `<ClientOnly>` in `PlannerView.vue`: the grid is state-driven, and server HTML kept the seed cells after hydration.

- Head line (`.wk-head-line`): title "Schedules" (section title, 2026-11-05; "Week" before) and a quiet meta line "{template} · N of 168 h planned" (13px, `--ink-3`, tabular).
- Frame (`.wk`): a card (`--surface`, the xl radius, `--elev-1`, 16px top and right, 12px bottom, 8px left padding), hidden overflow, minimum width 540px, inside `.wk-scroll`. Since 2026-11-04 (slice 6) it has no border. The frame scrolls sideways on phones; the page never does.
- Columns: a 52px hour gutter (`.wk-hours`, no band, 13px labels on every hour since 2026-11-04), then seven day columns (`.wk-day`). The header (`.wk-head`, `--bg-2`) has the day name (13px 600), the planned hours of the day (12px `--ink-3`) and a 24px clear-day button (`.wk-clear-day`) labelled "Clear Monday" and so on.
- Slots (`.wk-slot`): 28px per hour, a hairline above each three-hour line, `--bg-3` on hover. Each slot is one focus stop (`role="button"`, roving `tabindex`), named "Monday 9AM, Deep Work" or "Monday 9AM, free".
- Blocks (`.wk-block`): a run of one activity's hours, absolute over the slots, filled with the activity colour. The text colour is `inkOn(fill)` (section 5.2). A 1px inset hairline keeps dark colours visible in dark mode. The text is the activity's full name on wide screens (13px 600, ellipsis when it does not fit), and its short code on phones (480 px and narrower, one to three letters, so nothing is cut off). CSS shows one of the two (`.wk-block-full` and `.wk-block-code` in `week-grid.css`, 2026-11-05), so a screen reader reads one name. The full name is also the block's `title`, the delete button's label and the activity menu. The time range is 12px. The 24px delete (`.wk-block-del`, shown on hover or keyboard focus, hidden on touch) clears the block.
- Selection (`.wk-sel`): `--accent` at 16% with a 1px `--accent` inset frame and the duration in a small label. A run that holds an activity also carries its edge handles at once (2026-11-05, see Edit below). It ignores the pointer except its handles.
- Interaction (the original model, restored):
  - Drag down one day column from one hour to another: the run is selected. Release opens the action bar. A drag does not leave its column.
  - Click or tap a painted hour: its whole block is selected and the bar opens. Click or tap an empty hour: that hour is selected.
  - Touch only taps: a move of more than 8px is a scroll, so the page scrolls normally.
  - Action bar (`.wk-bar`, teleported to `body`; 2026-11-05: beside the run's day column, to its left when there is no room on the right, never over the run; at the bottom on phones): the day, range and duration, then for an empty run "Apply…" and "Cancel"; for a run that holds hours "Change…", the word button "Edit" (`.btn-sm.btn-outline`, label "Edit activity", which opens the entry's form; not a pencil), "Delete", "Save" (disabled until an edge has moved) and "Cancel". The bar is one editor: opening the entry form closes it, and the form closes it.
  - Apply or Change opens the activity menu (`.wk-menu`): each activity with its hours a week in the template, then "Clear these hours". Choosing an activity paints the run and overwrites what was there. The menu is fitted to the screen: its height is `min(400px, 100dvh - 16px)`, it moves up when its bottom would pass the bottom edge, and its list (`.wk-menu-list`) is the part that scrolls, with `overscroll-behavior: contain`. The overlay has `touch-action: none`, so a touch on it does not scroll the page.
  - Edit (2026-11-05, Edit range removed): a run that holds an activity gets its two edge handles at once, with no step before them: a click or tap on a block, a keyboard run (Shift with arrows, then Enter), or an Apply on a run that changes hours. Drag a handle with the mouse or the touch, or move the focused handle with Up and Down (one hour). The handles show under the box and hide under the Apply menu. The border of the run is the grip: a flat line across the full width of the run, 4px thick (6px and ink while hovered or pressed), with a 1px surface hairline on each side, square, with no room taken inside the block. On a fine pointer each handle is a 32px band centred on its edge (16px out, 16px in); a one-hour run is 28px, so its two bands split it (the top takes the upper half, the bottom the lower) and neither steals the other. On touch (`pointer: coarse`) each is 44px, reaching 38px out of the run and 6px into it, so a scroll that starts in the middle of a one-hour block still scrolls; the line sits on the edge. Focus shows as an outline on the line. While a run has handles, the delete cross of the blocks in its day column is hidden (Delete is in the action bar). `touch-action: none` is on the handles only. Save (in the box, enabled once an edge moved) applies the new run and clears the old one, as one undo step. Cancel with a moved edge puts it back and keeps the box; a clean Cancel closes the box and clears the selection. Change…, Edit and Delete act on the block as it is in the week (unsaved moves are dropped first). Apply on a run that changes hours opens the box on the new block at once, with focus on the top handle: Save then extends the Apply's undo step, and Cancel or Escape with no move leaves the block as applied (the undo line dismisses about 8 s later).
  - The cross in a day's header clears the whole column. A block's delete clears that block.
  - An open bar or menu covers the page with `.wk-overlay`, except a bar with handles: the grid stays live under it, so a handle can be dragged (2026-11-05). Pointer down on the overlay closes it (on pointer down, not click, because the click that follows a tap would land on the overlay the tap opened). Escape closes it and cancels any edit. A click outside the grid and its box ends the selection (2026-11-05).
- Undo (`.wk-undo`, role `status`, 13px `--ink`): after any change that alters hours, a line under the grid names the change ("Deep Work set on Mon 9AM – 12PM.") with an Undo button. Undo restores the template's slots as they were (one step). The line disappears after 8 seconds and is dropped when the template changes.
- Keyboard (added to the original so FR-PLAN-19 stays operable): one tab stop; arrows move; Shift with arrows selects a run in one day; Enter or Space opens the bar for the run, or for the block or hour under focus; Escape closes. Focus moves into the bar and the menu when they open and returns to the grid when they close. (2026-11-05) Shift with arrows over a run that holds an activity shows its handles at once; Enter opens the box with focus on its first button; Shift+Tab from that button goes to the bottom handle, and Tab from the bottom handle goes back to the box (the box is teleported to `body`, so the order is set in code).
- Writes go through the store: `paintCells` for apply, clear and edit, and `restoreSlots` for undo. Blocks come from `slotsToBlocks`; hours per activity from `aggregateTemplate`.
- A 30-minute template shows a notice in place of the grid (FR-PLAN-10, not built).


Slice 7 (FR-PLAN-17 to 22). The week is the first thing on the Planner. Mounted inside `<ClientOnly>` in `PlannerView.vue`: the grid is state-driven, and server HTML kept the seed cells after hydration.

- Head line (`.ag-head-line`): title "Week" (section title) and a quiet meta line "{template} · N of 168 h planned" (13px, `--ink-3`, tabular). No paragraph.
- Frame (`.ag-grid`, role `grid`): 1px `--rule` border, radius 6px, hidden overflow, `--bg`, minimum width 320px, inside `.wk-scroll`. Hour rows are hairlines (`--rule-2` top border on each row). Cells have **no borders**; columns are separated only by tint.
- Columns: 40px hour label column, then seven equal day columns. Header row (`.ag-head`, `--bg-2`, bottom rule): day name (13px 600) and planned hours of that day (12px `--ink-3`).
- Rows: 24 hours, 24px tall; each cell is a 24px target. Hour labels (`.ag-hour`, 12px `--ink-3`).
- Cell states:
  - free: `--bg`, empty; hover while painting `--bg-3`.
  - own (`data-tone="own"`): the brush activity, or any holder in the overview or Erase: `color-mix(in srgb, var(--c) 20%, var(--bg))`, hover 30%.
  - other (`data-tone="other"`): another activity while one is selected: 10% tint, quieter ink (`--ink-2`, weight 400), hover 20%.
  - The short code (12px 500, `--ink`) is printed only on the first hour of each consecutive block, so a block reads as one label. Every cell keeps its full name in `aria-label`.
  - range preview (`.is-range`): `--bg-4` and a 2px inset `--accent` ring.
  - focus (`:focus-visible`): 2px `--accent` outline, `outline-offset: -2px`, z-index 1.
- Helper line (`.ag-helper`, 13px `--ink-3`) under the grid, depending on the brush: "Painting {activity}. Drag across hours to fill them; hours of other activities are replaced.", "Erasing. Drag across hours, or press Space, to clear them.", "Select an activity or Erase, then paint hours on the week. A click on a coloured hour selects its activity.", or "Add an activity to start painting its hours."
- Undo notice (`.ag-notice`, role `status`, 13px `--ink`): replaces the helper line for 8 seconds after a paint that replaced hours ("Replaced 2 h of Deep Work and 1 h of Training.") or erased some ("Erased 3 h."). "Undo" (`.btn.btn-xs.btn-outline`) restores the template's slots as they were before that paint (single step). A paint into free hours shows no notice.
- Shortcut hint (`.ag-hint`, 12px `--ink-3`): "Arrows move. Shift with arrows selects a range. Space or Enter paints. Escape cancels." With no brush: "Arrows move. Space or Enter selects the activity in that hour."
- Painting (mouse, pen and touch use pointer events; `touch-action: none` while painting): press on a cell, drag across days and hours, release to paint. One gesture is one undo step. With no brush, a click on a coloured hour selects its activity.
- Keyboard (FR-PLAN-19): one tab stop (roving `tabindex`); arrows move; Shift with arrows extends a range; Space or Enter paints the range or the focused hour; Escape drops the range. Home and End move across days; PageUp and PageDown across hours. Cell names: "Tuesday 9AM, Deep Work" or "Tuesday 9AM, free".
- The grid writes through `paintCells` (store) and `restoreSlots` (undo), with `rectangleCells` and `rangeConflicts` from `app/utils/planner/slots.ts`.

### 4.14 Charts and legends (summary)

- Charts are hand-written inline SVG. No charting library is used. Chart.js is not a dependency (the PRD named it).
- Colour: the planned fill of the category colour (section 5). Labels: 12px `--ink-3`.
- Every chart has a text legend or a table beside it. Colour is never the only carrier of meaning.

### 4.15 Floating menus

`.color-pop`: `--bg` background, 1px `--rule` border, radius 6px, `--shadow`. The week grid's action bar and activity menu (`.wk-pop`, section 4.12) are fixed and teleported to `body`; the menu is kept inside the viewport and its list scrolls within it. A new floating element should be fixed and teleported to `body` so the grid cannot clip it.

---

### 4.16 Today (`app/components/today/`; rules in `app/utils/today.ts` and `app/utils/home.ts`; done keys in `app/utils/done.ts`; styles in `features/today.css`)

The first surface (FR-TODAY-1 to 9, FR-HOME-1, FR-HOME-14 to 18), drawn as prototype A2 (`spec/mockups/prototype-a2`, the Today screen). On a desktop the column is 788px wide, 56px in from the rail, with the mockup's 40px top and 64px bottom; on a phone it is one column with 20px and 16px sides. Top to bottom:

- Header (`TodayHeader.vue`): the eyebrow `p.today-eyebrow` ("Today · Wednesday 4 November · week 45", or "A past day · ..."; no year), then the day switch `.today-daynav` under it: previous and next (`.btn-icon`), and "Back to today" (`.chip`, past days only). Previous stops 60 days back; next never passes today (FR-HOME-18). The day is session state (`useState` "today-day"), not in the URL.
- Greeting (`p.today-greet`, 22px): "Good morning." by the time of day (`greeting`). The first word of the sign-in name is added in Supabase mode only. "Looking back at this day." on a past day. Empty until the clock is read (FR-DATE-6).
- Ambition (`p.today-dream`): "For: <ambition>", or "Your ambition is not written yet." with a link to Dreams. The mockup's ambition ring is not drawn: the model has no progress per life area.
- Focus (`TodayFocus.vue`, `section.card.card-focal.today-focus`: 36px inside, the card shadow, lifting on hover): a 76px `UiTick` (`data-tick` = the item's key, "Mark <name> done"); then the eyebrow ("On now · 9 AM to 10 AM · Professional", "Next · ..." or "Ended · ..." for a block, "Next · a habit for today" for a habit) with the pill `.today-pill` (`data-state`: `now` with a live dot that breathes under lively, `soon`, `later`, `ended`, `last` or `done` (a ticked block: "Done · next at 2 PM", or "Done"): "Last one for today" on a habit that is the last to do; a habit otherwise shows its progress or "Any time today"); the title `h1#today-focal-title` (44px); and "Behind this: <1-year target>" (`.today-behind`). With no target, or one to be defined, it reads "Behind this: <area>. No 1-year target yet." The item follows the clock on today (FR-TODAY-2): the block in progress, ticked or not (a ticked one stays in focus, as done); else the next block that starts later; else the most recent ended block not ticked; else the first undone daily habit. Every item done gives the done state, whatever the clock. A past day takes the first undone item. A clock tick that moves the focus keeps the keyboard on the same item (its tick in the list, or the heading). The day line sits under it, then the cheer line (`.today-cheer`): after a tick on today, one warm line ("A first one is a real start.", "Last one for today. You are nearly there.", or one of three steady lines). It clears on another day.
- Done (`TodayDone.vue`): no check disc. "Today is done." in the accent ("That day is done." on a past day), "N things ticked. Rest counts. The rest of the week can wait.", and on today "Plan tomorrow" (`.today-quiet`, a quiet button to Week). The day line sits under it.
- Nothing planned (`TodayNothing.vue`): the free-day picture (`.today-ill`: a dashed ring, a tint disc and the ground line), "Nothing planned for today.", and the line "A free day counts too. One small step is there if you want it." (or "Your plan is empty. Setting it up takes about three minutes." with no ambition). One primary button: "Plan <habit> in Week" (the weekly habit furthest behind its count, `nextHabitAction`, with an ambition), else "Open Week", or "Set up my plan" with no ambition. A past day only says so.
- Day line (`TodayDayLine.vue`, `dayLineBlocks`, `dayLineAxis`): the count `p.today-cap` ("**2** of 7 done today"; the number is bold and always shown; `role="status"`, so a tick is read out). Then one track `.today-track` (22px, `--line-2`, 32px under the count): one `.today-seg` per block of the day, clipped to the range and placed by its hours, coloured by its life area through `areaVars`. A ticked block is filled (`.is-done`); a block to do is a tint with an outline of the same colour, so the shape carries the state. The now marker `.today-now` on today carries the label "now". The axis `.today-axis` sits under the track: the two ends of the awake range, and 12 and 18 when they fall inside it ("7 AM", "12 PM", "6 PM", "10 PM" for the usual 7 to 22). Habits have no hours and are not on the track. Without a block, there is no track.
- Today's list (`TodayItems.vue`, `section.section`, no hairline; the title "Today's list" in every state): every item of the day, the one in focus included, in time order. The item in focus has `aria-current="true"` and a quiet accent mark in its meta line ("On now", "Next" or "Ended"). `ul.today-list` of `.today-row` rows (56px, a hairline between them), each with its name (16px), its time ("9 AM to 10 AM") or "Habit, every day", and its life area (an 8px dot and a link to Dreams), and its tick at the right end (a 28px ring, filled in the accent when ticked). The list is the day's items only: its blocks and its daily habits. A done row is struck and muted (`.is-done`).
- This week (`TodayWeekStrip.vue`, `section.section`): seven 36px pips from Monday (`.today-pip`), each `.is-full` (accent, with a check), `.is-part`, `.is-none` (dashed), `.is-free` or `.is-future` (dotted), with an `sr-only` word for screen readers. Today has `aria-current="date"` and a ring. The note `p.today-strip-note` is the forgiving line.
- Journal (`TodayJournal.vue`, section 4.18).
- All habits (`TodayHabits.vue`, `details.disclosure.today-habits`, closed by default; the summary "All habits (N)" with a plus that turns to a minus): each life area in order (`.today-habit-group`, the area name in `--ink-3`). Each habit is a `.today-row.is-habit`: its name, then the meta ("Every day", "Once a week", "3 times a week", then "1 of 3 this week"), then at the right end either "Planned as a block" when a block of that day stands for it, or the round tick (`UiTick`, the same circle as the blocks, named "Tick <name>", `aria-checked`).
- Ticks: every tick is the `UiTick` checkbox (`aria-checked`; `data-tick` holds its key): "Mark <name> done" on the focus and in the list, "Tick <name>" in All habits. The list ticks sit at the right end of their row. The Tab order is the header, the focus, the day's list, the strip, the journal, then All habits. A tick keeps the keyboard where it is: the tick pressed stays focused, and the page does not scroll. Only when a tick leaves the page (its item moves into the focus card, or the day is done) does the keyboard go to the same item's tick wherever it now is, or to the card heading when there is none (`TodayView` `toggle`). The focus walks only the day's items (blocks, then daily habits, `focusItem`); a weekly or monthly habit is never the focus, and a tick of one in All habits changes neither the count, the focus nor the done state (2026-11-04).
- Calm and Lively: nothing moves outside `:root[data-motion="lively"]` (the live dot breathes there, in `motion.css`). Every number and state shows in Calm. The shell's glow is the other moving part (section 4.x of the shell, `features/shell.css`).
- Phones: one column; the tab bar sits over the footer's space (checked at 400 px).
- Not on Today yet, and why: the ambition ring and the share of the way to each target (the model has no progress per life area); the name in the greeting in local mode (there is no name); the mockup's "Add <habit> this evening" one-day block (the model has no one-day block, so the habit is planned in Week); the fill sparks of the mockup.

### 4.17 Entry buttons under the week (`app/components/planner/EntryActions.vue`, `.entry-actions` in `app/assets/css/`)

Since 2026-11-04 the Week tab has no Activities list. Under the week grid, one row of quiet outline buttons (`.btn-sm.btn-outline`):

- "+ Add activity" (`aria-expanded`) opens the one form (`ActivityForm.vue`, 4.20) for a new entry, with the first life area preselected. Save, Cancel and Escape close it and return focus to the button.
- "Sleep hours" (`aria-expanded`) opens the form on the Sleep activity, whose nights are the Sleep editor (4.21). The nights of the active week type show beside it ("10 PM to 7 AM"). Without a Sleep activity the button reads "Set up sleep" and paints the default night (FR-SLEEP-2).
- The form opens under the row, one at a time. A save that paints hours leaves its result line (`.sched-result`, role status) under the row, with Undo for 8 s.
- `?item=<id>&edit=1` opens the form on that entry (a habit's id or an activity's id), so an old link still lands in the form. Entries are otherwise edited from Goals (4.20).
- Opening the week type editor, an entry form or the week grid's box closes the others (one item in edit mode per screen, 2026-11-05). The grid's Edit activity opens the entry's form; a form opened from the grid returns focus to the grid cell.
- Phones: the buttons wrap, the form takes the full width, and the panel takes focus, not the name field (FR-UX-9).

### 4.17b Week type panels (`PlannerView.vue`, `.sched-*`, `.new-template-panel`, `.role-*` in `week-panels.css`, `.weeks-*` in `sections.css`). The schedule panel is retired: its fields are in the one form (4.20)

Added 2026-10-28 (FR-PLAN-25, FR-TPL-8, FR-YEAR-7). All three use existing tokens and the `.act-panel` surface.

- Schedule in the week: a button "Schedule in the week" (`.btn-sm` in `.act-schedule-toggle`, under the activity detail in view mode, `aria-expanded`, `aria-controls="act-schedule"` while open) is closed by default. Open, the panel (`.act-panel.act-schedule`, `#act-schedule`) has a title with a "Close" button (`.btn-sm`, right of the title; Escape also closes, from the panel or the button, and focus returns to the button), a lede that names the active week type ("Paints {activity} in **{week type}**. Hours it replaces belong to other activities."), an optional habit hint, then Days (`fieldset.sched-days`, legend "Days": seven `.chip` toggles with `aria-pressed`), Duration and Start (`.form-row` as a two-column grid here, one column under 480px; `.timely-select`, "1 h" to "12 h", "12AM" to "11PM"), the inline error (`.field-error`, role alert), "Add to my week" (`.btn-primary`, disabled when the week type is not hourly), and the result line (`.sched-result`, role status; outside the panel, under the button, so it stays after Close): "Added 3 x 2 h. Replaced 6 h of Deep Work." with "Undo" (`.btn-sm`) for about 8 s.
- Words (2026-11-04, slice 6): on the Week tab a schedule is a "schedule": the bar's label is "Schedule", the button is "+ New schedule", the pencil is "Edit schedule", the New panel is "New schedule" (its button "Add schedule") and the Edit panel is "Edit schedule" (its delete "Delete schedule"; its time off line reads "working schedule"). The entry form keeps "week type"; Year says "schedule" from slice 7 (2026-11-04).
- Closing (fix/week-year-and-close): Edit week type (`.template-edit`) has "Done" (`.btn-sm.btn-primary`) in its head; Done and Escape close it and return focus to its pencil (`EditButton`). New week type has "Cancel"; Cancel and Escape close it and return focus to "+ New week type".
- New week type (`.act-panel.new-template-panel`, below the week type bar): the name field, Start from (`#new-template-from`: Empty, "Copy of <name>", then the four presets), the preset's lede in `.new-template-lede`, one `.role-row` per role the preset paints (a 96px label column beside a `.timely-select`, one column under 480px; the options are the activities, "Create \"Sleep\"", "Leave empty"), "Keep my habit sessions" (`.check`), and "Add week type" and "Cancel". Escape cancels; Enter in the name adds.
- Time off: a `.check` in the week type edit panel, "Time off: Goals reads its hours from a working week type".
- Collapsible sections (`.wk-details`, `.acts-details`): the Week grid and the Time split are native `details`, open by default, with a `.section-summary` like the Year summary (title on one line, no marker; the Week summary also carries its template line). The Show sleep button sits inside the Week disclosure, on its own right-aligned row above the grid (`.wk-tools`), so it hides with the section. The open state is in memory only.
- Disclosure marker on the summaries (Year, Week, Time split): a 6px chevron before the title, the same as `.disclosure` (1.5px `--ink-3` border, rotated -45deg; 45deg when open, 0.15s). The native marker stays hidden; the summary keeps its keyboard and screen-reader behaviour, so the marker is decoration only. It sits at the title's left, so it never meets the counts or the Show sleep button.
- The Year section has moved to the Year tab (feat/year-tab, 2026-11-01; 4.11a). The Week tab shows "{name} added. Choose its weeks in Year" (`.sched-result`, role status) after a new week type, with a link to `?tab=year&item=<week type id>`.
- Apply to several weeks (2026-11-04; `.weeks-row`, `.weeks-toggle-row`, on the Year tab under the paint tools): a `.btn-outline` toggle with `aria-expanded` and `aria-controls="weeks-panel"`, closed by default. Open, the panel (`#weeks-panel`, shown with `v-show`) holds one line of `.weeks-part` text and controls, "for weeks [from] to [to] [Apply]" (two `.timely-input.weeks-num` number fields, 72px, and the Apply `.btn-primary`), then the hint (`.weeks-hint`: "Applies {schedule} to these weeks." or "Clears these weeks to {active schedule}.", from the paint tool) and the result (`.weeks-result`, role status: "Weeks 2 to 5 use {schedule}." or "Weeks 2 to 5 are cleared to {active schedule}."). It wraps under 400px. Errors are `.field-error` (role alert). Escape or the button closes it and focus returns to the button; opening focuses "for weeks" on a desktop and the panel on a phone (FR-UX-9). There is no "Use" choice: the paint tool is the week type.
- Keyboard and touch: every control is a native control with its label; no drag. Focus moves to the new week type's Weeks "from" field after a Vacation preset.

### 4.18 First-run onboarding (`app/components/onboarding/`, `.onb-*` in `onboarding.css`)

Feature FR-ONB (PRD 9.13). Session state only (`useOnboarding`, Nuxt `useState`); nothing here is saved. Client only (`ClientOnly` in `app.vue`).

- **Dialogs** (`OnboardingFlow.vue`): Welcome, then two steps, each a centred dialog (`.onb-overlay` scrim in `color-mix` of `--ink`, `.onb-dialog`: `--bg`, 1px `--rule`, radius 6px, `--shadow`, 460px max, 24px padding on phones). Each step opens with `.onb-step` ("Step 1 of 2", 12px `--ink-3`), then the title `.onb-title` (18px 600, `aria-labelledby`) and `.onb-lede` (15px, `--ink-2`, 1.6). Welcome actions: "Guide me" (`.btn-primary`), "Start empty" (`.btn-outline`) and "Explore with sample data" (`.onb-link`, accent text, underline on hover). Under them, a quiet link "Watch the short intro" (`.onb-link.onb-intro-link`) opens the intro, which returns to Welcome. Step 1 is one `.field` (`.timely-input`) with "Next" and "Back". Step 2 holds one `.onb-goal` block per goal (a 1px `--rule` above each block after the first; "Goal 1" as `.onb-goal-title`; "Remove" as `.onb-link` on the second). Each block has the life area as a single choice among the eight default life areas (`.onb-chips`, a `role="group"` of `.chip` buttons with `aria-pressed` and `data-active`; the area the other goal uses is disabled at 45% opacity; there is no free-text field, the name can be changed in Goals), the optional one-year target, the habit, and the times and hours selects side by side in `.onb-pair` (one column under 480px). "Add a second goal" is `.onb-link.onb-add`, shown below two goals. Errors are `.field-error` with `role="alert"` and `aria-invalid`, and the first invalid field takes focus. Focus goes to the marked field (`data-autofocus`) on open. Escape goes back one step (Welcome: Start empty). Answers are kept when going back to Welcome from step 1, and cleared when a new run starts (after Reset my data).
- **Tour card** (`OnboardingTour.vue`): `section.onb-tour`, fixed to the bottom centre (`min(440px, 100% - 32px)`, `bottom` with the safe-area inset, `max-height` 40vh and scroll; 36vh on phones), `--bg`, 1px `--rule`, `--shadow`, z-index 30. It does not block the page. Three cards, Plan your week, Your year and Daily follow-up. The cards name only the life areas the build filled (`onboardedCategories`), never the other default areas. Parts: the title `.onb-tour-title` (15px 600) and the body `.onb-tour-body` (13px, `--ink-2`, 1.6), and the actions: "Skip tour" (`.btn-sm`) on the left, Back and Next or Done (`.btn-sm`, primary on the last) on the right. Focus moves to the title on open and on each step. Escape skips. On the last card a secondary "Watch the intro again" (`.btn-sm`) opens the intro; the intro returns to the tour when it closes.
- **Intro** (`OnboardingIntro.vue` is the dialog, `IntroPlayer.vue` the player, FR-ONB-9): the same scrim, a 640px dialog (`.onb-intro`, full width minus the gutters on phones) titled "How Timely works" (`.onb-title`). A 16:9 stage (`.onb-intro-stage`: `--bg-2`, 1px `--rule`, 6px radius, `position: relative`) holds the caption band and one SVG with five scenes (`.onb-intro-scene` with `data-active`). The caption band (`.onb-intro-caption`) is the top 28 percent of the stage, or taller when its text needs a third line (`min-height`, so the text is never clipped): `--bg` with a 1px `--rule` underneath, text `--ink` at weight 500 and `clamp(0.875rem, 2.4vw, 1.3rem)` (0.8125rem up to 480px), centred, fading in with each scene (`onb-intro-caption`, opacity only: an upward offset clipped the band top while it animated and while paused). The SVG graphics start below the band (y 104 of 360 units), so no graphic sits under the text. A scene crossfades in, and its CSS animations run only while it is active (`.onb-intro-fade`, `-rise`, `-slide`, `-pop`, `-grow-x`, `-grow-y`, `-draw`, with the delay in `--d`). The stage has `data-paused`, which pauses the animations with the timer, and `data-static`, which switches the animations off until the first Play so that scene 1 is drawn whole. Colours are tokens, or the planned fill rule for hours and bars. The same caption is in a `.sr-only` paragraph with `aria-live="polite"` under the stage, so there is no visible caption line below it. Below the stage: five progress segments (`.onb-intro-segment` with `.onb-intro-bar` and `--fill`; 24px, 44px on phones) and the controls (`.onb-intro-controls`: Play or Pause, Back, Next or "Continue", and "Skip intro" as `.onb-link`). Before the first Play, a round Play button (`.onb-intro-play`: `--accent` fill, `--on-accent` icon, 64px, 56px up to 768px, centred over the stage, `aria-label` "Play the introduction") covers the centre of scene 1; the first Play starts from scene 1 and moves focus to Pause. A segment clicked before the first Play jumps to its scene and stays paused. Reduced motion: no Play button, no timer, every scene whole. Escape skips. The player is shared with the sign-in page (section 4.19): `IntroPlayer` takes `loop` and an `end` slot, which the dialog fills with "Continue" and "Skip intro". The timer also holds while the tab is hidden or the stage is out of view (`visibilitychange`, IntersectionObserver). It never starts by itself: the first Play starts it. The dialog (`.onb-dialog`) is centred with auto margins, keeps its max height (100dvh minus 32px) and scrolls inside only if needed; on phones (480px and below) its padding is 16px. "Continue" is always shown in the dialog, so the video is optional. Known gap: no focus trap, as in the Welcome dialog.
- **Account menu "Replay tour"** (`.btn-sm` in `.account-menu`, after the Dark mode switch, in both modes): replays the tour from Plan your week. Hidden while storage loads. The topbar has no Tour button and no tab numerals.
- **Touch:** at 768px and below the dialog buttons, tour buttons and the chips are 44px high.
- **Scrim and motion:** no animation; the dialog appears at once.
- **Reset confirm** (`app/components/account/ResetDataDialog.vue`, FR-ONB-10): the same scrim and dialog, `role="alertdialog"` with the title "Reset my data?" and the body text in `aria-describedby`. Cancel (`.btn-outline`) has focus on open; Delete my data is `.btn-danger-solid` (filled `--danger`, text `--bg`, 6.9:1 light, 9:1 dark). Tab stays between the two buttons; Escape cancels. A failed save shows `.field-error` with `role="alert"` and keeps the dialog open.
- **Account menu** (`.account`, `.account-menu`, `aria-haspopup="true"`, not a `menu` role: it holds buttons and a switch): opened by the avatar in the top bar, in both modes. Everything is left aligned. The header (`.account-head`) holds the name ("My account" without a Google name; the email is not shown; "Local mode" with "Saved in this browser" in local mode) and under it the save status (`.account-status`, `aria-live="polite"`: "Loading...", "Saving...", "Saved" or "Not saved", with the error message under it; hidden in local mode). Then the rows (`.account-item`, a 16px line icon `.account-icon` and the label): Dark mode (moon icon, with the switch track at the right), Replay tour (play, hidden while loading), Reset my data (bin, `--danger`) and Sign out last (Supabase mode only).
- Focus (FR-UX-9): on open, a desktop focuses the first control (the Dark mode switch); a phone focuses the panel itself, so the keyboard stays down (`focusEditField`, `app/utils/focus.ts`). Escape closes the menu from anywhere inside it and returns focus to the avatar. A click or tap outside closes it. Tab moves through the controls.
- Visual check: `spec/screens/onboarding-*`.

Known gaps: the dialog has no focus trap; the tour card can cover the lower part of a short phone screen (it scrolls and is dismissible).

### 4.17a Retired: brush palette (slice 7, `.pal-*`)

Removed on 2026-10-26. The palette set the brush (an activity or Erase) and the grid painted at once with no edit gate. Both are superseded (FR-PLAN-17 to 20 and 22).


Slice 7 (FR-PLAN-22). The palette is the brush. Section title "Activities" (section title style) and a meta line "Hours a week in {template}".

- Desktop (900px and wider): a 280px column to the right of the week grid. Phones (899px and below): the palette comes first, above the grid, as wrapping chips (`.pal-list` row wrap; `.pal-sub` hidden).
- Rows (`.pal-row` containing a `.pal-select` button with `aria-pressed`): 44px minimum height on desktop, grid `16px | name and sub | hours`, hairline bottom rule. Hover `--bg-3`. Selected `--bg-4` with a 3px `--accent` inset bar. Name 15px 500; sub 12px `--ink-3` ("CODE · category"; `--ink-2` on the selected tint); hours 13px `--ink-2`, tabular, "h/wk".
- Erase: the last row, with the erase swatch (`.dot-erase`) and the sub line "Clears any hours it paints over". Selecting it clears the activity selection (URL `item` removed) and makes the brush erase.
- Edit: the selected row shows a small "Edit" button (`.btn.btn-xs.btn-outline.pal-edit-btn`, named "Edit {name}"). It opens the inline editor below the list (`.pal-editor`, `--bg-2` panel, 1px `--rule` border, radius 6px): title "Edit {name}" and "Done" (`.btn-sm.btn-primary`), then name, short code, category (`.timely-select`) and colour (`.color-pop-inline`). Changes apply at once (FR-UX-6); a clash or empty name shows a `.field-error`. "Delete activity" (`.act-delete`) opens the inline confirmation (`.act-confirm`) that states the impact. Escape closes the confirmation first, otherwise leaves edit mode (`edit=1` removed).
- Add: "+ Add activity" (`.chip-add`) reveals `.pal-add`: name, short code, category, colour, primary "Add activity" (disabled until a name and a code are typed) and quiet "Cancel". Enter submits; Escape closes. Opening from Goals (`add=1&category=`) opens it with that category preselected (FR-GOALS-20).
- Empty list: "No activities yet. Add one to plan when it happens." (`.pal-empty`).

### 4.18 Journal (`app/components/today/TodayJournal.vue`; classes `.today-journal-*`)

One line of text for the day Today shows (FR-HOME-11 to 13), as the mockup has it. A label above the field: "One line for today", or "One line for this day" on another day. The field is full width, with the placeholder "What got in the way? One line is enough.". It saves as you type, 400 ms after the last key: the status `.today-journal-status` (`role="status"`) reads "Saving…" and then "Saved" for 2 seconds. Changing the day saves the line under the day it was typed for, then shows the new day's line. A blank line removes the note. The journal has no day controls of its own: the day switch of Today moves it. The field is one line, so a note written over several lines shows as one line and keeps its text until it is edited. There is no key message or readings block.

### 4.19 Legal pages, consent line and footer (`app/components/legal/LegalPage.vue`, `app/pages/terms.vue`, `privacy.vue`)

- Routes `/terms` and `/privacy`. `LegalPage` is the shell: `main.view.legal` with `.page-head` (title `h1.page-title`, `p.page-meta` "Last updated 27 October 2026"), the slot in `.legal-body`, and a "Back to Timely" link (`.legal-back`) to `/`.
- Reading column: `.legal-body` is 70ch wide, the rest of the `.view` is empty. Section headings are `h2` at 18px 600 (`--fs-lg`), 32px above and 8px below. Body text is 15px `--ink-2` at line height 1.6; bullet lists use 24px indent with 8px between items; `strong` is `--ink` 600.
- Links in running text use `.legal-link` (`--accent`, underlined 1px, 2px offset; `--accent-deep` on hover). The same class is used for the consent line.
- Consent line (`.login-consent`, under the sign-in block): 13px `--ink-3`, centred, as wide as the sign-in column (640px). Its two links carry `white-space: nowrap`, so each link wraps as a unit.
- **Sign-in page** (`LoginGate.vue`, Supabase mode, signed out; `.login-*` in `auth.css`): one centred column, 640px at most, full width minus the gutters on phones, no card frame. In order: the heading `h1.login-heading` "Your goals decide your week" (clamp 24 to 32px, 600, `--ink`) and one line `.login-lede` (15px, `--ink-2`, 1.6), all centred; then `.login-showcase` with `OnboardingIntroPlayer loop quiet`; then `.login-action-block` (h2 "Sign in to Timely" 16px 600, the Google button `.btn-primary` at least 240px wide, the error text); then the consent line. The `quiet` variant of the player (`.is-quiet`) has no stage frame (no border; a tone shift to `--bg-2` and an 8px radius), its controls are `.onb-link` text links centred under the stage, and the five segments are the thin progress line. Looping; it opens paused behind the Play overlay (no autoplay), no sound, no tabs, no inputs. On phones the Google button and the player controls are 44px high.
- Footer (`footer.app-footer`): "Terms · Privacy" in 13px `--ink-3` (hover `--ink`, underline), 1px `--rule-2` top border, padding 24px top and bottom, and sides that follow the page gutter (40px, 32px at 1280px, 28px at 1024px, 16px at 768px and below). Shown in local mode, on the sign-in page and for signed-in users; hidden only while the session loads. It wraps without causing overflow.
- Legal pages are shown without a session: `app/app.vue` renders them instead of the gate, and the planner tabs stay hidden for a signed-out user.
- Onboarding overlays (Welcome, tour) are not rendered on the legal pages, so they do not cover the text. The state is kept, so they appear again on Home.
- Verified in headless Edge on the production build: 1280 and 400 px, light and dark, no horizontal overflow, no console errors; in dev no hydration warnings (only the known dev-only 404s for Vuetify and MDI CSS). Screenshots `spec/screens/legal-*`.

### 4.20 Activities and habits: the one form and the one list (`app/components/ActivityForm.vue`, `.entry-*` in `app/assets/css/`, `.row-*` in `lists.css`)

- **The form** is a `.act-panel` (the same panel as the other editors) with a title ("New activity or habit" or "Edit <name>"). Fields in order: Name (the Enter key saves), Life area and Duration in a two-column `.form-row` from 480 px (one column on a phone), Days (seven `.chip` buttons with `aria-pressed`), "Or: N times a week or month" only when no day is chosen and the entry is not timed, then for a timed entry Start (`.timely-select`) and Week types (checkboxes). "More options" is a native `<details>` with Short code and Colour (timed only).
- **Hints and errors** use `.form-hint` (quiet, `--ink-3`) and `.field-error` (role alert). A paint of a duration that is not whole hours shows the whole-hour hint. The repaint note appears only when the schedule changed on an existing entry.
- **Confirmations** use `.act-confirm` inside the panel: No time names the hours and the activity it removes; Delete names what goes. Buttons: Save and Cancel; Delete sits apart at the foot (`.act-delete`).
- **The list** (the Goals life area) is `.row-list` / `.row-item` / `.row-main` with a name and quiet `.row-meta` lines, the `EditButton` pencil at the end. Goals: one list, each row followed by its open form. The Week tab has no list since 2026-11-04 (4.17).
- **Result line:** `.sched-result` under the list, role status, with its Undo button, for 8 s (`useEntryResult`).
### 4.21 Sleep: the Show sleep button, the Sleep row, the editor and the hidden grid (`app/components/SleepToggle.vue`, `planner/SleepEditor.vue`, `.sleep-*` in `app/assets/css/`, `.wk-band`, `.wk-gap` in `week-grid.css`, the Today switch was removed on 2026-11-05)

- **Show sleep button.** `SleepToggle.vue`: a `.btn.btn-sm.btn-outline` with `aria-pressed` (an outline since 2026-10-28, so Hide reads as a control), labelled "Show sleep" while hidden and "Hide sleep" while shown. It sits in the Week disclosure above the grid (`.wk-tools`), the Home line above the timeline and the Year chart header. The state is one shared value (`useShowSleep`). Home says "Sleep is hidden: its hours are left off the bar, and a nap counts as unplanned." in `.page-meta` beside it; Year says "Sleep is counted under Physical." under the chart while shown, and nothing while hidden.
- **Sleep hours (Week).** The "Sleep hours" button under the week grid (4.17) opens the Sleep form; the nights of the active week type show beside it (`.entry-actions-when`: "10 PM to 7 AM", or "... on weekdays, ... at weekends"). Without a Sleep activity the button reads "Set up sleep".
- **Sleep editor.** In the Sleep form (`ActivityForm.vue`, which has no days, duration or start for Sleep): a `.segmented` choice (Same every night / Weekdays and weekend), one or two rows of bedtime and wake-up selects (12 AM to 11 PM), the total and the nights in `.form-hint`. The short code is disabled with a note; Delete is replaced by "Sleep is built in; hide it instead."
- **Hidden grid.** Rows that are sleep on all seven days collapse. A leading or trailing run is a full-width button band above or below the grid (`.wk-band`, "Sleep hidden: 12 AM to 7 AM" and "Show sleep" in `--accent`, the whole band clickable). A run between shown rows is a 14 px band (`.wk-gap`, quiet `--bg-2` with a dashed top rule). The hour labels follow the shown rows.

Screens: `spec/screens/sleep-week-1280-hidden.png`, `sleep-week-1280-shown.png`, `sleep-week-400-hidden.png`, `sleep-editor-1280.png`, `sleep-insights-1280-hidden.png`.
## 5. Colour handling: one palette for planned time

Moved to [design-system.md](design-system.md), section 4 (the 3:1 rule on both surfaces, `areaVars`, the tint rule, the fallback constants, the teal known limit). The planned-time states (empty, planned, current, selected) are in design-system.md, section 4.1.

---

## 6. Accessibility checklist

| Check | Status | Notes |
| --- | --- | --- |
| Body text contrast 4.5:1 or better | Pass for all text on `--bg`, `--bg-2`, `--bg-3` and `--bg-4`. Disabled buttons are the exception (see 4.4) | Measured in the DOM on all four tabs, both themes, after the fix pass. Text on tints uses `--ink-2`. Disabled "Add category" and "Add activity" are 2.44 to 3.05:1 (opacity 0.45). |
| Non-text contrast 3:1 | Pass for interactive controls (`--control-border`, 3.26:1 minimum light, 3.44 dark). Pass for planned fills and empty-cell outlines (section 5). | Hairline frames (`--rule`) are decorative and stay below 3:1 by design. |
| Visible focus | Pass | Harada cells: 2px inset accent ring. Block delete: global 2px accent outline. Other controls: the global 2px outline, or the accent border on fields. Checked by tabbing through each view in both themes; no stop is left without an indicator. |
| Keyboard operation | Pass for topbar, Home (day switch and done checks), Goals, Year, Insights, the Week activity list, detail and forms (4.17) and the week grid (4.12). Fail for the year grid. | The year grid uses mouse events only (`mousedown`, `mouseenter`). |
| Current tab announced | Pass | `aria-selected` on each `role="tab"`. |
| Tab panel relation | Fail | No `aria-controls` and no `tabpanel`. |
| Pressed and expanded state | Pass | `aria-pressed` on Harada cells and segmented buttons; `aria-expanded` on Habit "Details". |
| Names for icon controls | Pass | Account avatar, Dark mode switch, colour swatches, move and delete buttons all have `aria-label`; week grid slots are named by day, hour and activity. |
| Minimum text size 12px | Pass | Smallest text is 12px. The block delete glyph was 11px and is now 12px. |
| Touch target | Partial | Colour swatches are 24px hit areas with 20px visible dots (slice 5). Resize confirm buttons are 24px. Block delete is 24px (hidden on touch). Day clear buttons are 24px. Category arrows 28px wide, 26px high. Topbar tabs are 44px on phones. |
| Reduced motion | Not handled | No `prefers-reduced-motion` rule. Transitions are 0.1 to 0.18s and small. |
| Live regions | Not used | Save and error messages are not announced. |
| Language | Pass | `<html lang="en">`, set in `nuxt.config.ts`. |

---

## 7. Content and voice

- UI language: English. Sentence case for headings, labels and buttons. Button text is an action in the imperative ("Add habit", "Load starter grid", "Move and remove").
- User data may be in any language. Keep the layout tolerant: text wraps, names ellipsise (`.chip`, `.cat-row-name`), and nothing is sized to a fixed number of characters except the short code (max 3).
- Calm empty states. Say what is missing, then give one action where there is one:
  - "No goals yet. Start from the starter grid and adapt it." with "Load starter grid".
  - "No daily habits yet for this life area."
  - "No target yet" and "No time planned" as quiet flags, not warnings.
  - "No projection yet."
  - "No schedule yet, click to paint."
- Numbers carry their unit in short form: `h`, `h/wk`, `h/yr`, `h/d`, `%`.
- Times use `12AM`, `9AM`, `12PM` style (`formatHour`), not 24-hour.
- Keep the copy short. The lede of each page is one or two sentences.

---

## 8. Do and don't

Do:

- Use the existing tokens. Add a token to `tokens.css` `:root` and to `html[data-theme="dark"]` together.
- Use `var(--space-*)` and `var(--fs-*)`. Use `tabular-nums` for any number.
- Use `.btn`, `.btn-primary`, `.btn-outline`, `.btn-danger` and the size modifiers. Use `.chip` for selectable pills and `.timely-input` or `.timely-select` for fields.
- Separate sections with hairlines (`.section`, `.goal-row`, `.cat-row`).
- Put a text label next to any colour, and a legend next to any chart.
- Keep floating menus teleported to `body`, with `--shadow` and `--rule` border.
- Check every new screen at 1280 and 400, light and dark (section 9).
- Keep sentence case and an English UI.

Don't:

- Don't reintroduce serif or monospace fonts. Don't add a second font family or a weight other than 400, 500 or 600.
- Don't reintroduce the terracotta accent or the old serif editorial look from `design/`. The accent is `--accent` (blue). Terracotta is only a category swatch.
- Don't use `text-transform: uppercase` or letter-spaced micro-labels.
- Don't add text below 12px.
- Don't use shadows on cards or sections. Use hairlines.
- Don't add a hard-coded hex value in a component. Use a token, or the category palette for user colours.
- Don't use a red filled button for destructive actions. Use `.btn-danger`.
- Don't add a second primary button in the same group.
- Don't make a resizable textarea. Use `AutoTextarea`.
- Don't add a component library where a `.btn`, `.chip` or `.timely-*` class does the same job. Behaviour (focus, keys, ARIA) is written in the component.
- Don't use `alert()`, `confirm()` or `prompt()` in new code. The existing `confirm()` for template deletion is a known exception.
- Don't add horizontal scrolling to the page body. Only the activity grid, the year grid, charts and tables may scroll, each in its own container.

---

## 9. How to verify UI changes

1. Build the production bundle: `npm run build`. It must finish without errors. The output is in `.output/`.
2. Serve it: `node .output/server/index.mjs` (listens on port 3000 unless `PORT` is set). Stop the server when done.
3. Open the app in headless Microsoft Edge, for example with `puppeteer-core` and the Edge executable. Use a fresh browser context for each check so `localStorage` does not leak between runs.
4. Capture each affected tab at 1280px and at 400px, in light mode. For dark mode, set `localStorage['timely.dark'] = 'true'` before the reload and capture at least one dark screen.
5. For every capture, check:
   - `document.documentElement.scrollWidth - document.documentElement.clientWidth` is 0 (no page-level horizontal overflow).
   - Each scrolling container (`.year-grid-scroll`, `.chart-scroll`, `.tabs`, `.wk-scroll`) is listed on purpose. Overflow elsewhere is a bug.
   - No `console.error` and no `pageerror` events.
   - `[data-theme]` is `dark` in dark mode and empty in light mode.
   - IBM Plex Sans is loaded in `document.fonts` (requires network access to Google Fonts).
6. Look at the screenshots. Check text contrast against section 2.3, the 12px floor, and that colour is never the only cue.
7. Run `npm run build` again after any change to `spec/` or `nuxt.config.ts`. `spec/` must not be picked up by Nuxt.
8. Record in the change notes which screens were checked and at what widths.

Reference screenshots for this spec live in `spec/screens/`. Replace them when the design changes on purpose, and keep the same names.

---

## 10. Known gaps (current build)

These are facts about the code as it is today. They are not requirements for new work. Fix them when touching the affected area.

1. The year grid cannot be operated from the keyboard, and it cannot be painted by touch. (The week grid is keyboard operable: one focus stop, arrows, Shift for a run, Enter, Escape.)
2. Resolved: planned fills (chart segments included) reach 3:1 on their surface through `fillFor` (section 5.2). The legend and the focus strip still identify them.
3. `role="tab"` buttons have no `aria-controls` and there is no `tabpanel`.
4. There is no inline error style for forms. Failed actions have no visible feedback.
5. Home's period selector is session state (Nuxt `useState`): it survives a tab switch, resets on reload and is not in the URL.
6. Templates have no Edit button (FR-UX-2, Partial). They are renamed by double-click, recoloured from the chip dot, and deleted inline.
7. Habit rows have no Edit button in view mode; habits are edited in the category's edit mode (FR-GOALS-18, Partial).
8. No `prefers-reduced-motion` handling.
9. Theme is light by default and does not follow the OS setting.
10. Resolved: `DESIGN_COLORS` no longer has an `fg` field; text on a planned fill is `inkOn` (section 5.2). Known limit: teal (`#4a8683`) reaches only 4.33:1 with its text, below 4.5:1 for 13px text, in both themes.
11. Resolved in 0.0.2: the Vuetify theme that copied the tokens by hand went with the library.
12. The 12px chart text is hard-coded rather than a token.
13. Disabled buttons keep the 0.45 opacity rule, so "Add category" and "Add activity" are 2.44 to 3.05:1. Disabled controls are exempt; the dark one is faint but readable.
14. The journal experiment on Home (FR-HOME-11 to 13) is not built; it is slice 6.

---

## 11. Verification log for this spec

- Read in full: `app/assets/css/` (all files), `app/app.vue`, `vuetify.config.ts`, `nuxt.config.ts`, `app/components/AutoTextarea.vue`, `app/components/harada/HaradaView.vue`, `app/components/harada/HabitList.vue`, `app/components/planner/PlannerView.vue`, the old Insights and legend views (removed in slices 1 and 3). Read in part: `app/utils/planner.ts` (palette, constants, seed, state check) and `app/stores/planner.ts` (actions relevant to colour and categories).
- Contrast ratios: computed from the hex values in the code with the WCAG formula. Block tint contrast: computed over the 16-swatch palette with the same mixing as `color-mix(in srgb, …)`.
- Overflow and layout at 400px and 1280px: measured in headless Edge against the production build, all four tabs.
- Screenshots: captured from the production build at the widths listed in `spec/screens/`.
- Fix pass (section 10, items fixed): the same script ran before and after in headless Edge against the production build. Scope: all four tabs at 1280px in light and dark; Goals also with the habit and target tabs open and one habit's details open; Planner also with a block hovered; Goals and Planner at 400px in light and dark. Contrast uses computed colours, composites translucent backgrounds and opacity, and measures non-text boundaries (inputs, outlined fields, dots, swatches, icons).
- Fix pass, text: before, 9 text pairs were below their threshold (the Harada cell hint in the selected cell, 3.80:1; `.pill-count` 3.80 to 4.27:1; the segmented "Monthly" label 4.27:1; four habit field labels 4.29:1), plus 4 disabled-button labels. After, only the 4 disabled-button labels remain (2.44 to 3.05:1, exempt). The Harada centre label is now solid, 8.57:1 light and 7.96:1 dark (it was 75% opacity, 5.60:1 and 4.89:1).
- Fix pass, non-text: before, input and select borders were 1.25:1 light and 1.42:1 dark; Vuetify outlined fields 2.30:1 light and 3.18:1 dark; dot and swatch rings at least 1.42:1 light and 1.64:1 dark. After, inputs are at least 4.08:1 light and 4.87:1 dark, Vuetify outlines 4.08 and 4.87, and dot rings at least 3.26:1 light and 3.44:1 dark. No control boundary is below 3:1 on any view.
- Fix pass, text size: before, one glyph at 11px (block delete). After, none below 12px.
- Fix pass, focus: keyboard Tab walk on each tab in light. Before, the 8 Harada cell stops had no indicator (tint only). After, every stop has an indicator. Checked by screenshot: Harada cell (light and dark), block delete (light and dark, zoomed), topbar tab.
- Fix pass, theme before first paint: the first animation frame in dark mode had no `data-theme` before the fix. After, it is `dark`. No hydration warning and no console error or warning in any run.
- Fix pass, layout: 0px horizontal overflow at 1280px and 400px, light and dark, all tabs. `npx nuxi typecheck` exits 0. `npm run build` is clean; the existing Nuxt and Nitro warnings are unchanged.
- Not verified: `prefers-color-scheme` absence beyond code reading; Vuetify's computed `on-primary`; behaviour on real touch hardware (only emulated viewports were checked).

- Slice 1 (shell, URL state, Visualization, Home placeholder): browser run on the production build at 1280 and 400 px, light and dark, no page overflow, no console messages; dev-server run with no hydration warnings. Screenshots: `screens/home-desktop-light.png`, `screens/visualization-desktop-light.png`, `screens/visualization-mobile-light.png`.
- Slice 3 (Goals: vision, Harada map, category list and detail, habit rows; Configuration removed): browser run on the production build, 1280 and 400 px, light and dark, 90 checks (a Goals script in the session scratchpad, not committed). No page overflow, no console errors other than the known hydration message. Screenshots: `screens/goals-desktop-light.png`, `screens/goals-detail-edit-desktop-light.png`, `screens/goals-mobile-light.png`.
- Slice 4 (Home: Day, Week, Month, time per category, goals signal): production build at 1280 and 400 px, light and dark; 48 browser checks plus 4 follow-up checks (Home scripts in the session scratchpad, not committed). Node checks of day blocks, months (28 to 31 days, straddling weeks), DST days, unassigned and deleted templates, shares and the below-target rule under UTC, Europe/Paris and America/New_York. No page overflow; no console messages in the runs. Screenshots: `screens/home-desktop-light.png`, `screens/home-week-desktop-light.png`, `screens/home-month-desktop-light.png`, `screens/home-mobile-light.png`, `screens/home-week-mobile-light.png`, `screens/home-desktop-dark.png`.
- Week grid restored to the original interaction (2026-10-26, branch `fix/restore-original-week-grid`): 34 headless Edge checks on the production build (scratchpad script `restore-check`, not committed), all passing, covering drag, action bar, menu, Undo, block click, handles with Save and Cancel, day clear, keyboard, template switch, activity add and edit, the Goals handoff, touch tap, no overflow at 1280 and 400 px, and no console errors. Planner screenshots regenerated from a clean seed. Screenshots: `screens/planner-desktop-light.png`, `planner-desktop-dark.png`, `planner-mobile-light.png`.
- Slice 5 (cleanup and docs audit): Node scan of every class, token, path and component named in this spec against `app/` and `app/assets/css/` (scratch script, not committed); browser runs on the production build (scratchpad scripts `s5-focus`, `s5-keys`, `s5-home` and the final regression pass). Swatch hit areas measured at 24px; Home contrast re-computed in both themes (ink-3 on the page 4.76:1 light, 7.04:1 dark). Screenshots regenerated from the final build (names unchanged, Home and Visualization added).

## 12. UX polish batch (feat/ux-polish)

- **Attention token.** `--attention` is the outline of a category under or over its time target: `#a33a3a` on light and `#ee9a9a` on dark (6.9:1 and 9:1 on the surfaces). It is a 2px outline set inside the box (the grid frame clips outside outlines). The legend swatch uses the same token, plus a neutral 1px swatch for on track or no target. **Superseded:** the outline and the legend are gone from Goals; the status was the needed-and-planned bar, removed on 2026-10-29 (section 4.9a). The token stays for the Insights capacity line.
- **Comparison bars (removed 2026-10-29, section 4.9a).** Needed and Allocated share one scale in the category detail; Needed is `--ink-4`, Allocated `--accent`. The verdict colours: Missing `--warn`, over `--accent`, On track `--ok`, No time target `--ink-3`. The verdict is text, so colour is never the only signal.
- **Hour timeline.** 24 colour-only segments under the Today title, 10px tall. Axis labels 9h, 12h, 18h and 22h sit at their hour on a 24-hour scale, 12px, with a 4px tick above each. Labels are HTML, not SVG, so they keep the 12px minimum. While sleep is hidden, the bar spans only the hours between the day's leading and trailing sleep (`dayRange`, 2026-10-28): the axis labels sit on that span and its two ends are labelled (`.home-axis-tick.is-start` and `.is-end`).
- **Insights chart.** Flex columns scaled to the largest total, stacked by category with `flex-grow` set to the hours. Hour labels are HTML at 12px. The Life areas list has no share bar: a row is dot, name, hours and percent of the available time. The Hours and Weeks switches and the granularity switches use the shared `.segmented` control.
- **Copy rules.** No intro paragraphs, subtitles or instructional sentences under titles, section titles or tabs. Keep field labels, units, values, empty states that say what to do, errors and confirmations. Keyboard hints can live in `title` tooltips or `aria-label`s, not in visible text.
- **Removed.** `.page-lede`, `.section-lede`, `.detail-lede`, `.browse-note`, `.wk-pop-hint`, the Visualization classes (`.viz-*`, `.metric*`, `.goal-*`) and the journal experiment classes.

### 12.1 Edit control (batch 3)

- `app/components/EditButton.vue` is the only Edit control: a 16px pencil (stroke `currentColor`, width 2) in a 28px square, `--ink-3` at rest, `--accent` on hover and while expanded, on a `--bg-3` tint. It has the item's name in `aria-label` and `title`, `aria-expanded` when it opens something, and the 2px `--accent` focus ring. With `to` it is a router link; without, a button. It exposes `focus()` for focus return.
- Text buttons remain for Done, Write today's note and the confirmations.

### 12.2 Available-time line (batch 3)

- The capacity line of Insights is a 2px `--attention` bar per period at its available hours (`.insights-cap`), and its label is a key in the chart header (`.insights-cap-key`, 12px, weight 600, `--attention`, with a 14 by 2px swatch), e.g. "Available per month: 525 h", or "up to 840 h" when the periods differ (`capacityLabel`, 2026-10-28). The label is not drawn on the chart. The same token as the attention outline: a red line here means the available-time marker, not an error.
- The unit selector is a `.segmented` group (Hours, Days, Weeks) next to the granularity group.

## 13. Goals and Insights simplify (feat/goals-insights-simplify)

Owner UX review, 2026-10-28: fewer concepts on screen, less to fill in, the power opt-in. Requirements in PRD 9.15.

- **List / Grid toggle** (`.goals-view-toggle`, in `HaradaView.vue`): a `.segmented` group, "List" and "Grid" as buttons with `aria-pressed`, label "Life areas view". Hidden below 1100px (`display: none`); shown from 1100px as a flex row with 16px below. The choice is session state (`useState`), not saved.
- **Grid view**: the Harada map (section 4.9) sits under the ambition, and the list is hidden (`.browse.is-grid .cat-list`). The selected life area's detail shows below the map at full width. The "+ Add life area" control stays under the browse area, so new life areas can still be added in Grid view.
- **Empty life areas** (`.cat-add-goal`): every life area is listed (no folding, FR-GOALS-25). An area with no goal, target, habits or activities also shows a `.chip-add` "Add a goal" control at the right end of its row (aria-label "Add a goal to <name>"), on the same `.cat-item` hairline. It opens the detail in edit mode with the name focused. The row still shows its target status and entry counts.
- **Category detail, view mode** (FR-GOALS-27): the 5-year goal, the 1-year target, the habits (`HabitList`, with "+ Add habit"), then "More activities" (`.row-list`, name and "XX · N h a week" only, with Edit to Planner; Add activity). Notes are edit mode only; the secondary Unlink went with "Also counts toward" (2026-10-29).
- **Habit form, linked activity**: the first option is "Add '<name>' to my week" (shown when the name is set), then None, then the activities by life area. Its error (`.field-error`, role alert) sits under the select.
- **Insights, first row**: the year switcher, Month or Week (`.segmented`), and a "More options" button (`.btn-sm`, `aria-expanded`, `aria-controls="insights-more"`). The button adds ": <setting>" in `--ink-3` while closed when a setting is not the default.
- **Insights, More options panel** (`#insights-more`, `.insights-more`): a 1px `--rule-2` frame with 6px radius and 16px padding, holding three `.segmented` groups: Year or Quarter, One year or Several years (with the horizon select), and "Show in" with Hours, Days (24 h), Weeks (168 h).
- No headline sentence above the chart (removed 2026-10-28): the life areas list below carries the shares. The chart header holds the available-time key and the Show sleep toggle.
- Colour and contrast: no new tokens. The "Add a goal" and "More options" controls use the existing chip and button styles; state is never colour alone (aria-pressed, aria-expanded and the text).

### 12.3 UX batch 5 (fix/ux-batch-5)

- Headless Edge on the production build, 74 browser checks: the category detail order; Apply opening Edit range on the new block (handles, focus, ArrowUp and ArrowDown, Save, Undo, Escape); the Apply menu with 25 items at 400 by 800 (touch) and 1280 by 500 (wheel): on screen, the list scrolls, the page does not; a touch drag on a handle at 400 px; the Schedule block closed by default, Close, Escape, the result line after Close; the focus rule at 1280 px (a field takes focus) and at 400 px with touch emulation (no text field takes focus; the panel or dialog does).
- Touch scroll of the menu was driven with manual touch moves; the headless `synthesizeScrollGesture` did not scroll the list. A real phone was not used.
- Screenshots: `spec/screens/week-apply-edit-desktop-light.png`, `week-apply-menu-mobile-light.png`, `week-apply-menu-short-desktop-light.png`, and `goals-detail-desktop-light.png` (replaced).
