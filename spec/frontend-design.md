# Timely front-end design spec

This file describes the visual style that the code uses today. Every value here was read from the source (`app/assets/css/main.css`, the component `<style>` blocks, `app/app.vue`, `vuetify.config.ts`, `nuxt.config.ts`, `app/utils/planner.ts`) and cross-checked where noted. Where a value could not be verified, it is marked **(unverified)**.

Source of truth: the code. The old `design/` folder (terracotta and serif look) is a stale export and must not be used. The Harada prototype in `spec/references/grille-harada-meilleure-version.html` is the origin of the blue palette and the Goals layout; it is a reference only.

Reference screenshots (current build, headless Edge, light unless noted):

| Screen | Desktop 1280 | Mobile 400 |
| --- | --- | --- |
| Goals | [goals-desktop-light.png](screens/goals-desktop-light.png) (empty life areas folded: [goals-list-collapsed-desktop-light.png](screens/goals-list-collapsed-desktop-light.png); Grid view: [goals-grid-desktop-light.png](screens/goals-grid-desktop-light.png); category detail: [goals-detail-desktop-light.png](screens/goals-detail-desktop-light.png); category detail in edit mode: [goals-detail-edit-desktop-light.png](screens/goals-detail-edit-desktop-light.png)) | [goals-mobile-light.png](screens/goals-mobile-light.png) |
| Planner | The week grid is the original range-select grid (`ActivityGrid.vue`, section 4.12): a 52 px hour gutter, seven day columns, 28 px hour rows and a frame of at least 540 px that scrolls sideways inside `.wk-scroll` on phones (the page does not). The Activities list (section 4.17) is a row of chips under the grid. The year grid is full width (13 week columns, 32 px cells, a quarter label per row) and collapsible. Measured in the 2026-10-26 run (section 11). |
| Home | [home-desktop-light.png](screens/home-desktop-light.png) (Week: [home-week-desktop-light.png](screens/home-week-desktop-light.png); Month: [home-month-desktop-light.png](screens/home-month-desktop-light.png); dark: [home-desktop-dark.png](screens/home-desktop-dark.png)) | [home-mobile-light.png](screens/home-mobile-light.png) (Week: [home-week-mobile-light.png](screens/home-week-mobile-light.png)) |
| Insights | [insights-desktop-light.png](screens/insights-desktop-light.png) (More options open: [insights-more-options-desktop-light.png](screens/insights-more-options-desktop-light.png)) | [insights-mobile-light.png](screens/insights-mobile-light.png) |

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

### 2.1 Where the tokens live

| Layer | File | Notes |
| --- | --- | --- |
| Light palette and all non-colour tokens | `app/assets/css/main.css`, `:root` | Colours, font, type scale, spacing, radius, `--shadow`, `--focus-ring`. |
| Dark palette | `app/assets/css/main.css`, `html[data-theme="dark"]` | Redefines the colour tokens only; also sets `color-scheme: dark`. |
| Vuetify themes | `vuetify.config.ts`, themes `timely` (light) and `timelyDark` | Hex values copied by hand from the CSS tokens. The file comment says "keep in sync"; nothing enforces it. |
| Category palette (data) | `app/utils/planner.ts`, `DESIGN_COLORS` | 16 swatches offered for categories, activities and templates. Data, not UI chrome. |
| Hard-coded fallbacks | components and store | `#ccc` (chart segment), `#888` (category/activity dot), `#999` (block), `#5d6b7a` (template colour), `#685847` (new activity when its category has no colour, `app/stores/planner.ts`). |

The CSS comment says "Colours are defined only here". This is true for CSS, with two exceptions: the `rgba()` inside `--shadow`, and the JS fallbacks above.

Fonts: `nuxt.config.ts` loads `IBM Plex Sans` 400, 500, 600 with `display=swap` from Google Fonts (preconnect included). The `--font-ui` stack is `"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`. Verified: in a headless Edge run against the production build, `IBM Plex Sans` reported status `loaded` in `document.fonts`.

### 2.2 Theme toggle

- The toggle is the 36x36 icon button at the right end of the topbar (`.theme-toggle`). It shows a sun while dark and a moon while light.
- State lives in `app/app.vue`: `useState('dark', () => false)`. The default is **light**. The app does not read `prefers-color-scheme`.
- On mount, `localStorage['timely.dark']` (`"true"` or `"false"`) overrides the default.
- A watcher (client only, not immediate) sets `document.documentElement` `data-theme` to `dark`, or to an empty string for light, and sets the Vuetify theme to `timelyDark` or `timely`. `toggleDark` also writes the attribute and the localStorage key.
- Before first paint, an inline script in `nuxt.config.ts` (`app.head.script`) reads `localStorage['timely.dark']` and sets `data-theme="dark"` when it is `"true"`, so a saved dark theme does not flash light on load. Measured in headless Edge: the first animation frame already has `data-theme="dark"`. `onMounted` still reads the key to set the state. The watcher does not run at setup, so it does not reset the attribute.

### 2.3 Colour tokens

Contrast ratios were computed with the WCAG 2.x formula from the hex values in `main.css` (script run in the scratchpad, not committed). "On bg" means against `--bg`. Text needs 4.5:1 (normal size) or 3:1 (large text and non-text UI).

| Token | Light | Dark | Use | Contrast (light / dark) |
| --- | --- | --- | --- | --- |
| `--bg` | `#ffffff` | `#0f1624` | Page, topbar, inputs, popovers, blocks mix base | Base |
| `--bg-2` | `#f7f9fc` | `#131c2c` | Quiet surface: hour column, week header, empty Harada cell, remove-and-move panel | Ink-3 on bg-2: 4.51 / 6.64 |
| `--bg-3` | `#eef3fa` | `#1a2539` | Hover, default chip, segmented track, goal track | Ink-3 on bg-3: 4.27 / 5.97 (below 4.5, so text on bg-3 uses `--ink-2`: 8.51 / 9.42) |
| `--bg-4` | `#dce7f5` | `#223156` | Selected tint: active Harada cell, active chip, selection range (same value as `--accent-soft`) | Ink-3 on bg-4: 3.80 / 4.98 (below 4.5, so text on bg-4 uses `--ink-2`: 7.59 / 7.85); accent on bg-4: 6.85 / 5.62 |
| `--ink` | `#1a2230` | `#e6ebf3` | Primary text, names, values | 15.96 / 15.12 |
| `--ink-2` | `#3d4657` | `#c4cbd8` | Secondary text: labels, meta, figures | 9.49 / 11.10 |
| `--ink-3` | `#6b7385` | `#98a2b5` | Muted text: lede, hints, hours, counts | 4.76 / 7.04 on bg |
| `--ink-4` | `#9aa1b1` | `#5d6780` | Decoration only, never text: untargeted goal fill, scrollbar hover | 2.59 / 3.20 on bg (non-text, below 3:1) |
| `--rule` | `#e2e6ee` | `#28324a` | Hairline frames and dividers: week and Harada frames, popovers and menus, the remove-and-move panel. Not for control boundaries | 1.25 / 1.42 on bg. Decorative by design, so below 3:1 |
| `--control-border` | `#737e95` | `#78859e` | Boundary of interactive controls only: inputs, selects, textareas, outline buttons, Vuetify outlined fields, colour swatch and dot rings, the erase swatch | Light: 4.08 on bg, 3.87 on bg-2, 3.66 on bg-3, 3.26 on bg-4. Dark: 4.87, 4.59, 4.13, 3.44. At least 3:1 on every surface a control sits on |
| `--cell-empty` | `#ffffff` | `#0f1624` | Empty hour, empty week, empty bar: the page surface. Planned fills and the empty outline are in section 5 | Equals `--bg` |
| `--cell-line` | `#7d879b` | `#67738f` | Outline of empty cells and unplanned time | 3.61 / 3.81 on `--cell-empty` |
| `--rule-2` | `#eef1f6` | `#1d2639` | Hairlines: topbar bottom, section tops, row dividers, hour grid lines | Decorative |
| `--accent` | `#1b4b8f` | `#86aee8` | Primary button fill, active tab underline, focus outline, cell numbers, links ("+ New week type"), current-week ring, goal fill, selection border | 8.57 / 7.96 on bg |
| `--accent-deep` | `#12335f` | `#b5cdf1` | Primary button hover, centre cell label on dark | 12.62 / 11.17 for on-accent text on hover |
| `--accent-soft` | `#dce7f5` | `#223156` | Focus ring halo, active chip fill, selection range fill | Pale halo: about 1.2:1 against white, so the accent border carries the state |
| `--on-accent` | `#ffffff` | `#0f1624` | Text on accent | 8.57 / 7.96 |
| `--warn` | `#8a5a12` | `#e8bd7a` | "To define"; the under and over status of the needed-and-planned bar (icon and text) | 5.91 / 10.33 on bg |
| `--ok` | `#2d6a4f` | `#7fc4a0` | Unused since slice 2b (it was the resize confirm) | Bg on ok: 6.39 / 8.88 |
| `--danger` | `#a33a3a` | `#ee9a9a` | Destructive text, delete hover | 6.51 / 8.38 on bg |
| `--danger-tint` | `#fbefef` | `#3a2226` | Destructive hover background | Danger on tint: 5.80 / 6.77 |
| `--shadow` | `0 8px 24px rgba(18,51,95,.12)` | `0 8px 24px rgba(0,0,0,.45)` | Floating menus only | n/a |

Notes on use:

- Accent is the only action colour. There is no second brand colour.
- `--warn` is text colour for gentle prompts. It is not used for error states; errors have no dedicated treatment yet (see gaps).
- Vuetify reads the same values through `vuetify.config.ts`. Vuetify also computes its own `on-primary`, which is not defined in the config **(unverified)**.

### 2.4 Typography

Font: IBM Plex Sans. Weights in use: **400** (meta, units, body), **500** (labels, tabs, buttons, figures in lists), **600** (titles, values, day names, block titles). No 300 or 700.

| Token | Size | Used for |
| --- | --- | --- |
| `--fs-xs` | 12px | Hour labels, `.wk-hour`, `.wk-day-hours`, `.wk-block-time`, `.cell-num`, `.cell-status`, `.cat-meta`, `.goal-flags`, `.goal-total`, `.pill-count`, `.btn-xs`, `.wk-dur`, `.wk-menu-hrs`, chart labels (hard-coded 12px, same value) |
| `--fs-sm` | 13px | Default `.btn` and `.btn-sm`, form labels, `.timely-input` and `.timely-select`, `.page-meta`, `.section-lede`, `.legend-item`, `.metric-label`, `.goal-figures`, `.habit-meta`, `.disclosure > summary`, Harada kicker and alignment lines |
| `--fs-md` | 15px | Body, `.tab` labels, desktop `.page-lede`, `.cell-title`, `.goal-name`, `.cat-row-name`, Harada 5-year goal text |
| `--fs-lg` | 18px | `.brand`, `.section-title`, `.page-title` on phones (≤768px) |
| `--fs-xl` | 28px | `.page-title` (desktop), `.metric-value` |

Hard-coded exceptions (recorded, not endorsed):

- `12px`: chart text, written as a literal in `.chart-text`.

Line heights: body `1.5`; `.page-lede` and `.section-lede` `1.6`; `.page-title` `1.2`; `.cell-title` `1.35` (centre cell `1.45`); `.cell-status` `1.25`; `.metric-value` `1.1`; `.wk-helper` `1.5`; auto-textarea `1.5`.

Letter spacing: `.brand` `-0.01em`; `.page-title` `-0.015em`; `.section-title`, `.metric-value` `-0.01em`.

Numerals: any number that is compared, summed or aligned uses `font-variant-numeric: tabular-nums`. This includes tab numbers, hour labels, hour totals, stat values, metric values, goal figures, breakdown percentages, the year counter, week numbers, block times, the selection duration and chip hours.

Case: sentence case. A repository search for `text-transform`, `uppercase` and `small-caps` finds only the Vuetify neutralisation (`text-transform: none`).

Font smoothing: `-webkit-font-smoothing: antialiased` on body.

### 2.5 Spacing

Scale (tokens): `--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-5` 24px, `--space-6` 32px, `--space-7` 48px. The base grid is 4px.

Off-scale values in use (recorded): `6px` (tab gap, `.field` gap, `.color-pop` grid gap, `.goal-track` height), `2px` (segmented padding), `3px` (year grid gap, week cell and goal track radius), `14px` and `28px` (swatches and handles), `40px` (horizontal page gutter, see 3.3), `64px`, `72px`, `80px`, `96px` (page bottom padding), `1120px` (content max width).

### 2.6 Radius

| Value | Used for |
| --- | --- |
| `--radius` 6px | Buttons, inputs, chips, blocks, week and Harada frames, popovers, menus, the segmented control container, the remove-and-move panel |
| 4px | Segmented buttons |
| 3px | Week cells, goal track and fill, the year-grid cells |
| 2px | Resize handle bar, `.goal-target` (1px) |
| 50% | Dots and colour swatches |

### 2.7 Elevation

Flat by default. `--shadow` is applied to `.color-pop` (the template and category colour popover) only. No other element has a shadow. Exceptions that look like shadows are 1px inset rings (`box-shadow: inset 0 0 0 1px`), which are outlines.

Z-order: topbar 10, colour popover 20. Activity grid cells use z-index 1 only when focused.

### 2.8 Focus ring

- Global: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`.
- Text fields on focus: border becomes `--accent` and `box-shadow: var(--focus-ring)`, where `--focus-ring` is `0 0 0 3px var(--accent-soft)`. Applies to `.timely-input`, `.timely-select`, `.pill-input` (always on while renaming or adding a template) and `.auto-textarea`.
- Harada cells (`button.harada-cell:focus-visible`): 2px `--accent` outline with `outline-offset: -2px`. The grid frame has `overflow: hidden`, so the ring is drawn inside the cell.
- Week grid slots (`.wk-slot:focus-visible`): 2px `--accent` outline with `outline-offset: -2px`, drawn inside the slot.
- Panels that take focus themselves (`tabindex="-1"`: the edit and add panels and the first-run dialogs on phones, FR-UX-9): no ring after a tap or touch (`[tabindex="-1"]:focus:not(:focus-visible)`); keyboard focus still shows the global ring. Opening a panel focuses its first text field only where `shouldAutoFocusInputs()` (`app/utils/focus.ts`) allows it: a fine pointer and wider than 768 px.

---

## 3. Layout

### 3.1 App shell

`app/app.vue` renders `VApp` > `.app` (`display: grid; grid-template-rows: auto 1fr; min-height: 100vh; overflow-x: clip`) > `header.topbar` and `<NuxtPage>`. The page component (`app/pages/index.vue`) switches on the `tab` route query, read by `useNav()` (`app/composables/useNav.ts`). An unknown or missing tab shows Home. Tab clicks push history entries, so Back and Forward work. Query parameters: `tab` (home, goals, planner, visualization), `item` (id of the selected category, activity or habit) and `edit=1` (edit mode). Edit links to another screen use `link(tab, { item, edit })` or `go(tab, { item, edit })`. Goals' "+ Add activity" uses `link('planner', { add: true, category })` (FR-GOALS-20; `add` and `category` are read by the Planner form).

`NuxtRouteAnnouncer` is mounted. Its visually hidden span measures 199px wide and is `overflow: hidden`, so the overflow probe reports it. It is not a layout issue.

### 3.2 Topbar and tabs

Desktop (above 768px):

- `.topbar`: `position: sticky; top: 0; z-index: 10; height: 64px; padding: 0 40px; gap: 32px; background: var(--bg); border-bottom: 1px solid var(--rule-2)`. Measured: 64px at 1280.
- `.brand`: "timely", lowercase, `--fs-lg` 600, `-0.01em`, `--ink`.
- `.tabs`: `flex: 1; height: 100%; gap: 24px;` `overflow-x: auto` with the scrollbar hidden. Order is Home, Goals, Planner, Insights (four tabs, numbered 01 to 04; Configuration removed in slice 3).
- `.tab`: 15px 500, `--ink-3`; hover and selected `--ink`. Height 100% of the bar. Tabs carry no numerals (the `.tab-num` numerals were removed in feat/ux-simplify).
- Active indicator: `.tab::after` is a 2px bar in `--accent`, `left:0; right:0; bottom:-1px`, scaled from `scaleX(0)` to `scaleX(1)` over 0.18s on `[aria-selected="true"]`.
- `.theme-toggle`: 36x36, radius 6, icon 18px, `--ink-3`; hover `--bg-3` and `--ink`. It is the last flex item, so it sits at the right edge.

Phones (768px and below):

- `.topbar` wraps: `height: auto; padding: 12px 16px 0; gap: 0 16px`.
- Row one: `.brand` (flex 1) and the theme toggle (`order: 2`).
- Row two: `.tabs` at `order: 3`, `flex-basis: 100%`, `height: 44px`, gap 24px.
- Measured at 400px: topbar 93px tall (it is sticky, so it takes about 11% of a 860px viewport). The four tabs fit without scrolling (`scrollWidth - clientWidth = 0`).

Tab semantics: each tab is `<button role="tab" aria-selected>` inside `<nav role="tablist">`. There is no `aria-controls` and no `role="tabpanel"` (see gaps).

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
| 1280px | `main.css` | `.view` padding |
| 1024px | `main.css` | `.view` padding |
| 768px | `main.css` | Topbar wraps; page title 18px; year grid min width 360px; metrics one column; goal rows and category rows compact; Insights defaults to monthly chart (JS, `window.innerWidth < 768`) |
| 1100px | `HaradaView.vue` (scoped) | The List / Grid toggle (`.goals-view-toggle`) shows from here up; the Harada matrix is the Grid view (opt-in) and hidden (`display: none`) below. The list is the default view and the only one below 1100px |
| 480px | `main.css` | Home: period selector full width, Day rows put the time on its own line |
| `(hover: none)` | `main.css` | Block hover actions hidden on touch devices |


### 3.5 Phone behaviour at 400px

Measured with a headless Edge run against the production build, 400px wide, on each tab. The document never scrolls horizontally (`scrollWidth - clientWidth = 0` on every tab).

| Area | Behaviour |
| --- | --- |
| Topbar | Two rows, 93px, sticky. Tabs fit on one line. |
| Goals | Single column. Harada grid two columns; the centre ambition cell spans both columns first. Habit rows stack. |
| Planner | The week grid (`ActivityGrid.vue`, section 4.12) has a 52px hour column, seven day columns and 28px hour rows, always editable for an hourly template. Its frame is at least 540px and scrolls sideways inside `.wk-scroll` on phones. |
| Year grid | Fits: min width 360px inside `.year-grid-scroll`, available width about 368px. |
| Insights | Default monthly chart (about 500px wide) scrolls horizontally inside `.chart-scroll`. Metrics stack in one column. |
| Home | The period selector is full width. Day rows put the time range on its own line above the name; Edit stays at the row end. Week and Month rows keep name, hours and share on one line. Measured at 400px: no page overflow in any period, light or dark. |

Rule: only tables, the year grid and charts may be wider than the viewport, and each is in its own `overflow-x: auto` container. Everything else must wrap or stack.

---

## 4. Component catalogue

Class names below are the ones in `main.css` unless a file is given. Components with a `<style scoped>` block are noted.

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
- Used for "Week by week" (open by default) and "Year by category" (closed) on Insights.
- Habit "Details" is not a disclosure; it is a text toggle button (4.11).

### 4.4 Buttons

Base `.btn`: inline flex, centred, gap 8px, height 36px, padding 0 16px, radius 6px, 1px transparent border, 13px 500, `--ink-2`, `white-space: nowrap`. Transition 0.12s on background and colour.

| Variant | Class | Default | Hover | Notes |
| --- | --- | --- | --- | --- |
| Quiet (default) | `.btn` | Transparent, `--ink-2` | `--bg-3` background, `--ink` | Cancel and other low-emphasis actions |
| Outline (secondary) | `.btn-outline` | 1px `--control-border` border, `--ink` | Border `--ink-3`, transparent background | Selection bar "Edit" |
| Primary | `.btn-primary` | `--accent` background, `--on-accent` text | `--accent-deep` | One per group. Disabled keeps the accent fill at 0.45 opacity. |
| Destructive (quiet) | `.btn-danger` | `--danger` text | `--danger-tint` background | "Delete", "Delete week type" |
| Small | `.btn-sm` | 32px high, padding 0 12px | | Selection bar, new week type |
| Extra small | `.btn-xs` | 26px high, padding 0 8px, 12px text | | Life area move and delete, week type delete |
| Disabled | `:disabled` | Opacity 0.45, hover reset | | Quiet and outline lose their hover; primary keeps its accent fill at the same 0.45 opacity |

Vuetify buttons (`v-btn`) are used in the Goals view only: "Load starter grid" (primary, flat, `mdi-sprout-outline`), "Add habit" (primary, flat, `mdi-plus`, disabled while empty), and "Remove" in habit details (text, error colour, small, `mdi-delete-outline`). `main.css` neutralises them: `font-family: inherit`, `text-transform: none`, `letter-spacing: normal`, radius 6px.

Rules: one primary action per block. Destructive actions are text-coloured, never filled red. Icon-only buttons need `aria-label`.

### 4.5 Chips (`.chip`, `.chip-add`)

- `.chip`: 32px high (28px in the Insights focus strip), padding 0 12px, radius 6px, 1px transparent border, `--bg-3` background, `--ink-2` 13px text, max width 220px with ellipsis.
- States: default; hover `--bg-4` background and `--ink`; selected via `data-active="true"`: `--accent-soft` background, 1px `--accent` border, `--ink`.
- Inside a chip: `.dot` (colour, with a `--control-border` ring so dark colours stay visible), name, and `.pill-count` (12px `--ink-2`, tabular).
- `.chip-add`: accent-coloured text link, 13px 500, underline on hover. Used for "+ New week type".
- Contrast: `.pill-count` uses `--ink-2`: 7.59:1 on the selected tint (`--bg-4`) and 8.51:1 on the default chip (`--bg-3`), light. `--ink-3` measured 3.80 and 4.27 there.

Template switcher (`.template-switch`, Planner):

- Wrapping row, gap 8px, bottom margin 24px. Starts with a "Week type" label (13px 400, `--ink-3`).
- Each template is a `.chip`. Its colour dot is a button: a click opens `.color-pop`. A double-click on the chip opens rename.
- Rename uses `.pill-input` (32px high, 150px wide, accent border, always with the focus ring). Enter or blur commits; Escape cancels.
- "+ New week type" opens `.new-template-form` (pill input and `.btn-sm.btn-primary` "Add"). Escape closes.
- Delete (`.delete-template-btn`, `.btn-xs.btn-danger`) is pushed to the right with `margin-left: auto`. It is shown when there is more than one template. It calls the native `confirm()` before deleting. On phones only the glyph shows.

Paint tools (`.paint-tools`, Planner year section): same chip style, with a `.dot` per template and an "Erase" chip (`.dot-erase`: bg fill with a 1px `--control-border` ring). Selected chip uses `data-active`.

### 4.6 Colour popover (`.color-pop`)

- Absolute, top at `calc(100% + 8px)`, width 232px, grid of 8 columns with 6px gaps, padding 12px, `--bg` background, 1px `--rule` border, radius 6px, `--shadow`, z-index 20.
- Swatches: 20px circles from `DESIGN_COLORS` inside 24x24 buttons (2px transparent padding, so the hit area is 24px; slice 5). The popover is 248px wide, 8 columns, 4px gap. Active swatch uses `box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent)`.
- Inline variant (`.color-pop-inline`) is static, no shadow, full width. Used in the new-category form.
- Closes on outside click (the view and popover handlers stop propagation).

### 4.7 Form fields (`.field`, `.field-label`, `.timely-input`, `.timely-select`, `.pill-input`)

- `.field`: column, gap 6px. `.field-label`: 13px 500, `--ink-2`.
- `.timely-input`, `.timely-select`: 36px high (40px on phones), padding 0 12px, 1px `--control-border` border, radius 6px, `--bg` background, 13px text. Placeholder `--ink-3`.
- Focus: accent border and `--focus-ring`.
- `.timely-select`: `appearance: none`, right padding 32px, chevron drawn with two linear gradients in `--ink-3`.
- `.form-row`: two columns, collapsing to one at 768px. `.form-stack`: column, gap 12px.
- Disabled: primary button only; inputs have no disabled style.
- Error: no inline error style exists (see gaps).

Habit fields are different. Inside habit details, count, period, minutes, and linked activity use Vuetify `v-text-field` and `v-select` with `variant="outlined"` and `density="compact"`. They do not use `.timely-input`. Their outline uses `--control-border` and their labels use `--ink-2` at full opacity (set in `main.css`), so they match the other fields in colour, but their heights and radii still differ (see gaps).

### 4.8 AutoTextarea (`app/components/AutoTextarea.vue`, scoped)

- Purpose: multi-line text that grows with its content. No resize handle, no inner scrollbar.
- Anatomy: optional `label.auto-label` (13px 500, `--ink-2`, gap 4px from the box), `textarea.auto-textarea` with `rows="1"`.
- Box: width 100%, padding 8px 12px, 1px `--control-border` border, radius 6px, `--bg`, 15px text, line height 1.5, `overflow: hidden; overflow-wrap: anywhere; resize: none`. Placeholder `--ink-3`.
- Focus: accent border and `--focus-ring`.
- Auto-grow: on mount, on every `input`, on each change of `modelValue` (next tick), on window resize, once fonts are ready, and when the box's width changes (`ResizeObserver`, fitted in `requestAnimationFrame`). The height is reset to `auto`, then set to `scrollHeight` plus the border height.
- Hidden boxes (inside a closed `<details>`, or an inactive Vuetify window) are skipped until they are visible.
- Font size: 15px by default. Goals uses the default 15px; the old 16px override was removed in slice 3.

### 4.9 Goals (Harada), `app/components/harada/HaradaView.vue` (scoped)

Slice 3 (FR-GOALS-13 to 22). Page: `h1` "Goals" and a lede. Order top to bottom: ambition, Harada map, then the life area list with its detail (PRD 11.5).

- **Ambition** (`section.vision`; with no ambition yet, `section.vision.vision-new` shows the prompt "Write your 5-year ambition" with "Save ambition", disabled while blank, and saving creates it): `h2.section-title` "Ambition, N years" (N from the stored horizon, shown, not editable) and an Edit button (`aria-label` "Edit ambition"). View mode: the statement at 18px 500, line height 1.45. Edit mode: `AutoTextarea` "Ambition statement" that applies at once; Done returns focus to Edit; Escape leaves. Vision edit mode is local to the screen (one field), not in the URL. Opening it ends a category edit, and selecting a category ends it.
- **Map** (`.harada-grid`, read-only; shown only from 1100px, hidden below): 3x3 with hairline gaps. The centre (`.harada-centre`) shows "Ambition, N years" and the statement. Eight outer cells are `button.harada-cell` with a colour dot (16px), the order (`.cell-num`, "01" to "08"), the name (`.cell-title`) and "To define" (`.cell-status`, warn). Nothing else: no hints, counts or hours. A missing category leaves an empty placeholder (`.harada-empty`, `--bg-2`, `aria-hidden`). The selected cell has `--bg-4`, a 3px accent bar and `aria-pressed="true"`. Focus: the 2px inset accent ring (section 2.8). Keyboard: Tab between cells; Enter or Space selects; arrow keys move focus and skip the centre and empty slots without wrapping.
- **Life areas** (`section.section.browse`): on desktop, the list (300px) sits left and the detail right, separated by a 1px `--rule-2` rule with 32px padding. Phones stack them (section 3.5).
  - List (`ul.cat-list`, rows `button.cat-row`, min height 44px): colour dot, name (15px 500), the 1-year target in 12px ink-3 (or "Target to define" in warn), and the needed-and-planned bar under the target (section 4.9a). The target wraps onto as many lines as it needs: no ellipsis, no line clamp, and the row grows with its text (the dot sits on the first line). There is no outline, flag or legend for status any more. The selected row has `aria-current="true"` (set from the URL selection only, so on a phone with nothing selected no row is marked), `--bg-4` and a 3px accent bar; its secondary text uses `--ink-2` on the tint. Up and Down arrows move focus between rows.
  - Note under the list above eight categories (13px ink-3): "Only the first 8 categories appear on the Harada map. The others work everywhere else." (FR-GOALS-21).
  - "+ Add life area" (`.chip-add`) reveals a form (progressive disclosure, FR-GOALS-19): name (`.timely-input`, "Name can't be empty" as `.field-error` when submitted blank), colour (inline palette `.color-pop-inline`), primary "Add category" and "Cancel"; Enter submits; Escape closes. The new category opens selected in edit mode with its name focused.
- Empty state (no categories): "No goals yet. Start from the starter grid and adapt it." with "Load starter grid" (`.btn-primary`, FR-GOALS-10). The ambition still shows above it.
- Phones (768px and below): the ambition and the map stack above the list. When a category is selected the vision, map and list are hidden and the detail shows full width with "Back to categories" (`.detail-back`, FR-UX-8); Back restores the scroll position and focuses the row. The map is hidden on phones and tablets.
- Closing (desktop and phones): the Back to life areas button (`.detail-back`, chevron and text, on its own line above the title at every size) and Escape clear the selection (`item` and `edit` leave the URL) and return to the list. Escape in edit mode first leaves edit mode, then closes. With nothing selected, desktop shows a placeholder beside the list; phones show the list alone.

### 4.9a Needed and planned bar (`app/components/harada/NeededPlannedBar.vue`, scoped)

One category's time against its need, in hours a week (FR-GOALS-16). Used in every Goals category row (under the target) and in the category detail ("Hours a week"), so the status cue is one language everywhere.

- Two bars on one scale, the larger of the needed and the planned time: each row is a full-width track (`--bg-3`, 8px, 3px radius) and the bar inside it is its value. The needed bar is an outline (1.5px `--control-border`), the target as a frame. The planned bar is solid, in the category colour through the planned fill rule (section 5.2), and `--accent` without a colour. A zero value draws no bar.
- One text line under the bars (13px, `--ink-2`, 1.35), with a 16px status icon in the same line: "3 h planned of 3 h needed" with a check in a filled circle (`--ok`), "Needs 2 h more" with a plus in a ring and "1 h over" with a minus in a ring (both `--warn`), and "No time target yet" with a dashed ring (`--ink-3`). The status is never colour only: the icon shape and the words say it.
- The bars and icon are `aria-hidden`; the text is the reading. The Goals list renders the bar after mount only (the saved state is not known on the server), like the rest of the status cues.
- Status comes from `alignmentStatus` and `categoryAlignments` (section 4.10 and `agent.md`): unchanged.

### 4.10 Category detail and habit rows (`CategoryDetail.vue`, `HabitList.vue`, scoped)

`HaradaCategoryDetail` (FR-GOALS-16 to 18; FR-GOALS-20 is not built). Keyed by the category, so its drafts reset on change.

- Head: `h3.detail-name` (dot and name, 18px 600) and Edit (`.btn-sm.btn-outline`, `aria-label` "Edit {name}") or Done (`.btn-primary`). Done returns focus to Edit. Escape closes a removal confirmation first, otherwise leaves edit mode. Back to life areas (`.btn-sm`, `.detail-back`: chevron and text, on its own line above the title) clears the selection.
- View mode:
  - "5-year goal" and "1-year target" (`.detail-text`, "Not written yet." in ink-3). The "To define" flag (warn) sits above the target text when the target is flagged.
  - Superseded by section 12, formerly "Goals vs. planned" (`.detail-goal`): a caption "Hours a week in {template}, through this category's habits.", the track (`.goal-track`, `.goal-fill`, `.goal-target` tick) drawn on the largest value across all categories (the Insights scale), figures in `.goal-figures` ("X h of Y h a week", or "X h a week scheduled" without a target), the quiet total ("Z h scheduled in total") and flags ("No target yet", "No time planned", "N habits not linked to an activity"). The same computation as Insights (`categoryAlignments`).
  - "Habits": read-only rows (`.habit-row`): name, "N a week, M min", then "Linked to {activity}" (a link to the activity in Planner) with the activity's category in brackets when it differs from the habit's own, or "Not linked" (FR-GOALS-22) as quiet text: 12px `--ink-3`, not bold, no badge or warning colour, because it is not a problem (`.habit-meta.is-unlinked`). The linked line is the informative one. Empty: "No daily habits yet for this life area."
  - "Activities": rows with name, short code and hours a week in the active template, and an "Edit" link to the activity in Planner with edit mode (FR-UX-4). Empty: "No activities in this category yet. Add one in Planner."
- Edit mode (edits apply at once, FR-UX-6):
  - Name (`#cat-edit-name`, `.timely-input`); an empty name shows "Name can't be empty" and is restored on blur.
  - Colour: inline palette (`.color-pop-inline`); recolouring changes only activities still on the old colour (A6, store rule).
  - 5-year goal and 1-year target: `AutoTextarea`. "Target still to be defined" is a native checkbox (`.check`, accent colour) that sets `targetTbd`.
  - Habits: one row per habit with Edit (`aria-label` "Edit {name}", `aria-expanded`) that opens its form inline; one form open at a time. The form: name (`AutoTextarea`), times (number), period (`.timely-select`), minutes each (number), linked activity (`.timely-select` with an `optgroup` per category: the habit's own category first, then the others in order, categories without activities omitted). "Remove habit" opens an inline confirmation (`.inline-confirm`) and removes nothing before "Remove". "+ Add habit" (`.chip-add`, below the list) is in view mode, in edit mode and in the empty state. It opens a draft form with the same fields (`HabitForm.vue`, shared with each habit's edit form). Save habit adds the habit through the store; Cancel and Escape discard the draft; a missing name is refused with a message; focus moves into the name.
  - Activities: the read-only rows above.
  - Move up and Move down (`.btn-sm`, disabled at the ends); Remove life area (`.btn-danger`) opens an inline confirmation (`.inline-confirm`) that names the impact: "Its N activities and M habits must move to another category before X is removed." with a select of the other categories and "Move and remove"; with no content, "Remove X? It has no activities or habits." Without another category: "Add another category first, then remove X." Removal selects nothing afterwards.
- Under the hours bar: `.detail-compare` (13px, ink-3), "Compared with {week type}", the week type the comparison reads (FR-GOALS-16). Quiet: no icon, no colour.
- Shared classes (`main.css`): `.form-stack`, `.form-row` and `.form-row-3`, `.form-actions`, `.inline-confirm`, `.inline-confirm-text`.

### 4.11 Insights (`app/components/insights/InsightsView.vue`)

Superseded in part by section 12. This section describes the former Visualization screen: the goals-vs-planned block and the key-insights text are removed, and the charts are one planned-hours chart with granularity and range.

Counting (PRD 23.1, FR-INS-P3, since 2026-10-28): every week counts the week type that governs it (its assigned one, else the active one), as Home and Planner do. With nothing planned in the range, the view shows the headline "Nothing planned yet in <year>" with a `.btn-outline` link "Open Planner" (section 13).

Read-only (FR-VIZ-1). Replaces the Insights view in slice 1. The only controls are the year (`YearNav`, the same selected year as the Planner grid), the projection horizon (a select stored in `settings.projectionDefaults.years`), Weekly or Monthly, and the category focus chips.

Page: "Where your time goes". Year control only, then sections in this order: The year (two headline numbers and the category bar with its rows), goals vs. planned overview, Key insights (horizon, the top projection line, then the week by week chart).

**Goals vs. planned time** (overview for all categories, FR-VIZ-6; the primary view is the Goals detail). Each name links to its category in Goals. Section lede explains the tick and the quiet line. Each row (`.goal-row`) is a grid: name (minmax 140 to 220px), track (fluid), figures (auto). Row divider `--rule-2`, first row no divider.

- `.goal-name`: 15px 500.
- `.goal-track`: 6px high, radius 3px, `--bg-3`. `role="img"` with an `aria-label` that spells out scheduled and target hours.
- `.goal-fill`: `--accent`, radius 3px, width proportional to the largest value across all rows.
- `.is-untargeted` track: fill becomes `--ink-4` (grey) when there is no target.
- `.goal-target` tick: 2px wide, `--ink-2`, extends 4px above and below the track. Shown only when a target exists.
- `.goal-figures`: 13px `--ink-2`, right aligned, tabular. Values: "X / Y h" with a target, "X h scheduled" without, "—" for none. `.goal-total` (12px `--ink-3`, block) adds "Z h scheduled in total" when there are activities.
- `.goal-flags` (12px `--ink-3`, `·` separators, spanning the second column): "No target yet", "No time planned", "N habits not linked to an activity". One line per row, only for what is missing.
- Mobile: track moves to its own full-width row; flags full width.

**The year.** Lede: "2026, each week under the week type that governs it."

- Metrics (`.metrics`, three columns; one column at 768px and below). Each `.metric`: `.metric-value` (28px 600, tabular, `-0.01em`, unit `h` at 13px 500) above `.metric-label` (13px, `--ink-3`). Values: planned hours in the selected year (the sum of the week chart), the daily average of the leading category over the year (`h/d`), and the top projected activity over the horizon (`projectionInsight` sentence). Empty: "—" and "No projection yet."
- "Week by week" disclosure (open): toolbar (lede left; segmented control right), focus strip of chips (All plus each category), SVG chart in `.chart-scroll`, and a legend (`.chart-legend`).
- Segmented control (`.segmented`): track `--bg-3`, padding 2px, radius 6px. Buttons 28px high, 13px `--ink-3`; selected has `--bg` background, `--ink`, 600.
- Chart: viewBox matches width. Weekly: 52 bars, 12px wide with 4px gaps, left axis 44px, plot height 180px, bottom 28px for labels. Monthly: 12 bars, 28px wide with 10px gaps, value = average hours per week within the month. Y ticks at 0, 42, 84, 126, 168 h (168 = hours in a week). Tick labels 12px `--ink-3`, tabular. Grid lines `--rule-2`.
- Segments: the planned fill of the category colour (section 5.2, full strength), stacked by hours (largest at bottom). Corner radius 1px (weekly) or 2px (monthly).
- Focus: a chip selects one category; the other segments drop to opacity 0.12.
- Empty week: full-height bar in `--cell-empty` with a `--cell-line` outline (`.chart-empty`).
- Current-week marker: a 3px accent bar 5px above the current bar (monthly: current month).
- Legend: dot, name, `N h/wk` (average per week of the selected year).
- Unassigned weeks have no applied template. They use the active template and draw at 45% opacity; a note under the legend names that template (FR-VIZ-3).
- Year by category (FR-VIZ-4, now in The year, not in a disclosure): a stacked bar of planned hours (segments in the planned fill, 5.2) with rows below (`.total-row`) with dot, name (a link to Goals), planned hours in the year and a percentage of planned hours. Percentages use largest remainder, so they add up to 100.

### 4.12 Week grid (`app/components/planner/ActivityGrid.vue`, styles `.wk-*` in `main.css`)

Restored on 2026-10-26 to the original interaction (FR-PLAN-23); it replaces the slice 7 brush grid. Mounted inside `<ClientOnly>` in `PlannerView.vue`: the grid is state-driven, and server HTML kept the seed cells after hydration.

- Head line (`.wk-head-line`): title "Week" (section title) and a quiet meta line "{template} · N of 168 h planned" (13px, `--ink-3`, tabular).
- Frame (`.wk`): 1px `--rule` border, radius 6px, hidden overflow, `--bg`, minimum width 540px, inside `.wk-scroll`. The frame scrolls sideways on phones; the page never does.
- Columns: a 52px hour gutter (`.wk-hours`, `--bg-2`, 12px labels every three hours), then seven day columns (`.wk-day`). The header (`.wk-head`, `--bg-2`) has the day name (13px 600), the planned hours of the day (12px `--ink-3`) and a 24px clear-day button (`.wk-clear-day`) labelled "Clear Monday" and so on.
- Slots (`.wk-slot`): 28px per hour, a hairline above each three-hour line, `--bg-3` on hover. Each slot is one focus stop (`role="button"`, roving `tabindex`), named "Monday 9AM, Deep Work" or "Monday 9AM, free".
- Blocks (`.wk-block`): a run of one activity's hours, absolute over the slots, filled with the activity colour. The text colour is `inkOn(fill)` (section 5.2). A 1px inset hairline keeps dark colours visible in dark mode. The text is the activity's short code (13px 600, one to three letters, so nothing is cut off); the full name is the block's `title`, its `aria-label` and the activity menu. The time range is 12px. The 24px delete (`.wk-block-del`, shown on hover or keyboard focus, hidden on touch) clears the block.
- Selection (`.wk-sel`): `--accent` at 16% with a 1px `--accent` inset frame and the duration in a small label. It ignores the pointer except in edit mode.
- Interaction (the original model, restored):
  - Drag down one day column from one hour to another: the run is selected. Release opens the action bar. A drag does not leave its column.
  - Click or tap a painted hour: its whole block is selected and the bar opens. Click or tap an empty hour: that hour is selected.
  - Touch only taps: a move of more than 8px is a scroll, so the page scrolls normally.
  - Action bar (`.wk-bar`, teleported to `body`, fixed beside the release point, at the bottom on phones): the day, range and duration, a hint, then "Apply…" (or "Change…" when the run holds hours), "Edit" (disabled for an empty run), "Delete" (when the run holds hours) and "Cancel".
  - Apply or Change opens the activity menu (`.wk-menu`): each activity with its hours a week in the template, then "Clear these hours". Choosing an activity paints the run and overwrites what was there. The menu is fitted to the screen: its height is `min(400px, 100dvh - 16px)`, it moves up when its bottom would pass the bottom edge, and its list (`.wk-menu-list`) is the part that scrolls, with `overscroll-behavior: contain`. The overlay has `touch-action: none`, so a touch on it does not scroll the page.
  - Edit: the run gets two handles (24px hit areas with a 28px pill; `touch-action: none`, so a touch drag moves the edge without scrolling the page), a duration label and Save (✓) and Cancel (✕) in its top-right corner. A handle moves its edge by whole hours, and Up and Down arrows move the focused handle one hour. Save clears the original run and applies the activity to the new one; Cancel restores the run and reopens the bar. Apply on a run that changes hours opens this edit on the new block at once, with focus on the top handle: Save then extends the Apply's undo step, and Cancel or Escape leaves the block as applied (no bar reopens).
  - The cross in a day's header clears the whole column. A block's delete clears that block.
  - An open bar or menu covers the page with `.wk-overlay`. Pointer down on the overlay closes it (on pointer down, not click, because the click that follows a tap would land on the overlay the tap opened). Escape closes it and cancels any edit.
- Undo (`.wk-undo`, role `status`, 13px `--ink`): after any change that alters hours, a line under the grid names the change ("Deep Work set on Mon 9AM – 12PM.") with an Undo button. Undo restores the template's slots as they were (one step). The line disappears after 8 seconds and is dropped when the template changes.
- Keyboard (added to the original so FR-PLAN-19 stays operable): one tab stop; arrows move; Shift with arrows selects a run in one day; Enter or Space opens the bar for the run, or for the block or hour under focus; Escape closes. Focus moves into the bar and the menu when they open and returns to the grid when they close.
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
- The grid writes through `paintCells` (store) and `restoreSlots` (undo), with `rectangleCells` and `rangeConflicts` from `app/utils/planner.ts`.

### 4.14 Charts and legends (summary)

- Charts are hand-written inline SVG. No charting library is used. Chart.js is not a dependency (the PRD named it).
- Colour: the planned fill of the category colour (section 5). Labels: 12px `--ink-3`.
- Every chart has a text legend or a table beside it. Colour is never the only carrier of meaning.

### 4.15 Floating menus

`.color-pop`: `--bg` background, 1px `--rule` border, radius 6px, `--shadow`. The week grid's action bar and activity menu (`.wk-pop`, section 4.12) are fixed and teleported to `body`; the menu is kept inside the viewport and its list scrolls within it. A new floating element should be fixed and teleported to `body` so the grid cannot clip it.

---

### 4.16 Home (`app/components/home/HomeView.vue`; pure calculations in `app/utils/home.ts`)

Read-only except the period selector and the journal card (FR-HOME-1). The journal card is described in 4.18.

- Page header: "Home", a one-line lede, and `p.page-meta` with the header line: date and ISO week only, no template name ("Sunday 25 October 2026 · Week 43"; Month lists each template with its days, "October 2026 · Standard Week 31 d"). A `p.section-lede.home-note` names the active template when the current week has no template of its own. Date output is null until mounted (FR-DATE-6).
- Period selector (`.segmented` in `.home-toolbar`, group "Period"): Day, Week, Month as buttons with `aria-pressed`. Left, Right, Up and Down move the selection and focus with wrap-around; Home and End go to the first and last. The choice is session state, so it survives a tab switch and resets on reload. Default Day.
- Order (UX slice 8): the activities of the period first (the list below), the timeline directly under it, then the journal card. The totals row, the time-per-category bar and legend, and the below-target line are removed.
- Timeline (`.home-timeline`): a 12px bar of coloured segments only, no text inside. Day: 24 segments, one per hour, in order. Week and Month: one segment per activity, proportional to its hours (largest first), then Unplanned. Unplanned time is `--cell-empty` with a `--cell-line` outline (section 5). Each segment has a title and an aria-label such as "Deep Work, 12 h, 20%"; the group is labelled "Hours today by activity" (or this week, this month).
- Day list: `.home-rows` with `.home-row.is-block` rows: time range (`.home-row-time`, 12AM style), name with its colour dot (`.home-row-name`), category link (`.home-row-cat`), hours and Edit. The block that holds the current hour has `.is-now` (3px accent bar on the left) and a `.home-now` tag. Empty day: `.home-empty` with a link to Planner.
- Week and Month list: `.home-row` rows sorted by hours, largest first: name, category link, hours, percent of the period and Edit. Empty period: `.home-empty` with a link to Planner. No activities at all: "No activities yet." with a link to Planner.
- Edit (`.btn.btn-xs.btn-outline`, a link named "Edit {activity}") opens Planner with the activity in edit mode. Category links open Goals with the category selected.
- Phones: see 3.5. Blocks wrap; Edit stays at the row end.

### 4.17 Activities under the week (`PlannerView.vue`, `.acts`, `.act-*` in `main.css`)

Restored on 2026-10-26 (FR-PLAN-24). The Activities list is a compact section under the week, not a brush palette: there is no Erase row.

- Head (`.acts-head`): section title "Activities" and a lede "Hours a week in {template}" on the right.
- Chips (`.act-list`, each a `.chip` with `aria-pressed`): colour dot, name and hours a week (`.pill-count`). Selecting one sets `item` in the URL and shows its detail. There is no Erase chip; clearing is in the week grid.
- Detail (`.act-detail`, `--bg-2` panel, 1px `--rule` border, radius 6px): colour dot, name, "code · category · N linked habits", and "Edit" (`.btn.btn-xs.btn-outline.act-edit-btn`, named "Edit {name}"), which sets `edit=1`.
- Editor (`.act-panel`, Escape closes the confirmation first, otherwise leaves edit mode; Done and Escape return focus to the Edit button, `activityEditButton`): title "Edit {name}" and "Done" (`.btn-sm.btn-primary`), then name, short code, category (`.timely-select`) and colour (`.color-pop-inline`). Changes apply at once (FR-UX-6); a clash or empty name shows a `.field-error`. "Delete activity" (`.act-delete`) opens the inline confirmation (`.act-confirm`) that states the impact (FR-UX-7).
- Add: "+ Add activity" (`.chip-add.act-add-trigger`) reveals an `.act-panel` form: name, short code, category, colour, primary "Add activity" (disabled until a name and a code are typed) and quiet "Cancel". Enter submits; Escape closes from any control in the form; Cancel, Escape and a saved activity return focus to "+ Add activity". Opening from Goals (`add=1&category=`) opens it with that category preselected (FR-GOALS-20).
- Empty list: "No activities yet. Add one to plan when it happens." (`.acts-empty`).
- Phones: chips wrap; the editor and the form take the full width, and their two-column rows stack under 480px.

### 4.17b Week type panels and schedule (`PlannerView.vue`, `.act-schedule`, `.sched-*`, `.new-template-panel`, `.role-*`, `.weeks-*` in `main.css`)

Added 2026-10-28 (FR-PLAN-25, FR-TPL-8, FR-YEAR-7). All three use existing tokens and the `.act-panel` surface.

- Schedule in the week: a button "Schedule in the week" (`.btn-sm` in `.act-schedule-toggle`, under the activity detail in view mode, `aria-expanded`, `aria-controls="act-schedule"` while open) is closed by default. Open, the panel (`.act-panel.act-schedule`, `#act-schedule`) has a title with a "Close" button (`.btn-sm`, right of the title; Escape also closes, from the panel or the button, and focus returns to the button), a lede that names the active week type ("Paints {activity} in **{week type}**. Hours it replaces belong to other activities."), an optional habit hint, then Days (`fieldset.sched-days`, legend "Days": seven `.chip` toggles with `aria-pressed`), Duration and Start (`.form-row` as a two-column grid here, one column under 480px; `.timely-select`, "1 h" to "12 h", "12AM" to "11PM"), the inline error (`.field-error`, role alert), "Add to my week" (`.btn-primary`, disabled when the week type is not hourly), and the result line (`.sched-result`, role status; outside the panel, under the button, so it stays after Close): "Added 3 x 2 h. Replaced 6 h of Deep Work." with "Undo" (`.btn-sm`) for about 8 s.
- Closing (fix/week-year-and-close): Edit week type (`.template-edit`) has "Done" (`.btn-sm.btn-primary`) in its head; Done and Escape close it and return focus to its pencil (`EditButton`). New week type has "Cancel"; Cancel and Escape close it and return focus to "+ New week type".
- New week type (`.act-panel.new-template-panel`, below the week type bar): the name field, Start from (`#new-template-from`: Empty, "Copy of <name>", then the four presets), the preset's lede in `.new-template-lede`, one `.role-row` per role the preset paints (a 96px label column beside a `.timely-select`, one column under 480px; the options are the activities, "Create \"Sleep\"", "Leave empty"), "Keep my habit sessions" (`.check`), and "Add week type" and "Cancel". Escape cancels; Enter in the name adds.
- Time off: a `.check` in the week type edit panel, "Time off: Goals does not compare against this week type".
- Year section (`.year-section`, `details.year-details`, closed by default): with any number of week types. With one week type the body starts with `.year-line` ("Every week of {year} uses {name}."), then the year nav, paint tools, Weeks row and painter, the same as with more types.
- Weeks row (`.weeks-row`, in the year body under the paint tools, any number of week types): the label "Weeks", then one line of `.weeks-part` text and controls, "Use [week type] for weeks [from] to [to] [Apply]" (`.timely-select`, two `.timely-input.weeks-num` number fields, 72px). It wraps under 400px; errors are `.field-error` (role alert), the result is `.weeks-result` (role status).
- Keyboard and touch: every control is a native control with its label; no drag. Focus moves to the new week type's Weeks "from" field after a Vacation preset.

### 4.18 First-run onboarding (`app/components/onboarding/`, `.onb-*` in `main.css`)

Feature FR-ONB (PRD 9.13). Session state only (`useOnboarding`, Nuxt `useState`); nothing here is saved. Client only (`ClientOnly` in `app.vue`).

- **Dialogs** (`OnboardingFlow.vue`): Welcome, then two steps, each a centred dialog (`.onb-overlay` scrim in `color-mix` of `--ink`, `.onb-dialog`: `--bg`, 1px `--rule`, radius 6px, `--shadow`, 460px max, 24px padding on phones). Each step opens with `.onb-step` ("Step 1 of 2", 12px `--ink-3`), then the title `.onb-title` (18px 600, `aria-labelledby`) and `.onb-lede` (15px, `--ink-2`, 1.6). Welcome actions: "Guide me" (`.btn-primary`), "Start empty" (`.btn-outline`) and "Explore with sample data" (`.onb-link`, accent text, underline on hover). Under them, a quiet link "Watch the short intro" (`.onb-link.onb-intro-link`) opens the intro, which returns to Welcome. Step 1 is one `.field` (`.timely-input`) with "Next" and "Back". Step 2 holds one `.onb-goal` block per goal (a 1px `--rule` above each block after the first; "Goal 1" as `.onb-goal-title`; "Remove" as `.onb-link` on the second). Each block has the life area as a single choice among the eight default life areas (`.onb-chips`, a `role="group"` of `.chip` buttons with `aria-pressed` and `data-active`; the area the other goal uses is disabled at 45% opacity; there is no free-text field, the name can be changed in Goals), the optional one-year target, the habit, and the times and hours selects side by side in `.onb-pair` (one column under 480px). "Add a second goal" is `.onb-link.onb-add`, shown below two goals. Errors are `.field-error` with `role="alert"` and `aria-invalid`, and the first invalid field takes focus. Focus goes to the marked field (`data-autofocus`) on open. Escape goes back one step (Welcome: Start empty). Answers are kept when going back to Welcome from step 1, and cleared when a new run starts (after Reset my data).
- **Tour card** (`OnboardingTour.vue`): `section.onb-tour`, fixed to the bottom centre (`min(440px, 100% - 32px)`, `bottom` with the safe-area inset, `max-height` 40vh and scroll; 36vh on phones), `--bg`, 1px `--rule`, `--shadow`, z-index 30. It does not block the page. Three cards, Plan your week, Insights and Daily follow-up. The cards name only the life areas the build filled (`onboardedCategories`), never the other default areas. Parts: the title `.onb-tour-title` (15px 600) and the body `.onb-tour-body` (13px, `--ink-2`, 1.6), and the actions: "Skip tour" (`.btn-sm`) on the left, Back and Next or Done (`.btn-sm`, primary on the last) on the right. Focus moves to the title on open and on each step. Escape skips. On the last card a secondary "Watch the intro again" (`.btn-sm`) opens the intro; the intro returns to the tour when it closes.
- **Intro** (`OnboardingIntro.vue` is the dialog, `IntroPlayer.vue` the player, FR-ONB-9): the same scrim, a 640px dialog (`.onb-intro`, full width minus the gutters on phones) titled "How Timely works" (`.onb-title`). A 16:9 stage (`.onb-intro-stage`: `--bg-2`, 1px `--rule`, 6px radius, `position: relative`) holds the caption band and one SVG with five scenes (`.onb-intro-scene` with `data-active`). The caption band (`.onb-intro-caption`) is the top 28 percent of the stage, or taller when its text needs a third line (`min-height`, so the text is never clipped): `--bg` with a 1px `--rule` underneath, text `--ink` at weight 500 and `clamp(0.875rem, 2.4vw, 1.3rem)` (0.8125rem up to 480px), centred, fading in with each scene (`onb-intro-caption`, opacity only: an upward offset clipped the band top while it animated and while paused). The SVG graphics start below the band (y 104 of 360 units), so no graphic sits under the text. A scene crossfades in, and its CSS animations run only while it is active (`.onb-intro-fade`, `-rise`, `-slide`, `-pop`, `-grow-x`, `-grow-y`, `-draw`, with the delay in `--d`). The stage has `data-paused`, which pauses the animations with the timer, and `data-static`, which switches the animations off until the first Play so that scene 1 is drawn whole. Colours are tokens, or the planned fill rule for hours and bars. The same caption is in a `.sr-only` paragraph with `aria-live="polite"` under the stage, so there is no visible caption line below it. Below the stage: five progress segments (`.onb-intro-segment` with `.onb-intro-bar` and `--fill`; 24px, 44px on phones) and the controls (`.onb-intro-controls`: Play or Pause, Back, Next or "Continue", and "Skip intro" as `.onb-link`). Before the first Play, a round Play button (`.onb-intro-play`: `--accent` fill, `--on-accent` icon, 64px, 56px up to 768px, centred over the stage, `aria-label` "Play the introduction") covers the centre of scene 1; the first Play starts from scene 1 and moves focus to Pause. A segment clicked before the first Play jumps to its scene and stays paused. Reduced motion: no Play button, no timer, every scene whole. Escape skips. The player is shared with the sign-in page (section 4.19): `IntroPlayer` takes `loop` and an `end` slot, which the dialog fills with "Continue" and "Skip intro". The timer also holds while the tab is hidden or the stage is out of view (`visibilitychange`, IntersectionObserver). It never starts by itself: the first Play starts it. The dialog (`.onb-dialog`) is centred with auto margins, keeps its max height (100dvh minus 32px) and scrolls inside only if needed; on phones (480px and below) its padding is 16px. "Continue" is always shown in the dialog, so the video is optional. Known gap: no focus trap, as in the Welcome dialog.
- **Account menu "Replay tour"** (`.btn-sm` in `.account-menu`, after the email, in both modes): replays the tour from Plan your week. Hidden while storage loads. The topbar has no Tour button and no tab numerals.
- **Touch:** at 768px and below the dialog buttons, tour buttons and the chips are 44px high.
- **Scrim and motion:** no animation; the dialog appears at once.
- **Reset confirm** (`app/components/account/ResetDataDialog.vue`, FR-ONB-10): the same scrim and dialog, `role="alertdialog"` with the title "Reset my data?" and the body text in `aria-describedby`. Cancel (`.btn-outline`) has focus on open; Delete my data is `.btn-danger-solid` (filled `--danger`, text `--bg`, 6.9:1 light, 9:1 dark). Tab stays between the two buttons; Escape cancels. A failed save shows `.field-error` with `role="alert"` and keeps the dialog open.
- **Account menu** (`.account`, `.account-menu`): the "Account" button in the top bar, in both modes. Supabase shows the email and Sign out; local mode shows only "Reset my data" (`.btn-sm .btn-danger`).
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

### 4.18 Journal (`app/components/home/JournalCard.vue`)

Superseded in part by section 12: no key message, no readings, no experiment label.

Experiment (FR-HOME-11 to 13). The last block on Home, shown for today in every period. It is marked as an experiment in the UI and may be removed after the test.

- Section `.section.journal` with the hairline rule (no box, no shadow). Title `h2` "Journal" with `.journal-tag` "Experiment" (12px, `--bg-3` background, `--ink-2` text, sentence case). Lede (13px, `--ink-3`): one note a day, kept in this browser; a concept test.
- Key message (`.journal-key`): the ambition statement in `.journal-statement` (18px, 500, `--ink`), then `.journal-focus` (13px, `--ink-2`): the category name as a link to Goals, a colon and its target. With no ambition or no targets, a lede links to Goals instead.
- Note, view mode (`.journal-view`): the text in `.journal-text` (15px, line breaks kept, `--ink`), or "No note for today yet.". Button `.btn.btn-sm.btn-outline`: "Edit", or "Write today's note" when empty.
- Note, edit mode (`.journal-edit`): `AutoTextarea` with the visible label "Today's note" and the placeholder "What went well today? What mattered?". It saves 400 ms after the last key. Status `.journal-status` (13px, `--ink-3`, `aria-live="polite"`): "Saving…" while typing, then "Saved" for 2 seconds. Button `.btn.btn-sm.btn-primary`: "Done". Escape also leaves edit mode. Focus moves to the textarea on Edit and back to Edit on Done. The box grows with the text (no inner scrollbar).
- Readings (`.journal-readings`): `h3.journal-subtitle` "Readings" (15px, 600) and a lede "Docs and notes to revisit will live here." No data, no input.
- Date output renders after mount (FR-DATE-6). Changing the day while editing saves the note under the date it was started on and leaves edit mode.
- Phones: the same stack in one column; the card needs no layout change at 400 px.

### 4.19 Legal pages, consent line and footer (`app/components/legal/LegalPage.vue`, `app/pages/terms.vue`, `privacy.vue`)

- Routes `/terms` and `/privacy`. `LegalPage` is the shell: `main.view.legal` with `.page-head` (title `h1.page-title`, `p.page-meta` "Last updated 27 October 2026"), the slot in `.legal-body`, and a "Back to Timely" link (`.legal-back`) to `/`.
- Reading column: `.legal-body` is 70ch wide, the rest of the `.view` is empty. Section headings are `h2` at 18px 600 (`--fs-lg`), 32px above and 8px below. Body text is 15px `--ink-2` at line height 1.6; bullet lists use 24px indent with 8px between items; `strong` is `--ink` 600.
- Links in running text use `.legal-link` (`--accent`, underlined 1px, 2px offset; `--accent-deep` on hover). The same class is used for the consent line.
- Consent line (`.login-consent`, under the sign-in block): 13px `--ink-3`, centred, as wide as the sign-in column (640px). Its two links carry `white-space: nowrap`, so each link wraps as a unit.
- **Sign-in page** (`LoginGate.vue`, Supabase mode, signed out; `.login-*` in `main.css`): one centred column, 640px at most, full width minus the gutters on phones, no card frame. In order: the heading `h1.login-heading` "Your goals decide your week" (clamp 24 to 32px, 600, `--ink`) and one line `.login-lede` (15px, `--ink-2`, 1.6), all centred; then `.login-showcase` with `OnboardingIntroPlayer loop quiet`; then `.login-action-block` (h2 "Sign in to Timely" 16px 600, the Google button `.btn-primary` at least 240px wide, the error text); then the consent line. The `quiet` variant of the player (`.is-quiet`) has no stage frame (no border; a tone shift to `--bg-2` and an 8px radius), its controls are `.onb-link` text links centred under the stage, and the five segments are the thin progress line. Looping; it opens paused behind the Play overlay (no autoplay), no sound, no tabs, no inputs. On phones the Google button and the player controls are 44px high.
- Footer (`footer.app-footer`): "Terms · Privacy" in 13px `--ink-3` (hover `--ink`, underline), 1px `--rule-2` top border, padding 24px top and bottom, and sides that follow the page gutter (40px, 32px at 1280px, 28px at 1024px, 16px at 768px and below). Shown in local mode, on the sign-in page and for signed-in users; hidden only while the session loads. It wraps without causing overflow.
- Legal pages are shown without a session: `app/app.vue` renders them instead of the gate, and the planner tabs stay hidden for a signed-out user.
- Onboarding overlays (Welcome, tour) are not rendered on the legal pages, so they do not cover the text. The state is kept, so they appear again on Home.
- Verified in headless Edge on the production build: 1280 and 400 px, light and dark, no horizontal overflow, no console errors; in dev no hydration warnings (only the known dev-only 404s for Vuetify and MDI CSS). Screenshots `spec/screens/legal-*`.

## 5. Colour handling: one palette for planned time

One logical palette covers every place where time is painted: the Home timeline, the week grid (blocks and the activity colour), the year grid, the Insights bars and the category and activity colours. Daily, weekly and yearly views use the same semantic tokens, so an empty hour, a planned hour, the current week and the selection look the same wherever they appear.

### 5.1 Semantic tokens (planned time)

Defined in `main.css` (`--cell-empty`, `--cell-line`) and computed in `app/utils/palette.ts` (planned fills). The surface is the page, so the empty surface is `--bg` in both themes.

| Semantic state | Token or rule | Light | Dark | Use | Contrast (light / dark) |
| --- | --- | --- | --- | --- | --- |
| Empty (unplanned hour, empty week, empty bar) | `--cell-empty` | `#ffffff` | `#0f1624` | Home timeline, year cells, week grid background, Insights empty bars | Equals the page surface |
| Empty outline | `--cell-line` | `#7d879b` | `#67738f` | 1px inset hairline around every empty cell, unplanned segment and empty bar | 3.61 / 3.81 on `--cell-empty` (non-text, 3:1 met) |
| Planned | `fillFor(colour, dark)` (served as `--c`) | the colour as given when it reaches 3:1; otherwise shaded toward black | as given, or lightened toward white | Planned hour, week cell, Home segment, Insights segment, week block, template paint dot | At least 3.02 light (cream shaded to `#a19375`) and 3.00 dark (dusk); see 5.2 |
| Text on a planned fill (`--c-ink`) | `inkOn(fill)`: white or `#0f1624`, whichever contrasts more | `#ffffff` or `#0f1624` | same rule | Year cell numbers, week block names and times | At least 4.33 (teal, both themes); all others 5.4 or more |
| Current | `--accent` | `#1b4b8f` | `#86aee8` | Year cell: 2px outline outside the cell, bold number. Insights: 3px marker above the current bar. Home: "Now" tag | 8.57 / 7.96 on the surface |
| Selected | `--accent` range (week grid) and `--bg-3` hover (year cells) | range: `--accent` at 16% with a 1px accent frame; hover: `#eef3fa` | range: `--accent` at 16%; hover: `#1a2539` | Week grid drag range and action bar; year cell hover | Accent 8.57 / 7.96 on the surface |

The year grid has no selected week (it has hover, and the readout under it). Choosing a week is a paint action, so "selected" maps to the hover state there.

### 5.2 The planned fill rule

`fillFor(colour, dark)` in `app/utils/palette.ts`:

- A category, activity or template colour is shown as given when it reaches **3:1** against the theme surface (WCAG 1.4.11, non-text).
- Otherwise it is shaded toward black (light) or lightened toward white (dark), in 2% steps, until it reaches 3:1. The hue stays; only the lightness moves.
- The same function serves every planned fill, so a template paint dot and its year cells match exactly.

Measured over the 16 palette swatches (`DESIGN_COLORS`), the fills that change are: light, ochre (`#c19a3e` to `#b28e39`), cream (`#d4c19a` to `#a19375`), coral (`#e09070` to `#ca8265`), terracotta (kept, 3.12), stone (kept, 3.07); dark, navy (`#3c4b63` to `#576479`) and pine (`#2d5a3f` to `#466e56`). Every fill then has at least 3:1 on its surface. Others are unchanged.

Text on a planned fill: the lowest contrast is teal at 4.33:1 (both themes), just below the 4.5:1 for normal text. Block names are 13px 600 on that fill; this is recorded as a known limit (section 10).

### 5.3 Other colour rules

- **Swatches** (`DESIGN_COLORS`, 16 entries, `{ id, bg }`). They are data, offered for categories, activities and templates. The first (`#d97757`, terracotta) is the default for a new category. This is a category colour. It is **not** the UI accent, which is blue. The comment above the array still says "Editorial muted palette used by the design system"; that comment predates the blue palette and is stale.
- **Seed colours.** Seeded categories and activities use their own muted hex values (for example `#7a9471` for Physical, `#3c4b63` for Deep Work). They are not guaranteed to be in `DESIGN_COLORS`. The rule in 5.2 applies to them too.
- **Dots** that identify a category or activity in a list are solid colour with a 1px inset ring of `--control-border`, so pale swatches stay visible on white and dark swatches stay visible on the dark chips. Measured ring contrast: 3.26:1 minimum light and 3.44:1 minimum dark. Template paint dots use the planned fill from 5.2, not the raw swatch.
- **No softening.** Chart segments, year cells, Home segments and week blocks are full fill (no `color-mix` tint).
- Hard-coded fallbacks (`#ccc`, `#888`, `#999`, `#5d6b7a`, `#d6d3d1`) are used only when a colour is missing. Do not add new hard-coded colours.

---

## 6. Accessibility checklist

| Check | Status | Notes |
| --- | --- | --- |
| Body text contrast 4.5:1 or better | Pass for all text on `--bg`, `--bg-2`, `--bg-3` and `--bg-4`. Disabled buttons are the exception (see 4.4) | Measured in the DOM on all four tabs, both themes, after the fix pass. Text on tints uses `--ink-2`. Disabled "Add category" and "Add activity" are 2.44 to 3.05:1 (opacity 0.45). |
| Non-text contrast 3:1 | Pass for interactive controls (`--control-border`, 3.26:1 minimum light, 3.44 dark). Pass for planned fills and empty-cell outlines (section 5). | Hairline frames (`--rule`) are decorative and stay below 3:1 by design. |
| Visible focus | Pass | Harada cells: 2px inset accent ring. Block delete: global 2px accent outline. Other controls: the global 2px outline, or the accent border on fields. Checked by tabbing through each view in both themes; no stop is left without an indicator. |
| Keyboard operation | Pass for topbar, Home (period selector and Edit links), Goals, Insights, the Planner activity list, detail and forms (4.17) and the week grid (4.12). Fail for the year grid. | The year grid uses mouse events only (`mousedown`, `mouseenter`). |
| Current tab announced | Pass | `aria-selected` on each `role="tab"`. |
| Tab panel relation | Fail | No `aria-controls` and no `tabpanel`. |
| Pressed and expanded state | Pass | `aria-pressed` on Harada cells and segmented buttons; `aria-expanded` on Habit "Details". |
| Names for icon controls | Pass | Theme toggle, colour swatches, move and delete buttons all have `aria-label`; week grid slots are named by day, hour and activity. |
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
  - "unassigned, click to paint".
- Numbers carry their unit in short form: `h`, `h/wk`, `h/yr`, `h/d`, `%`.
- Times use `12AM`, `9AM`, `12PM` style (`formatHour`), not 24-hour.
- Keep the copy short. The lede of each page is one or two sentences.

---

## 8. Do and don't

Do:

- Use the existing tokens. Add a token to `main.css` `:root` and to `html[data-theme="dark"]` together, then mirror it in `vuetify.config.ts` if Vuetify needs it.
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
- Don't add a Vuetify component where a `.btn`, `.chip` or `.timely-*` class does the same job, unless the Vuetify component is needed for behaviour (the Harada tabs and window, the checkbox).
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
11. The tokens in `vuetify.config.ts` are duplicated by hand from `main.css`. Only the `VApp` root uses them; no Vuetify component is rendered.
12. The 12px chart text is hard-coded rather than a token.
13. Disabled buttons keep the 0.45 opacity rule, so "Add category" and "Add activity" are 2.44 to 3.05:1. Disabled controls are exempt; the dark one is faint but readable.
14. The journal experiment on Home (FR-HOME-11 to 13) is not built; it is slice 6.

---

## 11. Verification log for this spec

- Read in full: `app/assets/css/main.css`, `app/app.vue`, `vuetify.config.ts`, `nuxt.config.ts`, `app/components/AutoTextarea.vue`, `app/components/harada/HaradaView.vue`, `app/components/harada/HabitList.vue`, `app/components/planner/PlannerView.vue`, the old Insights and legend views (removed in slices 1 and 3). Read in part: `app/utils/planner.ts` (palette, constants, seed, state check) and `app/stores/planner.ts` (actions relevant to colour and categories).
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
- Slice 5 (cleanup and docs audit): Node scan of every class, token, path and component named in this spec against `app/` and `main.css` (scratch script, not committed); browser runs on the production build (scratchpad scripts `s5-focus`, `s5-keys`, `s5-home` and the final regression pass). Swatch hit areas measured at 24px; Home contrast re-computed in both themes (ink-3 on the page 4.76:1 light, 7.04:1 dark). Screenshots regenerated from the final build (names unchanged, Home and Visualization added).

## 12. UX polish batch (feat/ux-polish)

- **Attention token.** `--attention` is the outline of a category under or over its time target: `#a33a3a` on light and `#ee9a9a` on dark (6.9:1 and 9:1 on the surfaces). It is a 2px outline set inside the box (the grid frame clips outside outlines). The legend swatch uses the same token, plus a neutral 1px swatch for on track or no target. **Superseded:** the outline and the legend are gone from Goals; the status is the needed-and-planned bar with its icon and text (section 4.9a). The token stays for the Insights capacity line.
- **Comparison bars.** Needed and Allocated share one scale in the category detail; Needed is `--ink-4`, Allocated `--accent`. The verdict colours: Missing `--warn`, over `--accent`, On track `--ok`, No time target `--ink-3`. The verdict is text, so colour is never the only signal.
- **Hour timeline.** 24 colour-only segments under the Today title, 10px tall. Axis labels 9h, 12h, 18h and 22h sit at their hour on a 24-hour scale, 12px, with a 4px tick above each. Labels are HTML, not SVG, so they keep the 12px minimum.
- **Insights chart.** Flex columns scaled to the largest total, stacked by category with `flex-grow` set to the hours. Hour labels are HTML at 12px. The categories list uses a 6px share bar under the name row. The Hours and Weeks switches and the granularity switches use the shared `.segmented` control.
- **Copy rules.** No intro paragraphs, subtitles or instructional sentences under titles, section titles or tabs. Keep field labels, units, values, empty states that say what to do, errors and confirmations. Keyboard hints can live in `title` tooltips or `aria-label`s, not in visible text.
- **Removed.** `.page-lede`, `.section-lede`, `.detail-lede`, `.browse-note`, `.wk-pop-hint`, the Visualization classes (`.viz-*`, `.metric*`, `.goal-*`) and the journal experiment classes.

### 12.1 Edit control (batch 3)

- `app/components/EditButton.vue` is the only Edit control: a 16px pencil (stroke `currentColor`, width 2) in a 28px square, `--ink-3` at rest, `--accent` on hover and while expanded, on a `--bg-3` tint. It has the item's name in `aria-label` and `title`, `aria-expanded` when it opens something, and the 2px `--accent` focus ring. With `to` it is a router link; without, a button. It exposes `focus()` for focus return.
- Text buttons remain for Done, Write today's note and the confirmations.

### 12.2 Available-time line (batch 3)

- The capacity line of Insights is a 2px `--attention` bar per period at its available hours (`.insights-cap`), and its label (`.insights-cap-label`, 12px, weight 600) sits at the right end, on the surface colour so it stays legible over a bar. The same token as the attention outline: a red line here means the available-time marker, not an error.
- The unit selector is a `.segmented` group (Hours, Days, Weeks) next to the granularity group.

## 13. Goals and Insights simplify (feat/goals-insights-simplify)

Owner UX review, 2026-10-28: fewer concepts on screen, less to fill in, the power opt-in. Requirements in PRD 9.15.

- **List / Grid toggle** (`.goals-view-toggle`, in `HaradaView.vue`): a `.segmented` group, "List" and "Grid" as buttons with `aria-pressed`, label "Life areas view". Hidden below 1100px (`display: none`); shown from 1100px as a flex row with 16px below. The choice is session state (`useState`), not saved.
- **Grid view**: the Harada map (section 4.9) sits under the ambition, and the list is hidden (`.browse.is-grid .cat-list`). The selected life area's detail shows below the map at full width. The "+ Add life area" control stays under the browse area, so new life areas can still be added in Grid view.
- **Empty life areas** (`.cat-empty`, `.cat-add-goal`): a row with the name only and a `.chip-add` "Add a goal" control at its right end (aria-label "Add a goal to <name>"), on one hairline. It opens the detail in edit mode with the name focused. No target line, bar or "No time target yet" text.
- **Collapsed row** (`button.cat-more`): full width, 44px high, 13px `--ink-2` text, "N more life areas · add a goal" (or "area" for one), `aria-expanded`, a bottom hairline and a `--bg-3` hover. Opened, the empty areas show in list order with the empty row style. The open state is session state.
- **Category detail, view mode** (FR-GOALS-27): the 5-year goal, the 1-year target, the "Hours a week" bar with "Compared with <week type>", the habits (`HabitList`, with "+ Add habit"), then "More activities" (`.row-list`, name and "XX · N h a week" only, with Edit to Planner; Add activity). Notes and Unlink are edit mode only.
- **Habit form, linked activity**: the first option is "Add '<name>' to my week" (shown when the name is set), then None, then the activities by life area. Its error (`.field-error`, role alert) sits under the select.
- **Insights, first row**: the year switcher, Month or Week (`.segmented`), and a "More options" button (`.btn-sm`, `aria-expanded`, `aria-controls="insights-more"`). The button adds ": <setting>" in `--ink-3` while closed when a setting is not the default.
- **Insights, More options panel** (`#insights-more`, `.insights-more`): a 1px `--rule-2` frame with 6px radius and 16px padding, holding three `.segmented` groups: Year or Quarter, One year or Several years (with the horizon select), and "Show in" with Hours, Days (24 h), Weeks (168 h).
- **Headline** (`.insights-headline`): 18px 500, line height 1.45, above the chart; the answer first, e.g. "2026: 48% Physical, 27% Professional, 19% Relational & emotional", or "Nothing planned yet in 2026" with the empty state beneath (a line and an `.btn-outline` "Open Planner").
- Colour and contrast: no new tokens. The "Add a goal" and "More options" controls use the existing chip and button styles; state is never colour alone (aria-pressed, aria-expanded and the text).

### 12.3 UX batch 5 (fix/ux-batch-5)

- Headless Edge on the production build, 74 browser checks: the category detail order; Apply opening Edit range on the new block (handles, focus, ArrowUp and ArrowDown, Save, Undo, Escape); the Apply menu with 25 items at 400 by 800 (touch) and 1280 by 500 (wheel): on screen, the list scrolls, the page does not; a touch drag on a handle at 400 px; the Schedule block closed by default, Close, Escape, the result line after Close; the focus rule at 1280 px (a field takes focus) and at 400 px with touch emulation (no text field takes focus; the panel or dialog does).
- Touch scroll of the menu was driven with manual touch moves; the headless `synthesizeScrollGesture` did not scroll the list. A real phone was not used.
- Screenshots: `spec/screens/week-apply-edit-desktop-light.png`, `week-apply-menu-mobile-light.png`, `week-apply-menu-short-desktop-light.png`, `week-schedule-open-mobile-light.png`, `week-schedule-open-desktop-light.png`, and `goals-detail-desktop-light.png` (replaced).
