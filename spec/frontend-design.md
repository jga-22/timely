# Timely front-end design spec

This file describes the visual style that the code uses today. Every value here was read from the source (`app/assets/css/main.css`, the component `<style>` blocks, `app/app.vue`, `vuetify.config.ts`, `nuxt.config.ts`, `app/utils/planner.ts`) and cross-checked where noted. Where a value could not be verified, it is marked **(unverified)**.

Source of truth: the code. The old `design/` folder (terracotta and serif look) is a stale export and must not be used. The Harada prototype in `spec/references/grille-harada-meilleure-version.html` is the origin of the blue palette and the Goals layout; it is a reference only.

Reference screenshots (current build, headless Edge, light unless noted):

| Screen | Desktop 1280 | Mobile 400 |
| --- | --- | --- |
| Goals | [goals-desktop-light.png](screens/goals-desktop-light.png) | [goals-mobile-light.png](screens/goals-mobile-light.png) |
| Planner | [planner-desktop-light.png](screens/planner-desktop-light.png) (dark: [planner-desktop-dark.png](screens/planner-desktop-dark.png)) | [planner-mobile-light.png](screens/planner-mobile-light.png) |
| Home (placeholder) | [home-desktop-light.png](screens/home-desktop-light.png) | not captured |
| Visualization | [visualization-desktop-light.png](screens/visualization-desktop-light.png) | [visualization-mobile-light.png](screens/visualization-mobile-light.png) |
| Configuration | [configuration-desktop-light.png](screens/configuration-desktop-light.png) | not captured |

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
| `--control-border` | `#737e95` | `#78859e` | Boundary of interactive controls only: inputs, selects, textareas, outline buttons, Vuetify outlined fields, colour swatch and dot rings, the erase swatch, block delete and the cancel-resize ring | Light: 4.08 on bg, 3.87 on bg-2, 3.66 on bg-3, 3.26 on bg-4. Dark: 4.87, 4.59, 4.13, 3.44. At least 3:1 on every surface a control sits on |
| `--rule-2` | `#eef1f6` | `#1d2639` | Hairlines: topbar bottom, section tops, row dividers, hour grid lines | Decorative |
| `--accent` | `#1b4b8f` | `#86aee8` | Primary button fill, active tab underline, focus outline, cell numbers, links ("+ New template"), current-week ring, goal fill, selection border | 8.57 / 7.96 on bg |
| `--accent-deep` | `#12335f` | `#b5cdf1` | Primary button hover, resize handle when active, centre cell label on dark | 12.62 / 11.17 for on-accent text on hover |
| `--accent-soft` | `#dce7f5` | `#223156` | Focus ring halo, active chip fill, selection range fill | Pale halo: about 1.2:1 against white, so the accent border carries the state |
| `--on-accent` | `#ffffff` | `#0f1624` | Text on accent | 8.57 / 7.96 |
| `--warn` | `#8a5a12` | `#e8bd7a` | "To define", "Not linked to an activity" | 5.91 / 10.33 on bg |
| `--ok` | `#2d6a4f` | `#7fc4a0` | Validate button in resize confirm (text uses `--bg`) | Bg on ok: 6.39 / 8.88 |
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
| `--fs-xs` | 12px | Hour labels, `.tab-num`, `.day-hours-label`, `.block-meta`, `.cell-num`, `.cell-hint`, `.cell-status`, `.cat-meta`, `.goal-flags`, `.goal-total`, `.pill-count`, `.btn-xs`, `.selection-bar-hint`, `.slot-menu-chip .chip-hrs`, chart labels (hard-coded 12px, same value) |
| `--fs-sm` | 13px | Default `.btn` and `.btn-sm`, form labels, `.timely-input` and `.timely-select`, `.page-meta`, `.section-lede`, `.stat`, `.legend-item`, `.metric-label`, `.goal-figures`, `.habit-meta`, `.disclosure > summary`, `.block-title`, `.day-name`, Harada kicker and alignment lines |
| `--fs-md` | 15px | Body, `.tab` labels, desktop `.page-lede`, `.cell-title`, `.goal-name`, `.cat-row-name`, `.cat-name-input`, Harada 5-year goal text |
| `--fs-lg` | 18px | `.brand`, `.section-title`, `.harada-panel-title`, `.page-title` on phones (≤768px) |
| `--fs-xl` | 28px | `.page-title` (desktop), `.metric-value` |

Hard-coded exceptions (recorded, not endorsed):

- `16px`: the Harada ambition and 5-year goal text (`HaradaView.vue`, `.ambition-input` and `.goal-input`).
- `12px`: chart text, written as a literal in `.chart-text`.

Line heights: body `1.5`; `.page-lede` and `.section-lede` `1.6`; `.page-title` `1.2`; `.block-title` `1.25`; `.cell-title` `1.35` (centre cell `1.45`); `.cell-status` `1.25`; `.metric-value` `1.1`; `.selection-bar-hint` `1.5`; auto-textarea `1.5`.

Letter spacing: `.brand` `-0.01em`; `.page-title` `-0.015em`; `.section-title`, `.harada-panel-title`, `.metric-value` `-0.01em`. Vuetify tabs and buttons are forced to `letter-spacing: normal` (`main.css` line 115). The Harada Vuetify tabs use `0`.

Numerals: any number that is compared, summed or aligned uses `font-variant-numeric: tabular-nums`. This includes tab numbers, hour labels, hour totals, stat values, metric values, goal figures, `.cat-hrs`, breakdown percentages, the year counter, week numbers, block times, the selection duration and chip hours.

Case: sentence case. A repository search for `text-transform`, `uppercase` and `small-caps` finds only the Vuetify neutralisation (`text-transform: none`).

Font smoothing: `-webkit-font-smoothing: antialiased` on body.

### 2.5 Spacing

Scale (tokens): `--space-1` 4px, `--space-2` 8px, `--space-3` 12px, `--space-4` 16px, `--space-5` 24px, `--space-6` 32px, `--space-7` 48px. The base grid is 4px.

Off-scale values in use (recorded): `6px` (tab gap, `.field` gap, `.stat`/`.selection-bar-actions` gaps, `.color-pop` grid gap, `.goal-track` height), `2px` (segmented padding, block inner gap, `.cat-name-wrap` gap), `3px` (year grid gap, week cell and goal track radius), `14px` and `28px` (swatches and handles), `40px` (horizontal page gutter, see 3.3), `64px`, `72px`, `80px`, `96px` (page bottom padding), `1120px` (content max width).

### 2.6 Radius

| Value | Used for |
| --- | --- |
| `--radius` 6px | Buttons, inputs, chips, blocks, week and Harada frames, popovers, menus, the segmented control container, the remove-and-move panel |
| 4px | Segmented buttons, `.selection-duration` |
| 3px | Week cells, goal track and fill, the year-grid cells |
| 2px | Resize handle bar, `.goal-target` (1px) |
| 50% | Dots, colour swatches, day clear, resize confirm buttons, block delete buttons |

### 2.7 Elevation

Flat by default. `--shadow` is applied to `.color-pop` (the template and category colour popover), `.slot-menu` and `.selection-bar` (both fixed and teleported to `body`). No other element has a shadow. Exceptions that look like shadows are 1px inset rings (`box-shadow: inset 0 0 0 1px`), which are outlines.

Z-order: topbar 10, colour popover 20, slot menu overlay 29, slot menu and selection bar 30, resize handles 5 to 6 inside a day column.

### 2.8 Focus ring

- Global: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`.
- Text fields on focus: border becomes `--accent` and `box-shadow: var(--focus-ring)`, where `--focus-ring` is `0 0 0 3px var(--accent-soft)`. Applies to `.timely-input`, `.timely-select`, `.pill-input` (always on while renaming or adding a template) and `.auto-textarea`.
- Harada cells (`button.harada-cell:focus-visible`): 2px `--accent` outline with `outline-offset: -2px`. The grid frame has `overflow: hidden`, so the ring is drawn inside the cell.
- Block delete (`.block-action-btn`): the global 2px `--accent` outline, offset 2px. It fits inside the block's 4px inset.

---

## 3. Layout

### 3.1 App shell

`app/app.vue` renders `VApp` > `.app` (`display: grid; grid-template-rows: auto 1fr; min-height: 100vh; overflow-x: clip`) > `header.topbar` and `<NuxtPage>`. The page component (`app/pages/index.vue`) switches on the `tab` route query, read by `useNav()` (`app/composables/useNav.ts`). An unknown or missing tab shows Home. Tab clicks push history entries, so Back and Forward work. Query parameters: `tab` (home, goals, planner, visualization, configuration), `item` (id of the selected category, activity or habit) and `edit=1` (edit mode). Edit links to another screen use `link(tab, { item, edit })` or `go(tab, { item, edit })`.

`NuxtRouteAnnouncer` is mounted. Its visually hidden span measures 199px wide and is `overflow: hidden`, so the overflow probe reports it. It is not a layout issue.

### 3.2 Topbar and tabs

Desktop (above 768px):

- `.topbar`: `position: sticky; top: 0; z-index: 10; height: 64px; padding: 0 40px; gap: 32px; background: var(--bg); border-bottom: 1px solid var(--rule-2)`. Measured: 64px at 1280.
- `.brand`: "timely", lowercase, `--fs-lg` 600, `-0.01em`, `--ink`.
- `.tabs`: `flex: 1; height: 100%; gap: 24px;` `overflow-x: auto` with the scrollbar hidden. Order is Home, Goals, Planner, Visualization, then Configuration (transitional, no number; slice 3 removes it).
- `.tab`: 15px 500, `--ink-3`; hover and selected `--ink`. Height 100% of the bar. Each tab carries `.tab-num` (`01` to `04`, 12px 400, tabular, `aria-hidden`).
- Active indicator: `.tab::after` is a 2px bar in `--accent`, `left:0; right:0; bottom:-1px`, scaled from `scaleX(0)` to `scaleX(1)` over 0.18s on `[aria-selected="true"]`.
- `.theme-toggle`: 36x36, radius 6, icon 18px, `--ink-3`; hover `--bg-3` and `--ink`. It is the last flex item, so it sits at the right edge.

Phones (768px and below):

- `.topbar` wraps: `height: auto; padding: 12px 16px 0; gap: 0 16px`.
- Row one: `.brand` (flex 1) and the theme toggle (`order: 2`).
- Row two: `.tabs` at `order: 3`, `flex-basis: 100%`, `height: 44px`, gap 24px. `.tab-num` is hidden.
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
| 1024px | `main.css` | `.view` padding; Configuration to one column |
| 768px | `main.css` | Topbar wraps; page title 18px; week grid min width 480px; year grid min width 360px; metrics one column; goal rows and category rows compact; Visualization defaults to monthly chart (JS, `window.innerWidth < 768`) |
| 600px | `HaradaView.vue` (scoped) | Harada grid to two columns; centre cell first, full width |
| 480px | `main.css` | Floating menus dock to the bottom edge; block meta hidden; template delete shows only the glyph |
| `(hover: none)` | `main.css` | Block hover actions hidden on touch devices |

JS also reads `window.innerWidth <= 480` in `PlannerView.vue` to place menus (`openActionBarAt`, `openMenuAt`).

### 3.5 Phone behaviour at 400px

Measured with a headless Edge run against the production build, 400px wide, on each tab. The document never scrolls horizontally (`scrollWidth - clientWidth = 0` on every tab).

| Area | Behaviour |
| --- | --- |
| Topbar | Two rows, 93px, sticky. Tabs fit on one line. |
| Goals | Single column. Harada grid two columns; the centre ambition cell spans both columns first. Habit rows stack. |
| Planner | The week grid keeps its 56px label column plus seven day columns with a 480px minimum width. It scrolls horizontally inside `.week-scroll-wrap` (measured overflow 112px). Blocks show only the activity name. Selection and activity menus dock to the bottom edge. Block hover delete is hidden. Template delete shows only the glyph. |
| Year grid | Fits: min width 360px inside `.year-grid-scroll`, available width about 368px. |
| Visualization | Default monthly chart (about 500px wide) scrolls horizontally inside `.chart-scroll`. Metrics stack in one column. |
| Configuration | Single column. Category hours hidden; move and delete controls always visible (no hover reveal). |

Rule: only tables, the week grid and charts may be wider than the viewport, and each is in its own `overflow-x: auto` container. Everything else must wrap or stack.

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
- Used for "Week by week" (open by default) and "Year by category" (closed) on Visualization.
- Habit "Details" is not a disclosure; it is a text toggle button (4.11).

### 4.4 Buttons

Base `.btn`: inline flex, centred, gap 8px, height 36px, padding 0 16px, radius 6px, 1px transparent border, 13px 500, `--ink-2`, `white-space: nowrap`. Transition 0.12s on background and colour.

| Variant | Class | Default | Hover | Notes |
| --- | --- | --- | --- | --- |
| Quiet (default) | `.btn` | Transparent, `--ink-2` | `--bg-3` background, `--ink` | Cancel and other low-emphasis actions |
| Outline (secondary) | `.btn-outline` | 1px `--control-border` border, `--ink` | Border `--ink-3`, transparent background | Selection bar "Edit" |
| Primary | `.btn-primary` | `--accent` background, `--on-accent` text | `--accent-deep` | One per group. Disabled keeps the accent fill at 0.45 opacity. |
| Destructive (quiet) | `.btn-danger` | `--danger` text | `--danger-tint` background | "Delete", "Delete template" |
| Small | `.btn-sm` | 32px high, padding 0 12px | | Selection bar, new template |
| Extra small | `.btn-xs` | 26px high, padding 0 8px, 12px text | | Category move and delete, template delete |
| Block | `.btn-block` | width 100% | | Configuration forms |
| Disabled | `:disabled` | Opacity 0.45, hover reset | | Quiet and outline lose their hover; primary keeps its accent fill at the same 0.45 opacity |

Vuetify buttons (`v-btn`) are used in the Goals view only: "Load starter grid" (primary, flat, `mdi-sprout-outline`), "Add habit" (primary, flat, `mdi-plus`, disabled while empty), and "Remove" in habit details (text, error colour, small, `mdi-delete-outline`). `main.css` neutralises them: `font-family: inherit`, `text-transform: none`, `letter-spacing: normal`, radius 6px.

Rules: one primary action per block. Destructive actions are text-coloured, never filled red. Icon-only buttons need `aria-label`.

### 4.5 Chips (`.chip`, `.chip-add`)

- `.chip`: 32px high (28px in the Visualization focus strip), padding 0 12px, radius 6px, 1px transparent border, `--bg-3` background, `--ink-2` 13px text, max width 220px with ellipsis.
- States: default; hover `--bg-4` background and `--ink`; selected via `data-active="true"`: `--accent-soft` background, 1px `--accent` border, `--ink`.
- Inside a chip: `.dot` (colour, with a `--control-border` ring so dark colours stay visible), name, and `.pill-count` (12px `--ink-2`, tabular).
- `.chip-add`: accent-coloured text link, 13px 500, underline on hover. Used for "+ New template".
- Contrast: `.pill-count` uses `--ink-2`: 7.59:1 on the selected tint (`--bg-4`) and 8.51:1 on the default chip (`--bg-3`), light. `--ink-3` measured 3.80 and 4.27 there.

Template switcher (`.template-switch`, Planner):

- Wrapping row, gap 8px, bottom margin 24px. Starts with a "Template" label (13px 400, `--ink-3`).
- Each template is a `.chip`. Its colour dot is a button: a click opens `.color-pop`. A double-click on the chip opens rename.
- Rename uses `.pill-input` (32px high, 150px wide, accent border, always with the focus ring). Enter or blur commits; Escape cancels.
- "+ New template" opens `.new-template-form` (pill input and `.btn-sm.btn-primary` "Add"). Escape closes.
- Delete (`.delete-template-btn`, `.btn-xs.btn-danger`) is pushed to the right with `margin-left: auto`. It is shown when there is more than one template. It calls the native `confirm()` before deleting. On phones only the glyph shows.

Paint tools (`.paint-tools`, Planner year section): same chip style, with a `.dot` per template and an "Erase" chip (`.dot-erase`: bg fill with a 1px `--control-border` ring). Selected chip uses `data-active`.

### 4.6 Colour popover (`.color-pop`)

- Absolute, top at `calc(100% + 8px)`, width 232px, grid of 8 columns with 6px gaps, padding 12px, `--bg` background, 1px `--rule` border, radius 6px, `--shadow`, z-index 20.
- Swatches: 20x20 circles from `DESIGN_COLORS`. Active swatch uses `box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--accent)`.
- Inline variant (`.color-pop-inline`) is static, no shadow, full width. Used in the new-category form.
- Closes on outside click (the view and popover handlers stop propagation).

### 4.7 Form fields (`.field`, `.field-label`, `.timely-input`, `.timely-select`, `.pill-input`)

- `.field`: column, gap 6px. `.field-label`: 13px 500, `--ink-2`.
- `.timely-input`, `.timely-select`: 36px high (40px on phones), padding 0 12px, 1px `--control-border` border, radius 6px, `--bg` background, 13px text. Placeholder `--ink-3`.
- Focus: accent border and `--focus-ring`.
- `.timely-select`: `appearance: none`, right padding 32px, chevron drawn with two linear gradients in `--ink-3`.
- `.form-row`: two columns, collapsing to one at 768px. `.form-stack`: column, gap 12px.
- `.form-note`: 13px, `--ink-3`, top margin 12px.
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
- Font size: 15px by default. Ambition and 5-year goal fields override it to 16px (`HaradaView.vue`).

### 4.9 Goals (Harada), `app/components/harada/HaradaView.vue` (scoped)

Page: `h1` "The best version of me", lede explaining the grid. Layout: ambition field (`.ambition-edit`, max width 720px), the 3x3 grid, then the selected category panel.

Grid (`.harada-grid`): 3 columns with `gap: 1px` on a `--rule` background, `border: 1px solid var(--rule)`, radius 6px, `overflow: hidden`. The gap is the hairline. Order is 4 categories, centre, 4 categories.

Cell anatomy (`button.harada-cell`): column flex, gap 12px, min height 128px, padding 24px, background `--bg`, left-aligned.

- `.cell-num`: "01" to "08", 12px 600, `--accent`, tabular.
- `.cell-title`: category name, 15px 600, line height 1.35.
- `.cell-hint` (optional): 12px `--ink-2`, from the seed hint text.
- `.cell-status`: 12px 500, `--warn`, "To define" when the category target is flagged. Its minimum height is reserved (1.25em) and it is pushed to the bottom with `margin-top: auto`, so titles line up across the grid.

States:

- Default: `--bg`.
- Hover: `--bg-3` background. Focus-visible: 2px inset `--accent` ring (see 2.8). Focus does not change the background, so the selected tint stays.
- Active (selected category): `--bg-4` background and a 3px `--accent` bar on the left edge (`::before`). Also `aria-pressed="true"`.
- Empty slot (fewer than eight categories): `div.harada-empty`, `--bg-2`, `aria-hidden`.

Centre cell (`.harada-centre`, a plain `div`): `--accent` background, `--on-accent` text, centred. Label "Ambition, N years" (`.cell-num`, solid `--on-accent`: 8.57:1 light and 7.96:1 dark on the accent) and the statement (15px 500, line height 1.45). The former 75% opacity measured 5.60:1 light and 4.89:1 dark; the solid token replaces it.

Phones (600px and below): two columns; the centre cell is moved first (`order: -1`), spans both columns, and has `min-height: 100px`.

Panel (`.harada-panel`, top margin 32px):

- Head: kicker "Category N of M" (13px `--ink-3`), title `.harada-panel-title` (18px 600), then a Vuetify `v-tabs` (`density="comfortable"`, primary colour, tabs with no minimum width, 8px horizontal padding, first tab with no left padding, letter spacing 0): "5-year goal", "Daily habits", "1-year target".
- Body: `v-window` with top padding 24px. Goal and target use `AutoTextarea`. Target has a "Target still to be defined" checkbox (`v-checkbox`, compact).
- Foot (`.harada-panel-foot`): top margin 24px, top padding 24px, `border-top: 1px solid var(--rule-2)`. Lines: "Habit time: X h scheduled per week against Y h asked by the habits" (or "no measured habits yet"), then "Z h a week across all activities in this category". Both 13px tabular, `--ink-2` and `--ink-3`.

### 4.10 Habit list (`app/components/harada/HabitList.vue`, scoped)

Row (`.habit-row`): column, gap 4px, padding 16px 0, `border-bottom: 1px solid var(--rule-2)`. The list has no box.

- `.habit-main`: flex row. `AutoTextarea` (`.habit-name`, fills the row, `aria-label="Habit name"`) and the "Details" toggle.
- "Details" toggle (`.habit-toggle`): 13px 500, `--accent`, padding 4px 8px, top margin 8px, hover `--bg-3`. Text switches to "Done" while open, with `aria-expanded`.
- `.habit-meta` (13px, `--ink-3`, `·` separators): "About N a week", then "N h a week scheduled" when linked, or "Not linked to an activity" in `--warn`.
- Details (`.habit-controls`, open one at a time): wrapping row, gap 8px, top margin 12px. Count (max 96px), Period (`per day`, `per week`, `per month`; min 140px), Minutes each (`min` suffix, max 140px), Linked activity (clearable, min 180px, grows), and Remove (Vuetify text button, error colour).
- Empty: `.habit-empty` "No daily habits yet for this category." (`--ink-3`).
- Add (`.habit-add`): top margin 24px, wrap, gap 8px. A Vuetify text field ("New daily habit") grows (min 220px) and "Add habit" is a primary button, disabled when the field is blank. Submit is by Enter.

### 4.11 Visualization (`app/components/viz/VisualizationView.vue`)

Read-only (FR-VIZ-1). Replaces the Insights view in slice 1. The only controls are the year (`YearNav`, the same selected year as the Planner grid), the projection horizon (a select stored in `settings.projectionDefaults.years`), Weekly or Monthly, and the category focus chips.

Page: "Where your time goes". Toolbar, then sections in this order: the year metrics, goals vs. planned overview, week by week, year by category.

**Goals vs. planned time** (overview for all categories, FR-VIZ-6; the primary view is the Goals detail). Each name links to its category in Goals. Section lede explains the tick and the quiet line. Each row (`.goal-row`) is a grid: name (minmax 140 to 220px), track (fluid), figures (auto). Row divider `--rule-2`, first row no divider.

- `.goal-name`: 15px 500.
- `.goal-track`: 6px high, radius 3px, `--bg-3`. `role="img"` with an `aria-label` that spells out scheduled and target hours.
- `.goal-fill`: `--accent`, radius 3px, width proportional to the largest value across all rows.
- `.is-untargeted` track: fill becomes `--ink-4` (grey) when there is no target.
- `.goal-target` tick: 2px wide, `--ink-2`, extends 4px above and below the track. Shown only when a target exists.
- `.goal-figures`: 13px `--ink-2`, right aligned, tabular. Values: "X / Y h" with a target, "X h scheduled" without, "—" for none. `.goal-total` (12px `--ink-3`, block) adds "Z h scheduled in total" when there are activities.
- `.goal-flags` (12px `--ink-3`, `·` separators, spanning the second column): "No target yet", "No time planned", "N habits not linked to an activity". One line per row, only for what is missing.
- Mobile: track moves to its own full-width row; flags full width.

**The year.** Lede: "2026, each week under the template that governs it."

- Metrics (`.metrics`, three columns; one column at 768px and below). Each `.metric`: `.metric-value` (28px 600, tabular, `-0.01em`, unit `h` at 13px 500) above `.metric-label` (13px, `--ink-3`). Values: planned hours in the selected year (the sum of the week chart), the daily average of the leading category over the year (`h/d`), and the top projected activity over the horizon (`projectionInsight` sentence). Empty: "—" and "No projection yet."
- "Week by week" disclosure (open): toolbar (lede left; segmented control right), focus strip of chips (All plus each category), SVG chart in `.chart-scroll`, and a legend (`.chart-legend`).
- Segmented control (`.segmented`): track `--bg-3`, padding 2px, radius 6px. Buttons 28px high, 13px `--ink-3`; selected has `--bg` background, `--ink`, 600.
- Chart: viewBox matches width. Weekly: 52 bars, 12px wide with 4px gaps, left axis 44px, plot height 180px, bottom 28px for labels. Monthly: 12 bars, 28px wide with 10px gaps, value = average hours per week within the month. Y ticks at 0, 42, 84, 126, 168 h (168 = hours in a week). Tick labels 12px `--ink-3`, tabular. Grid lines `--rule-2`.
- Segments: category colour softened with `color-mix(in srgb, <colour> 80%, var(--bg))`, stacked by hours (largest at bottom). Corner radius 1px (weekly) or 2px (monthly).
- Focus: a chip selects one category; the other segments drop to opacity 0.12.
- Empty week: full-height `--bg-3` bar (`.chart-empty`).
- Current-week marker: a 3px accent bar 5px above the current bar (monthly: current month).
- Legend: dot, name, `N h/wk` (average per week of the selected year).
- Unassigned weeks have no applied template. They use the active template and draw at 45% opacity; a note under the legend names that template (FR-VIZ-3).
- Year by category (closed disclosure, FR-VIZ-4): rows (`.total-row`) with dot, name (a link to Goals), planned hours in the year and a percentage of planned hours. Percentages use largest remainder, so they add up to 100.

### 4.12 Planner week grid (`app/components/planner/PlannerView.vue`, styles in `main.css`)

Constants: `HOUR_PX = 28` in the script and `height: 28px` on `.hour-cell` and `.slot` in CSS. These two must change together.

Frame (`.week`): 1px `--rule` border, radius 6px, hidden overflow, `--bg`. Inside `.week-scroll-wrap` (horizontal scroll on phones).

- Header (`.week-head`): grid `56px` plus seven equal columns, `--bg-2`, bottom rule. Each `.wday` has 12px padding and a `--rule-2` right divider. `.day-name` 13px 600. `.day-hours-label` 12px `--ink-3`, e.g. "20 h". Clear day (`.day-clear`): 20px circle with ✕, opacity 0 until the column header is hovered or the button is focused; hover shows `--danger-tint` and `--danger`.
- Body (`.week-body`): grid with the same columns. `.hour-col` is `--bg-2` with a right rule. Labels every 3 hours (`12AM`, `3AM`, …), right aligned, `translateY(-8px)` so they sit on the line.
- Day columns (`.day-col`): relative, right rule. Slots (`.slot`, 28px) are the mouse and touch targets. Every third slot (`.slot.major`) has a `--rule-2` top border.
- Selecting (`.week.selecting`): slots show `ns-resize` cursor.

Selection (`.slot-selection`): absolute, full column width, `--accent-soft` fill, 1px `--accent` border, radius 6px, opacity 0.9, `pointer-events: none`. Duration pill (`.selection-duration`): centred, 12px 600 `--accent` on `--bg`, padding 1px 6px, radius 4px. While resizing or editing: opacity 1 and a 2px accent ring.

Resize handles (`.resize-handle`): full width, 14px tall, centred on the top and bottom edges (-7px). Visible part is a 28x4 pill in `--accent`, `--accent-deep` on hover or while resizing, with a 1px `--bg` ring. `touch-action: none`.

Resize confirm (`.resize-confirm`): top right of the selection. Two 24px circles: cancel (`--bg` with a 1px `--control-border` ring, ✕) and validate (`--ok` background, `--bg` text, ✓). Cancel hover uses danger colours.

Blocks (`.block`): absolute, 4px inset from the column edges, padding 4px 8px, radius 6px, `overflow: hidden`, `user-select: none`.

- Fill: `color-mix(in srgb, var(--c) 20%, var(--bg))`. Hover: 30%.
- Edge: `box-shadow: inset 3px 0 0 var(--c)`, solid activity colour on the left.
- Text: `.block-title` 13px 600, line height 1.25, `--ink`; `.block-meta` 12px `--ink-2`, tabular, time range such as "8AM–12PM".
- Size rules: under 40px tall hides the meta line (`.block-sm`); under 24px uses 12px title (`.block-xs`). On phones (480px and below), meta is always hidden and padding is 3px 6px.
- Hover delete (`.block-actions`): top right. The button (`.block-action-btn`) is 24px, with a 20px visible disc drawn in `::before` (1px `--control-border` border, `--bg`). The ✕ glyph is `--ink-2`, 12px. Hover is `--danger-tint` and `--danger`. Keyboard focus uses the global 2px `--accent` outline. Hidden on touch devices (`hover: none`). Blocks are edited by tapping on touch.
- Colour comes from the activity (`--c` is set inline from `activityMap`), falling back to `#999`.

Interaction: on desktop, press on an empty slot, drag down or up within one day, then release. The action bar opens near the pointer. On touch, a tap on a slot selects one hour; a tap on a block selects that block; movement beyond 8px counts as scroll.

Selection action bar (`.selection-bar`, fixed, teleported, min 232px and max 280px, padding 16px, 1px `--rule` border, radius 6px, `--shadow`):

- Head: day (600 `--ink`), range, duration (600 `--ink`).
- Hint (12px `--ink-3`): "Pick an action below, or use Edit to adjust the range."
- Actions (wrapping, gap 6px, each grows to fill): "Apply…" or "Change…" (primary), "✎ Edit" (outline), "Delete" (danger, only when the range already has an activity), "Cancel" (quiet).
- Phones: docked to the bottom edge, 12px from the sides, 16px from the bottom.

Activity menu (`.slot-menu`, same frame as the action bar, max height of list 340px):

- Head: day and range. List: one `.slot-menu-chip` per activity (dot, name, `N h` for this template, hover `--bg-3`), then a divider (`.slot-menu-divider`), then "Clear slot" (`--ink-2`).
- Overlay (`.slot-menu-overlay`, fixed, transparent, z 29) closes on click or right click.

Stats row (`.week-stats`): wrapping, gap 8px 24px, top margin 16px. Each `.stat`: dot and activity name in `--ink-2`, value 600 tabular `--ink` with an `h` unit in `--ink-3`.

Year painter (`section.section`):

- Head: `.section-title` "Year" and lede "Choose a template, then click or drag across weeks to assign it." Right: the year switcher (below), then `.year-count`, "N of 52 weeks assigned" or "N of 53" (13px `--ink-3`, tabular).
- Year switcher (`.year-controls` > `.year-nav`): stepper buttons `.year-step`, 28x28px, 1px `--control-border` outline, radius 6px, `--bg` fill, `--bg-3` on hover, 50% opacity while disabled (before mount). Labels "Previous year" and "Next year" are `aria-label`s; the glyphs are ‹ and ›. The year (`.year-label`, 15px 600, tabular) sits between them. Focus uses the global outline.
- Paint tools (above, section 4.5).
- Months (`.year-months`): 12 columns, 12px `--ink-3`, max width 520px.
- Grid (`.year-grid`): 13 columns, 3px gaps, max width 520px. Four rows of 13 covers 52 weeks.
- Cells (`.week-cell`): square (`aspect-ratio: 1`), radius 3px, number 12px tabular, centred.
  - Open: 1px inset `--rule` outline, `--ink-3` number. Hover: `--bg-3` background, `--ink`.
  - Painted (`.is-filled`): `color-mix(in srgb, var(--c) 16%, var(--bg))` background, no outline, `--ink-2` number.
  - Current week (`.is-current`): 1px inset `--accent` outline, `--accent` number, 600.
- Mouse: press paints the week, dragging paints over others. Erase paints `null`.
- Readout (`.week-readout`, 13px `--ink-2`, top margin 12px): "Week N · template name", or "unassigned, click to paint" in `.muted` italic while hovering.
- Phones: months and grid have a 360px minimum and scroll inside `.year-grid-scroll` if needed. At 400px they fit.

Not supported: touch painting of weeks, and keyboard operation of the grid (see gaps).

### 4.13 Configuration (`app/components/planner/LegendView.vue`)

Page: "Categories". Layout `.config-grid`: left column (`minmax(0, 1fr)`) with the lists, right column (340px) with the forms. Gap 48px. Stacks at 1024px with gap 32px.

**Category rows** (`.cat-row.cat-row-category`): grid `20px | 1fr | auto | auto`, gap 16px, padding 12px 0, `border-bottom: 1px solid var(--rule-2)`.

- Swatch (`.big-swatch`): 20px circle, inset 1px ring, opens the colour popover (4.6). Button with `aria-label="Change colour"`.
- Name block (`.cat-name-wrap`): name (`.cat-row-name`, 15px 500, ellipsis) and `.cat-meta` (12px `--ink-3`): "N activities · M habits".
- Rename: double-click the name. An underlined input (`.cat-name-input`, accent underline, no box) takes over. Enter or blur saves. Empty names are ignored.
- Hours (`.cat-hrs`, 13px `--ink-3`, tabular): "N h/wk · M h/yr", numbers in 600 `--ink`. Hidden on phones.
- Actions (`.cat-actions`): move up (↑), move down (↓), delete (✕), each `.btn-xs` 28px wide. Hidden until the row is hovered or a button is focused. Disabled arrows stay invisible. Always visible on phones.
- Removal panel (`.cat-remove`): appears under the row when the category holds content. Background `--bg-2`, 1px `--rule` border, radius 6px, indented 36px. Text: "Its N activities and M habits must move to another category before X is removed." A select (`.timely-select`) of other categories, "Move and remove" (`.btn-xs.btn-primary`) and "Cancel". With no other category: "Add another category first, then remove this one." Empty categories are removed at once.
- Note under the list when more than eight categories: "Only the first 8 categories appear in the Goals grid. The others still work in Planner and Visualization." (`.config-note`, 13px `--ink-3`).

**Forms** (right column, `.form-section` separated by a rule and 32px spacing):

- "New category": live preview (`.new-cat-preview`, colour at 14% tint, dot, name, 15px 500; placeholder label "New Category"), name field (placeholder "e.g. Wellness"), colour popover inline (`.color-pop-inline`), primary block button "Add category" (disabled until a name is typed). Enter in the name field submits.
- Projection moved to Visualization (4.11).

### 4.14 Charts and legends (summary)

- Charts are hand-written inline SVG. No charting library is used. Chart.js is not a dependency (the PRD named it).
- Colour: category colour, softened (see section 5). Labels: 12px `--ink-3`.
- Every chart has a text legend or a table beside it. Colour is never the only carrier of meaning.

### 4.15 Floating menus

`.slot-menu`, `.selection-bar`, `.color-pop`: `--bg` background, 1px `--rule` border, radius 6px, `--shadow`. The first two are fixed and teleported to `body` so they are not clipped by the grid. Keep this pattern for any new floating element.

---

### 4.16 Home placeholder (`app/components/home/HomeView.vue`)

- Page header: "Home", a one-line lede saying the day overview comes in a later update, and today's date as `p.page-meta`. The date is client only (null until mounted, FR-DATE-6).
- Two quiet inline links, to Planner and Goals, built with `useNav().link`. Links use `--accent` and underline (global `a` rule in `main.css`).
- Replaced in slice 4 by the Day, Week and Month overview (FR-HOME-1 to 10).

### 4.17 Planner activities (`app/components/planner/PlannerView.vue`, `.act-*` in `main.css`)

Placed between the template bar and the week grid (slice 2a). The 24x7 activity grid (slice 2b) goes between this section and the year. Section title "Activities"; lede "Hours are for {template}, the template being edited. Select an activity to see its detail."

- Layout (`.act-layout`): two columns of `minmax(0, 1fr)`, gap 48px. The list is on the left; the detail is on the right, with a 1px `--rule-2` left rule and 32px padding. At 768px and below it is one column, driven by `data-selected`: with an activity selected only the detail shows, with "Back to list" (`.act-back`, phones only); with none only the list shows.
- Rows (`.act-row`, a button with `aria-pressed`): 44px minimum height, grid `16px | 1fr | auto`, 1px `--rule-2` bottom rule. Hover `--bg-3`. Selected `--bg-4` with a 3px `--accent` inset bar. Name 15px 500; meta 12px `--ink-3` ("CODE · category"); hours 13px `--ink-2`, tabular, "h/wk".
- Empty list: "No activities yet. Add one to plan when it happens." (`.act-empty`).
- Add (`.chip-add` text link "+ Add activity", `.act-add-trigger`) reveals `.act-add`: name, short code and category (a two-column row), colour (`.color-pop-inline`), primary "Add activity" (disabled until a name and a code are typed) and quiet "Cancel". Enter submits; Escape closes. Errors (`.field-error`, 13px `--danger`, `aria-invalid`) show after submit. Adding selects the new activity.
- Detail head (`.act-detail-head`): "Back to list" (phones), colour dot and name (`h3.act-detail-name`, 18px 600), and "Edit" (`.btn-sm.btn-outline`, named "Edit {name}"). In edit mode "Done" (`.btn-sm.btn-primary`) replaces it; Done returns focus to Edit.
- View mode (`dl.act-facts`, 120px label column, 13px): short code; category (link to Goals); colour (palette name, or "Custom (#hex)"); hours ("N h a week in {template}", then the quiet line "Also N h in {other}"); habits (names of the linked habits, or "None linked yet." and "Link habits in Goals"). No inputs.
- Edit mode (`.act-edit`, `.form-stack`): name, short code (max 3, `.timely-input`), category (`.timely-select`) and colour (inline palette, the active swatch ringed). Changes apply at once (FR-UX-6). A clash or an empty name shows a `.field-error` line and is not applied; leaving the field restores the last accepted value and keeps the message until the next valid entry. Escape closes the delete confirmation first, otherwise leaves edit mode.
- Delete (`.act-delete`, below a 1px rule): "Delete activity" (`.btn-sm.btn-danger`) opens `.act-confirm` (`--bg-2` panel, 1px `--rule` border, radius 6px). It states the impact in one sentence ("Clears 29 h in 3 templates and unlinks 1 habit." or "Nothing is scheduled or linked to it."), then "Delete" (`.btn-sm.btn-danger`) and "Cancel" (`.btn-sm`). Focus opens on Cancel; Escape cancels; nothing changes before Delete. No `confirm()`.
- Swatches are 20px, as in the category popover (see section 6 on touch targets).

## 5. Colour handling for categories and activities

- **Palette.** `DESIGN_COLORS` in `app/utils/planner.ts` holds 16 swatches: terracotta, ochre, sage, teal, plum, slate, rose, moss, navy, cream, brick, pine, dusk, stone, coral, ink. These are data, offered for categories, activities and templates. The first one (`#d97757`, terracotta) is the default for a new category. This is a category colour. It is **not** the UI accent, which is blue. The comment above the array still says "Editorial muted palette used by the design system"; that comment predates the blue palette and is stale. The `fg` field in each entry is not used by the UI.
- **Seed colours.** Seeded categories and activities use their own muted hex values (for example `#7a9471` for Physical, `#3c4b63` for Deep Work). They are not guaranteed to be in `DESIGN_COLORS`.
- **Softening rule.** Colour is never used at full strength for large areas:
  - Planner block fill: 20% colour over the page (30% on hover), with a 3px solid left edge at full colour. Text is always `--ink`.
  - Year cell fill: 16%.
  - New-category preview: 14%.
  - Chart segments: 80% colour over the page. The 80% rule applies to every segment, so the legend and the focus strip are the way to read them.
- **Contrast of block text** (computed over the 16-swatch palette, worst case): `--ink` on the 20% tint is 10.77:1 light and 9.81:1 dark; on the 30% hover tint, 8.68 and 7.51. `--ink-2` (block meta) on the 20% tint is 6.40 light and 7.21 dark; on the 30% tint, 5.16 and 5.52. All pass 4.5:1.
- **Chart segments** at 80% colour are 1.57:1 light and 1.20:1 dark against the page. That is below the 3:1 for non-text graphics (see gaps).
- **Dots** are solid colour with a 1px inset ring of `--control-border`, so pale swatches stay visible on white and dark swatches stay visible on the dark chips. Measured ring contrast: 3.26:1 minimum light and 3.44:1 minimum dark, on every surface a dot sits on.
- Hard-coded fallbacks (`#ccc`, `#888`, `#999`, `#5d6b7a`) are used only when a colour is missing. Do not add new hard-coded colours.

---

## 6. Accessibility checklist

| Check | Status | Notes |
| --- | --- | --- |
| Body text contrast 4.5:1 or better | Pass for all text on `--bg`, `--bg-2`, `--bg-3` and `--bg-4`. Disabled buttons are the exception (see 4.4) | Measured in the DOM on all four tabs, both themes, after the fix pass. Text on tints uses `--ink-2`. Disabled "Add category" and "Add activity" are 2.44 to 3.05:1 (opacity 0.45). |
| Non-text contrast 3:1 | Pass for interactive controls (`--control-border`, 3.26:1 minimum light, 3.44 dark). Fail for chart segments | Hairline frames (`--rule`) are decorative and stay below 3:1 by design. Chart segments stay below 3:1 (open, see 10). |
| Visible focus | Pass | Harada cells: 2px inset accent ring. Block delete: global 2px accent outline. Other controls: the global 2px outline, or the accent border on fields. Checked by tabbing through each view in both themes; no stop is left without an indicator. |
| Keyboard operation | Pass for topbar, Goals, Visualization, Configuration and the Planner activity list, detail and forms (4.17). Fail for the Planner grid. | The week grid and year grid use mouse events only (`mousedown`, `mouseenter`). |
| Current tab announced | Pass | `aria-selected` on each `role="tab"`. |
| Tab panel relation | Fail | No `aria-controls` and no `tabpanel`. |
| Pressed and expanded state | Pass | `aria-pressed` on Harada cells and segmented buttons; `aria-expanded` on Habit "Details". |
| Names for icon controls | Pass | Theme toggle, colour swatches, day clear, block delete, resize handles, move and delete buttons all have `aria-label`. |
| Minimum text size 12px | Pass | Smallest text is 12px. The block delete glyph was 11px and is now 12px. |
| Touch target | Partial | Colour swatches are 20px (target guidance: 24px). Resize confirm buttons are 24px. Block delete is 24px (hidden on touch). Day clear buttons are 20px. Category arrows 28px wide, 26px high. Topbar tabs are 44px on phones. |
| Reduced motion | Not handled | No `prefers-reduced-motion` rule. Transitions are 0.1 to 0.18s and small. |
| Live regions | Not used | Save and error messages are not announced. |
| Language | Pass | `<html lang="en">`, set in `nuxt.config.ts`. |

---

## 7. Content and voice

- UI language: English. Sentence case for headings, labels and buttons. Button text is an action in the imperative ("Add habit", "Load starter grid", "Move and remove").
- User data may be in any language. Keep the layout tolerant: text wraps, names ellipsise (`.chip`, `.cat-row-name`), and nothing is sized to a fixed number of characters except the short code (max 3).
- Calm empty states. Say what is missing, then give one action where there is one:
  - "No goals yet. Start from the starter grid and adapt it." with "Load starter grid".
  - "No daily habits yet for this category."
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
- Don't add horizontal scrolling to the page body. Only the week grid, the year grid, charts and tables may scroll, each in its own container.

---

## 9. How to verify UI changes

1. Build the production bundle: `npm run build`. It must finish without errors. The output is in `.output/`.
2. Serve it: `node .output/server/index.mjs` (listens on port 3000 unless `PORT` is set). Stop the server when done.
3. Open the app in headless Microsoft Edge, for example with `puppeteer-core` and the Edge executable. Use a fresh browser context for each check so `localStorage` does not leak between runs.
4. Capture each affected tab at 1280px and at 400px, in light mode. For dark mode, set `localStorage['timely.dark'] = 'true'` before the reload and capture at least one dark screen.
5. For every capture, check:
   - `document.documentElement.scrollWidth - document.documentElement.clientWidth` is 0 (no page-level horizontal overflow).
   - Each scrolling container (`.week-scroll-wrap`, `.year-grid-scroll`, `.chart-scroll`, `.tabs`) is listed on purpose. Overflow elsewhere is a bug.
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

1. The Planner week grid and year grid cannot be operated from the keyboard, and the year grid cannot be painted by touch. Block delete buttons render only on hover, so keyboard users cannot reach them until this is fixed.
2. Chart segments (80% colour, 1.2 to 1.6:1 against the page) are below 3:1 for non-text UI. The legend and the focus strip identify them. Not fixed: a gap or outline between segments would not change a segment's contrast against the page.
3. `role="tab"` buttons have no `aria-controls` and there is no `tabpanel`.
4. Habit fields in the Goals view are Vuetify outlined fields. Their borders and labels now match the control boundary, but their heights and radii still differ from the `.timely-*` fields.
5. There is no inline error style for forms. Failed actions have no visible feedback.
6. Template delete uses the native `confirm()`.
7. Colour swatches are 20px and day clear buttons are 20px, below the 24px touch-target guidance.
8. No `prefers-reduced-motion` handling.
9. Theme is light by default and does not follow the OS setting.
10. `DESIGN_COLORS` comment is stale (says "editorial muted palette used by the design system"). The `fg` field is unused.
11. The tokens in `vuetify.config.ts` are duplicated by hand from `main.css`. `--control-border` is not mirrored there; Vuetify uses it only through the overrides in `main.css`.
12. The 16px ambition and goal text, and 12px chart text, are hard-coded rather than tokens.
13. Disabled buttons keep the 0.45 opacity rule, so "Add category" and "Add activity" are 2.44 to 3.05:1. Disabled controls are exempt; the dark one is faint but readable.

---

## 11. Verification log for this spec

- Read in full: `app/assets/css/main.css`, `app/app.vue`, `vuetify.config.ts`, `nuxt.config.ts`, `app/components/AutoTextarea.vue`, `app/components/harada/HaradaView.vue`, `app/components/harada/HabitList.vue`, `app/components/planner/PlannerView.vue`, `app/components/planner/InsightsView.vue`, `app/components/planner/LegendView.vue`. Read in part: `app/utils/planner.ts` (palette, constants, seed, state check) and `app/stores/planner.ts` (actions relevant to colour and categories).
- Contrast ratios: computed from the hex values in the code with the WCAG formula. Block tint contrast: computed over the 16-swatch palette with the same mixing as `color-mix(in srgb, …)`.
- Overflow and layout at 400px and 1280px: measured in headless Edge against the production build, all four tabs.
- Screenshots: captured from the production build at the widths listed in `spec/screens/`.
- Fix pass (section 10, items fixed): the same script ran before and after in headless Edge against the production build. Scope: all four tabs at 1280px in light and dark; Goals also with the habit and target tabs open and one habit's details open; Planner also with a block hovered; Goals and Planner at 400px in light and dark. Contrast uses computed colours, composites translucent backgrounds and opacity, and measures non-text boundaries (inputs, outlined fields, dots, swatches, icons).
- Fix pass, text: before, 9 text pairs were below their threshold (`.cell-hint` in the selected Harada cell 3.80:1; `.pill-count` 3.80 to 4.27:1; the segmented "Monthly" label 4.27:1; four habit field labels 4.29:1), plus 4 disabled-button labels. After, only the 4 disabled-button labels remain (2.44 to 3.05:1, exempt). The Harada centre label is now solid, 8.57:1 light and 7.96:1 dark (it was 75% opacity, 5.60:1 and 4.89:1).
- Fix pass, non-text: before, input and select borders were 1.25:1 light and 1.42:1 dark; Vuetify outlined fields 2.30:1 light and 3.18:1 dark; dot and swatch rings at least 1.42:1 light and 1.64:1 dark. After, inputs are at least 4.08:1 light and 4.87:1 dark, Vuetify outlines 4.08 and 4.87, and dot rings at least 3.26:1 light and 3.44:1 dark. No control boundary is below 3:1 on any view.
- Fix pass, text size: before, one glyph at 11px (block delete). After, none below 12px.
- Fix pass, focus: keyboard Tab walk on each tab in light. Before, the 8 Harada cell stops had no indicator (tint only). After, every stop has an indicator. Checked by screenshot: Harada cell (light and dark), block delete (light and dark, zoomed), topbar tab.
- Fix pass, theme before first paint: the first animation frame in dark mode had no `data-theme` before the fix. After, it is `dark`. No hydration warning and no console error or warning in any run.
- Fix pass, layout: 0px horizontal overflow at 1280px and 400px, light and dark, all tabs. `npx nuxi typecheck` exits 0. `npm run build` is clean; the existing Nuxt and Nitro warnings are unchanged.
- Not verified: `prefers-color-scheme` absence beyond code reading; Vuetify's computed `on-primary`; behaviour on real touch hardware (only emulated viewports were checked).

- Slice 1 (shell, URL state, Visualization, Home placeholder): browser run on the production build at 1280 and 400 px, light and dark, no page overflow, no console messages; dev-server run with no hydration warnings. Screenshots: `screens/home-desktop-light.png`, `screens/visualization-desktop-light.png`, `screens/visualization-mobile-light.png`.
