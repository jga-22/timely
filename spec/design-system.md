# Timely design system

Authoritative for the tokens, the modes, the area colours, the CSS architecture, the components, the motion rules, the recipes and the guards. Screens, layout, voice and the accessibility checklist stay in [frontend-design.md](frontend-design.md). The plan that set this up, with its reasoning, is [ux-design-system-plan.md](ux-design-system-plan.md). Tests that enforce the rules: `tests/unit/designSystem.test.ts` and `tests/unit/designContrast.test.ts`, run by `npm test`.

Contrast in the tables: the first number is against `--paper` (the page), the second against `--surface` (cards, inputs), both computed from the hex values in `tokens.css`. Text needs 4.5:1; boundaries, focus and planned fills need 3:1.

---

## 1. Principles and what not to build

Principles
1. **Tokens are the only source of values.** Colour, font size, space, radius, shadow, duration, easing and z-index come from `var(--…)`. Raw values live in `tokens.css`; a guard fails otherwise.
2. **CSS first, Vue only for behaviour.** A pattern becomes a Vue component only when it owns ARIA state, focus, keyboard or timing. Everything else is a class.
3. **One cascade model.** `@layer` sets the precedence; file order and specificity stop mattering. New components have no `<style>` block.
4. **State in ARIA, not classes.** Style `[aria-pressed="true"]`, `[aria-current="page"]`, `[aria-checked="true"]`, `[aria-expanded]`; a visual state with no ARIA equivalent uses `.is-*`.
5. **Motion is decoration and opt-in.** Every keyframe animation sits under `:root[data-motion="lively"]`. Calm and reduced motion keep every number, line and state.
6. **Area colours are user data.** They pass `fillFor` (3:1 on both surfaces) and reach CSS only as `--c` and `--c-ink`.
7. **Grow by need.** A primitive is built in the slice that first needs it, from the recipe in section 8, and lands in the style guide the same day.

Do not build
- No component library: no `UiButton`, `UiCard`, `UiChip`, `UiBadge`, `UiStack`, `UiText` wrappers. A class does it.
- No CSS-in-JS, Tailwind, Sass, PostCSS plugins, or token build pipeline (Style Dictionary, JSON to CSS).
- No Histoire or Storybook. No stylelint for now; the Vitest guards cover the rules.
- No global announcer service. Inline `role="status"` stays; a toast is the only global live region (when first needed).
- No theme engine beyond `data-theme`, `data-motion`, `data-choice` and `data-part` on `<html>`.
- No icon library and no icon font.
- No component unit tests (there is no DOM environment); primitives are checked on the style guide page in the browser.

---

## 2. Tokens

### 2.1 Tiers

All tokens are defined in `app/assets/css/tokens.css` (tiers 1 to 5) and, for old names, `app/assets/css/tokens-legacy.css`.

| Tier | Where | Naming | Who may use it |
| --- | --- | --- | --- |
| 1 Primitive | `tokens.css`, `:root` (first block) | hue and step: `--stone-50`, `--blue-600`, `--night-0`, `--sand-100`, the time-of-day tints (`--peach-100`, `--sage-100` and so on) | only the semantic tokens in `tokens.css` |
| 2 Semantic | `tokens.css`, `:root` (light) and `html[data-theme="dark"]` (dark) | role: `--paper`, `--surface`, `--ink-2`, `--accent-soft`, `--elev-1` | every CSS file |
| 3 Time of day | `tokens.css`, `html[data-part]` | `--am-1`, `--am-2` only | the page background tint |
| 4 Scales | `tokens.css`, `:root` | type `--text-*`, space `--sp-*`, radius `--radius-*`, motion `--dur-*` and `--ease-*`, `--z-*`, sizes `--hit`, `--icon` | every CSS file |
| Component | the CSS file of the block, on its root selector | `--<block>-<prop>` | that block |

Old names (`--bg`, `--rule`, `--fs-md`, `--space-5` and so on) are aliases in `tokens-legacy.css`, kept until their last use is gone (section 10).

Local custom properties set by components are not tokens: `--c` and `--c-ink` (area colour, section 4), `--d` (animation delay), `--fill`, `--v`, `--i`, `--p`. The guard only checks that every `var()` resolves.

### 2.2 Colour roles

Light value and dark value of each semantic colour. The dark theme changes these roles only; primitives never change.

| Token | Light | Dark | Use | Contrast light (paper / surface) | Contrast dark (paper / surface) |
| --- | --- | --- | --- | --- | --- |
| `--paper` | `#f4f2ec` | `#121417` | The page background | | |
| `--surface` | `#fffefb` | `#1b1e23` | Cards, inputs, menus, empty planned time | | |
| `--surface-2` | `#ebe8e0` | `#23272e` | Tracks, the segmented control, quiet columns | | |
| `--surface-hover` | `#ebe8e0` | `#23272e` | Hover on a row or a menu item | | |
| `--ink` | `#1c2026` | `#eceae4` | Primary text | 14.61 / 15.34 | 16.22 / 13.89 |
| `--ink-2` | `#434951` | `#c3c6cc` | Secondary text: labels, meta, figures | 8.12 / 10.78 | 9.01 / 9.76 |
| `--ink-3` | `#5c626b` | `#9ea3ab` | Muted text: hints, hours, counts | 5.49 / 7.28 | 6.10 / 6.59 |
| `--ink-inverse` | `#f4f2ec` | `#121417` | Text on `--ink` (tooltip, toast): 14.61 light, 15.34 dark | — | — |
| `--line` | `#e2ded4` | `#2c3138` | Dividers and decoration. Not a control boundary | decorative | decorative |
| `--line-2` | `#ebe8e0` | `#23272e` | Quieter dividers | decorative | decorative |
| `--track` | `#cdc7b9` | `#4a505a` | The track of a ring: visible at 0 of N (decorative, no 3:1 need; the figure is in the text) | decorative | decorative |
| `--control-border` | `#5c626b` | `#9ea3ab` | Boundary of inputs, outline buttons, ticks | 5.49 / 6.10 (3:1 met) | 7.28 / 6.59 |
| `--accent` | `#2a55c4` | `#9ab8f5` | Links, the primary action, the current item | 5.87 / 6.52 | 9.27 / 8.39 |
| `--accent-hover` | `#1f439c` | `#b5cdf1` | Hover on the primary action | 8.01 / 8.89 | 11.39 / 10.32 |
| `--accent-ink` | `#ffffff` | `#0e1321` | Text on `--accent` | 6.57 (on `--accent`) | 9.30 (on `--accent`) |
| `--accent-soft` | `#e4ebfb` | `#222c44` | Selected and pressed tint | decorative halo | decorative halo |
| `--accent-tint` | `#c5d4f4` | `#33456e` | The lighter accent for fills | | |
| `--warn-bg` | `#ecdcb9` | `#4a3d23` | Background of a gentle prompt | | |
| `--warn-ink` | `#5b4a24` | `#f0dfb4` | Text on `--warn-bg`: 6.33 light, 8.03 dark | 7.66 / 8.50 | 13.99 / 12.67 |
| `--danger` | `#a33a3a` | `#ee9a9a` | Destructive text | 5.82 / 6.46 | 8.54 / 7.74 |
| `--danger-tint` | `#fbefef` | `#3a2226` | Destructive hover background | | |
| `--ok` | `#2d6a4f` | `#7fc4a0` | Positive status text | 5.71 / 6.34 | 9.06 / 8.20 |
| `--focus` | `#2a55c4` | `#9ab8f5` | The focus ring (= `--accent`) | 5.87 / 6.52 | 9.27 / 8.39 |
| `--cell-empty` | `#fffefb` | `#1b1e23` | An unplanned hour, an empty week (= `--surface`) | | |
| `--cell-line` | `#5c626b` | `#9ea3ab` | Outline of an empty cell (= `--control-border`) | 5.49 / 6.10 | 7.28 / 6.59 |
| `--hatch` | 135 degree stripes in `--line` | the same in dark `--line` | Free time in the sleep and time-split views | | |
| `--am-1`, `--am-2` | `#f7e6d5`, `#e5efe1` (morning) | `#3a2c25`, `#243326` (morning) | The page tint by part of the day, section 3 | text pairs in section 2.4 | |

The text pairs the guard checks, in every theme and part of the day: `--ink`, `--ink-2` and `--ink-3` on `--paper`, `--surface`, `--surface-2`, `--am-1` and `--am-2` (4.5:1); `--accent` on `--paper` and `--surface`; `--accent-ink` on `--accent`; `--warn-ink` on `--warn-bg`; `--ink-inverse` on `--ink`; `--danger` and `--ok` on `--surface` (4.5:1). Boundaries and focus: `--control-border`, `--cell-line` and `--focus` on `--paper` and `--surface`, and `--accent` on `--accent-soft` (3:1).

Known limit: none of the text pairs fails. The teal area colour does not reach 4.5:1 for text on its own fill (section 4).

### 2.3 Type

Sizes are in rem, so the browser's font size is respected (16px at the default). Phone steps come from `clamp()` inside the token, not from feature CSS. One font family: IBM Plex Sans (400, 500, 600 only). Sentence case; no uppercase micro-labels.

| Token | Size | Use |
| --- | --- | --- |
| `--text-caption` | 0.75rem (12px) | Hour labels, chart labels, the smallest meta |
| `--text-small` | 0.8125rem (13px) | Labels, form hints, the default small button |
| `--text-meta` | 0.875rem (14px) | Meta lines, counts, status |
| `--text-ui` | 0.9375rem (15px) | Controls, dense text, the body in lists |
| `--text-body` | 1rem (16px) | Body text |
| `--text-lede` | 1.0625rem (17px) | Ledes and key lines |
| `--text-title-s` | 1.125rem (18px) | Section titles on phones, the brand |
| `--text-title-m` | 1.375rem (22px) | Medium titles |
| `--text-title-l` | clamp 24 to 30px | Section and dialog titles |
| `--text-page` | clamp 30 to 36px | Page titles |
| `--text-hero` | clamp 34 to 44px | Hero figures and focal titles |
| `--text-number` | clamp 40 to 56px | Large numbers (tabular) |

Weights: `--weight-regular` 400, `--weight-medium` 500, `--weight-bold` 600. Leading: `--leading-tight` 1.1, `--leading-snug` 1.3, `--leading-body` 1.5. Tracking: `--tracking-tight` -0.02em. Numbers that are compared or aligned use `font-variant-numeric: tabular-nums`.

### 2.4 Space and layout

4px grid, the name is the multiplier: `--sp-1` 4px, `--sp-2` 8px, `--sp-3` 12px, `--sp-4` 16px, `--sp-5` 20px, `--sp-6` 24px, `--sp-8` 32px, `--sp-10` 40px, `--sp-12` 48px, `--sp-14` 56px, `--sp-16` 64px. Layout: `--page-pad-x` 56px (18px on a phone), `--page-max` 900px, `--rail-w` 232px.

The old `--space-5` (24px) is now `--sp-6`; the names changed so the scale reads by its multiplier. Old names are aliases.

### 2.5 Radius

| Token | Value | Use |
| --- | --- | --- |
| `--radius-xl` | 28px | Cards, focal panels, dialogs |
| `--radius-lg` | 20px | Menus, sheets, the selection bar, the toast |
| `--radius-md` | 14px | Rows, notes, navigation items |
| `--radius-sm` | 10px | Inputs, buttons in a field, the tooltip |
| `--radius-xs` | 6px | Small blocks |
| `--radius-pill` | 999px | Segmented controls, chips, pills |

**Concentric rule:** a rounded box inside another uses the next token at or below the parent radius minus the parent padding (a 28px card with 16px padding gives 12px, so `--radius-sm`).

### 2.6 Elevation and focus

- `--elev-1`: cards and the current segment. `--elev-2`: menus, dialogs, the hover lift. Dark has its own values (heavier black). Hairlines are not elevation.
- Focus: `--focus` is the accent, `--focus-width` 3px, `--focus-offset` 3px. The global `:focus-visible` rule in `base.css` draws it; a component does not draw its own ring (the text-field halo, `--focus-ring`, in `forms.css`, is the one exception; section 6.1).

### 2.7 Motion tokens

| Token | Value | Use |
| --- | --- | --- |
| `--dur-fast` | 120ms | Hover, colour |
| `--dur-base` | 200ms | Switch, tick fill |
| `--dur-moderate` | 300ms | View change, toast |
| `--dur-enter` | 450ms | Rise, glide, slide |
| `--dur-draw` | 900ms | Rings, bars, paths |
| `--ease-out` | cubic-bezier(0.2, 0.7, 0.2, 1) | Most movement |
| `--ease-spring` | cubic-bezier(0.34, 1.45, 0.64, 1) | Pop, tick |
| `--ease-in-out` | cubic-bezier(0.4, 0, 0.2, 1) | Symmetric changes |
| `--stagger` | 70ms | Delay step: `calc(var(--i) * var(--stagger))` |

### 2.8 Z-index

| Token | Value | Use |
| --- | --- | --- |
| `--z-raised` | 1 | Raised items inside a block |
| `--z-sticky` | 10 | The top bar, the selection bar |
| `--z-popover` | 20 | The account menu, the colour pop, the grid box and menu |
| `--z-tabbar` | 15 | The phone tab bar: over the page and the sticky bar, under the popovers (20; the week grid box and menu are above it) |
| `--z-overlay` | 50 | The first-run screens |
| `--z-toast` | 60 | The toast (when built) |
| `--z-tooltip` | 80 | The tooltip (when built) |
| `--z-skip` | 90 | The skip link |

A native `<dialog>` sits in the top layer and needs no z-index. Inside an `isolation: isolate` block, local stacking may use 0 to 9.

### 2.9 Sizes

`--hit` 44px (the minimum target), `--hit-lg` 48px (rail items), `--tick-lg` 76px (64px on a phone), `--icon` 20px, `--icon-sm` 16px, `--dot` 10px.

### 2.10 Breakpoints

`app/utils/breakpoints.ts` is the one source: `BREAKPOINTS = { phone: 480, tablet: 768, wide: 1100 }`. CSS variables do not work in `@media`, so the widths are written literally and the guard checks each one against the list (the min-width twin is the next pixel: 769 for tablet, 1101 for wide). CSS uses only these widths plus `(hover: none)`, `(pointer: coarse)` and `(prefers-reduced-motion: reduce)`. Script: `matchesBreakpoint(name, 'max' | 'min')`, `breakpointQuery(name, side)`.

The phone rules are at 768px, which matches the focus rule in `utils/focus.ts` (a touch screen or 768px and narrower is a phone).

---

## 3. Modes

### 3.1 Theme, motion and part of the day

- **Theme:** `html[data-theme="dark"]` swaps the semantic colour and elevation tokens. Light has no attribute. Set by `useTheme()` (the top bar's theme button, the one theme control since 2026-11-05).
- **Motion:** `html[data-motion="lively|calm"]` says what runs; `html[data-choice="lively|calm"]` says what the user picked. Reduced motion (the system's `prefers-reduced-motion`) makes `data-motion` calm whatever the choice, and the choice is kept, so the Account menu still shows it. Set by `useMotion()`. The control is the Motion choice in the Account menu (Lively or Calm, with a note when the system asks for less motion).
- **Part:** `html[data-part="morning|afternoon|evening"]` swaps `--am-1` and `--am-2`. Morning from 05:00, afternoon from 12:00, evening from 17:00 and through the night (`PART_START_HOUR` in `utils/motion.ts`).
- **The Lively ambient:** under `data-motion="lively"` two soft glows, of `--am-1` and `--am-2` (the part of the day), sit fixed behind the page: the mockup's A2 look (`.ambient` in `features/shell.css`). The glow drifts (`drift` in `motion.css`). Calm hides the layer, and the page is the plain paper. The top bar has no background of its own, so the glow shows behind it. `designContrast.test.ts` checks ink, the secondary and muted text and the accent on the full tint of every part and theme (4.5:1): the centre of a glow is the worst case.
- **Before first paint:** one inline script in the head (`utils/prepaint.ts`, `PREPAINT_SCRIPT`, added in `nuxt.config.ts`) sets all four attributes. It is built from `PREF_KEYS` and `PART_START_HOUR`, so it cannot drift; `tests/unit/prepaint.test.ts` runs it against a fake storage, media query, document and clock. It gets the CSP nonce like every `<script>` (`server/plugins/security.ts`); no new script and no CSP change.

### 3.2 Preference keys

Browser preferences live in localStorage, outside the planner state (`utils/prefs.ts`). A save, a reset or a sign-out never touches them.

| Key | Stored as | Default | Read by |
| --- | --- | --- | --- |
| `timely.dark` | `true` or `false` | off (light) | `useTheme`, the prepaint script |
| `timely.motion` | `calm` or `lively` (anything else is lively) | lively | `useMotion`, the prepaint script |
| `timely.showSleep` | `1` or `0` | off | `useShowSleep` (Home, Week, Year) |
| `timely.weekClosed` | `1` or `0` | open | reserved for the Week sections (not read yet) |

The composables: `usePref(key, { fallback, parse, serialise, state? })` is the generic one (shared state, read after mount, a blocked storage keeps the fallback). `useShowSleep`, `useTheme` and `useMotion` are built on it. `useTheme` shares the state name `dark` with `usePlannerFill`, so the planned fills follow the theme.

### 3.3 Reduced motion and calm

Calm keeps every number, line, state and colour. It stops movement only: the count-up, the rings drawing, the bars growing, the sparks, the view transition, the tilt. Reduced motion forces calm and cannot be overridden by the choice.

---

## 4. Area colours

### 4.1 Planned time: the four states

One palette covers every place where time is painted: the Home timeline, the week grid, the year grid, the Year bars and the category colours. An empty hour, a planned hour, the current week and the selection look the same wherever they appear.

| State | Token or rule | Light | Dark | Use | Contrast (light / dark, on paper / surface) |
| --- | --- | --- | --- | --- | --- |
| Empty (unplanned hour, empty week, empty bar) | `--cell-empty` (= `--surface`) | `#fffefb` | `#1b1e23` | Home timeline, year cells, week grid background | Equals the card |
| Empty outline | `--cell-line` (= `--control-border`) | `#5c626b` | `#9ea3ab` | 1px hairline around every empty cell and unplanned segment | 5.49 / 6.10 (3:1 met) |
| Planned | `fillFor(colour, dark)`, served as `--c` | the colour as given when it reaches 3:1 on both surfaces; otherwise shaded toward black | as given, or lightened toward white | Planned hour, week cell, Home segment, Year segment, week block, template paint dot | 3:1 on both surfaces (guard) |
| Text on a planned fill | `inkOn(fill)` (= `--c-ink`): white or the dark paper, whichever contrasts more | `#ffffff` or `#121417` | same rule | Year cell numbers, week block names and times | 4.5 or more, except teal (4.42, section 4) |
| Current | `--accent` | `#2a55c4` | `#9ab8f5` | Year cell outline, the Home "Now" tag | 5.87 / 6.52 on paper; 6.52 / 8.39 dark |
| Selected | `--accent-soft` tint with a `--accent` frame (week grid); `--surface-hover` (year cell hover) | `#e4ebfb`; `#ebe8e0` | `#222c44`; `#23272e` | Week grid drag range and action bar; year cell hover | Accent on accent-soft: 3:1 (guard) |

The year grid has no selected week: choosing a week is a paint action, so its hover state stands in for selection.

### 4.2 The rule and the values

Life areas, activities and templates have a colour (`category.color`, `activity.color`, `template.color`). That colour is user data and is shown through one rule.

- **`fillFor(colour, dark)`** (`utils/palette.ts`) returns the colour as given when it reaches **3:1 on both surfaces of the theme** (the card and the paper), otherwise shades it toward black (light) or white (dark) in 2% steps until it does. The hue stays; only the lightness moves. `SURFACE` holds the two surfaces of each theme and equals `--surface` and `--paper` (the contrast test checks it).
- **`areaVars(colour)`** (`usePlannerFill`) returns `{ '--c': fill, '--c-ink': inkOn(fill) }`. A component writes `:style="areaVars(color)"`; CSS paints `var(--c)` and writes text on it in `var(--c-ink)`. A colour in a `background` binding is a guard violation (counted, section 9).
- **`inkOn(fill)`** is white or the dark paper, whichever contrasts more.
- **Fallbacks** for an item with no colour are the constants `FALLBACK_COLOR`, `FALLBACK_AREA_COLOR`, `FALLBACK_BLOCK_COLOR`, `FALLBACK_TEMPLATE_COLOR` and `FALLBACK_EMPTY_COLOR` in `utils/palette.ts`. No component carries a colour literal.
- **Tinted blocks.** A block may be a tint of its colour (`color-mix(in srgb, var(--c) 24%, var(--surface))`) behind `--ink` text only when the same element carries a solid `var(--c)` edge or dot that meets 3:1. Text on a solid fill uses `--c-ink`. The rule is for feature CSS; a tint is never a text pair in the guard.
- **Dots** that identify an area are solid colour with the 3:1 ring of `--control-border` where the colour is pale.

Known limit: **teal** (`#4a8683`) reaches only 4.42:1 for the best text on its fill, in both themes. The guard lists it. It was like this before the design system; lighten or darken the colour to remove it.

The palette swatches (`DESIGN_COLORS` in `utils/planner/templates.ts`) are data for categories, activities and templates. The guard checks every swatch through `fillFor` on both surfaces of both themes.

---

## 5. CSS architecture

### 5.1 Layers

`app/assets/css/main.css` is the one stylesheet Nuxt loads. It declares the layers in order and imports each file under its layer:

```css
@layer reset, tokens, base, ui, features, motion, utilities;
```

| Layer | Files | Holds |
| --- | --- | --- |
| `reset` | `reset.css` | Reset rules and the reduced-motion kill (the only place `!important` is allowed, once the guard's ratchet reaches zero) |
| `tokens` | `tokens.css`, `tokens-legacy.css` | The three tiers and the old-name aliases |
| `base` | `base.css` | `html`, `body`, headings, links, the focus ring, form defaults |
| `ui` | `ui/*.css` | Primitives, one file per block: `button`, `card`, `page`, `chip`, `field`, `menu`, `disclosure`, `empty`, `bar`, `row`, `pill`, `seg`, `icon`, `ring`, `switch`, `tick`, `dialog` (section 6) |
| `features` | `features/*.css` | One file per area: `shell`, `account`, `auth`, `legal`, `onboarding`, `entry`, `planner`, `week-grid`, `week-grid-select`, `week-panels`, `year`, `insights`, `adherence`, `home`, `styleguide` |
| `motion` | `motion.css` | Every `@keyframes`, and the lively rules that belong to no one feature |
| `utilities` | `utilities.css` | `.sr-only` (the label a screen reader reads), always winning |

A later layer wins whatever the specificity. Inside `features` the files keep their original relative order; a new feature file depends on no order, because each owns a prefix (5.3).

**Unlayered CSS beats every layer.** A Vue `<style>` block is unlayered. Sixteen legacy blocks still exist (listed in `designSystem.test.ts`); new `.vue` files have none. A block moves to its feature file when its component is next changed.

### 5.2 Ownership

- Primitives (`ui/`) own the bare block selector (`.btn`, `.card`). A feature file never restyles a bare primitive selector; it uses a contextual one (`.today-focus .btn`). The guard checks this once `ui/` exists.
- A feature file holds selectors that start with its prefix, or contextual ones.
- One owner per selector. Responsive variants of a block live in the file of that block.

### 5.3 Naming

- Primitives: short unprefixed blocks (`.btn`, `.card`, `.chip`, `.seg`, `.switch`, `.ring`, `.bar`, `.tick`, `.row`, `.pill`, `.dot`, `.ic`, `.page-head`, `.eyebrow`, `.empty`, `.sheet`, `.toast`, `.tip`).
- Variants: one hyphenated class (`.btn-primary`, `.btn-quiet`, `.card-focal`). Parts: `.card-title`, `.row-main`. No BEM double underscore or double dash.
- State: ARIA selectors first; `.is-done`, `.is-now` only where ARIA has no equivalent.
- Features: one prefix per area: `shell-`, `acct-`, `today-`, `plan-`, `wk-` (the grid, kept), `yr-`, `prog-`, `fr-`. The existing feature files keep their current selectors until they are rewritten.
- JS hooks: `data-*` attributes, never style classes.

### 5.4 Other CSS rules

- `!important`: only in `reset.css`. Four feature rules have it today (three in the onboarding intro, one in the insights view); they are counted and go away with their rewrite.
- `@keyframes` only in `motion.css`. An `animation` declaration only in a rule whose selector contains `[data-motion="lively"]`. `transition` durations only from `var(--dur-*)`.
- `@media` widths only from `BREAKPOINTS` (section 2.10).
- `z-index` only from `var(--z-*)` (or 0 to 9 locally).
- Font sizes only from `var(--text-*)`, `inherit`, `1em` or a percentage.
- Radius only from `var(--radius-*)`, `0`, `50%`, or `var(--radius)` (legacy, counted).

---

## 6. Components

Built in 0.0.2 (slice 3b). A primitive is either a class in `app/assets/css/ui/` or a Vue component in `app/components/ui/` (the Vue ones own ARIA, focus, keys or timing). Every one is in the living style guide (section 6.4) in every state. New ones follow the recipe in section 8.2.

### 6.1 Classes and Vue primitives

| Component | File | Use | Classes, props and states |
| --- | --- | --- | --- |
| `UiIcon` | `components/ui/Icon.vue`, `utils/icons.ts`, `ui/icon.css` | A glyph from the set (check, today, plan, progress, left, right, plus, moon, sun, pencil, close, brand) | `name: IconName`, `size: sm or md` (16 or 20px). Always `aria-hidden`; the name of a button is its `aria-label`. Classes `.ic`, `.ic-sm` |
| Button | `ui/button.css` | Actions | `.btn` (44px, the outline pill), `.btn-primary`, `.btn-quiet` (accent text), `.btn-danger` (text), `.btn-danger-solid` (confirm a delete), `.btn-outline`, `.btn-sm` (36px; 44px on a touch screen), `.btn-xs` (28px). Disabled: opacity 0.45. One primary per block |
| Icon button | `ui/button.css` | One icon, round, 44px | `.btn.btn-icon` with `UiIcon` and an `aria-label`; `aria-expanded="true"` tints it. `EditButton` and the year stepper use it |
| Card | `ui/card.css` | A raised panel, a focal panel, a section, an inline confirmation | `.card` (`--elev-1`, the card radius), `.card-focal` (more room, `--elev-2`), `.section` (hairline above, the section spacing), `.section-head`, `.section-title`, `.inline-confirm` and `.inline-confirm-text` |
| Page header | `ui/page.css` | The top of a view | `.view` (the page column), `.page-head`, `.page-title`, `.page-meta`, `.eyebrow`, `.lede`. The title keeps its size (`--text-title-l`) |
| Stat | `ui/page.css` | A figure with its label | `.stat`, `.stat-value` (`--text-number`, tabular), `.stat-label` |
| Ring | `components/ui/Ring.vue`, `ui/ring.css` | A percentage as a ring | `UiRing`: `value` (0 to 100, or `null` for none yet), `size` (px, default 28, the width; the height follows), `label` (given: an image with that name; absent: decorative, the figure is in the text beside it), `done` (a check in the centre), `tone` (`accent` or `ok`); the default slot is the centre text. The arc draws in under lively motion only |
| Bar | `ui/bar.css` | A share of one track; a stacked track | `.bar` with `--v` (0 to 1) and `--c` (area colour, accent by default). `.bar-stack` with a child `<i>` per part: `--i` is its weight, `--c` its colour. The call site gives `role="img"` and an `aria-label` |
| Segmented | `components/ui/Segmented.vue`, `ui/seg.css` | One choice of a few, shown as a row | `UiSegmented`: `v-model`, `options: { value, label }[]`, `label` (the group's name). Each choice is a button with `aria-pressed`; the pressed one lifts onto the surface |
| Switch | `components/ui/Switch.vue`, `ui/switch.css` | On or off | `UiSwitch`: `v-model` (a boolean), the slot is the visible label, `label` names it for screen readers when there is no slot. `role="switch"` with `aria-checked`. The caller saves a preference through its setter (`:model-value` and an update handler), not a plain `v-model` on a store ref |
| Tick | `components/ui/Tick.vue`, `ui/tick.css` | A done check on a row | `UiTick`: `v-model`, `label` (for example "Mark Run done"), `size` (`default` 44px target around a 22px circle; `lg` 76px, 64 on a phone). `role="checkbox"` with `aria-checked`. Turned on under lively motion the circle pops; Calm and no sound otherwise |
| Dialog | `components/ui/Dialog.vue`, `ui/dialog.css` | A modal question | `UiDialog`: `v-model:open`, `labelledby`, `describedby`, `role` (`dialog` or `alertdialog`), `dismissible` (Escape closes only then), `variant` (`center`, or `sheet`, a bottom sheet on a phone), `initialFocus`. A native `<dialog>` shown with `showModal()`: the page behind is inert. Two focus edge stops inside keep Tab in the dialog (the browser would leave the page after the last control). The focused element is remembered and gets focus back when it closes; `close` is emitted once it has closed |
| Chip | `ui/chip.css` | A choice among a few, or a status tag | `.chip` (36px; 44px on a touch screen), `data-active="true"` for the pressed one, `.chip-add` (an accent text link), `.pill-count` and `.dot` inside. `.dot` paints `--c` (an area colour) |
| Menu | `ui/menu.css` | A popover over the page | `.color-pop` (the colour pop, `--z-popover`), `.color-pop-inline` (in a panel), swatches that paint `--c`. The account menu keeps its rules in `features/account.css` |
| Disclosure | `ui/disclosure.css` | A native `<details>` shown on demand | `.disclosure` and `.disclosure-body` (a plus and minus chevron); `.section-summary` and `.year-summary` for a collapsible section with its counts on one line |
| Fields | `ui/field.css` | Text, select and check inputs | `.field` (label and control), `.field-label`, `.timely-input` (alias `.input`), `.timely-select`, `.pill-input` (the rename field), `.check` and `.check-row`, `.form-row` and `.form-row-3` (one column on a phone), `.field-error`. 44px, 16px text (no zoom on iOS). The focus is the global ring plus a halo |
| Empty state | `ui/empty.css` | What a view shows before it has anything | `.empty-state`: a line of text and the action that fills it |
| Rows | `ui/row.css` | A list of entries | `.row-list`, `.row-item`, `.row-main`, `.row-name`, `.row-meta`; the entry's pencil or tick at the end |
| Pill | `ui/pill.css` | A short status | `.pill`, `data-state="now"` (accent, with `.live-dot`), `.pill-quiet` |

Not primitives, kept as they are: `EditButton.vue` (an icon button with a name, `to` or click), `AutoTextarea.vue` (the growing textarea, its rules are in `ui/field.css`), `YearNav.vue` (the year stepper), `IntroPlayer.vue`, `AccountMenu.vue` (its menu and rows are in `features/account.css`).

Still to come, when a view first needs them (slices 6 and 8): the tooltip (`v-tip`, `shell/Tooltip.vue`) and the toast (`shell/Toast.vue`, `useToast()`).

### 6.2 Feature parts

Feature components are built from primitives and classes, not made into primitives: the focal card, the day line, the week strip, the dream path, the recap, the ghost block. They keep their own `features/<area>.css` file.

### 6.3 Ownership and the rules

- The `ui/` file owns the bare block selector (`.btn`, `.chip`). A feature file restyles a primitive only with a contextual selector (`.today-focus .btn`); the guard fails on a bare one.
- Restyle a control in its `ui/` file, not in the feature. Keep the variant as one hyphenated class.
- **Deviation: the Dialog keeps two focus edge stops.** The plan (`ux-design-system-plan.md`, section 4) relies on the inert page alone. Tested in Chromium: Tab from the last control of a native modal dialog moves focus to the browser (`BODY`) and back, so the keyboard left the dialog. The reset dialog kept Tab between its two buttons before, and the brief keeps the keyboard unchanged. `UiDialog` therefore places two invisible focus stops (`.dialog-edge`) at its start and end that hand focus to the last or the first control. This is the one hand-written focus rule in a primitive; it lives in `Dialog.vue`, and no dialog keeps a loop of its own. Remove it only if the browser behaviour is checked to keep Tab inside.
- Targets are at least `var(--hit)` on a touch screen (`@media (pointer: coarse)` raises the dense sizes).

### 6.4 The living style guide

`app/dev/StyleGuide.vue` (the switches and the index) with `app/dev/styleguide/Tokens.vue`, `Controls.vue`, `Feedback.vue` and `Data.vue` (each under 200 lines). It renders the real components and the real CSS, every state, in light and dark, Lively and Calm, and at the part of the day chosen with its switches. Tokens shows the colour roles and text pairs with their live contrast (read from the page), and the area colours through `fillFor`.

It is a page at `/_styleguide`. The `timely-styleguide` module in `nuxt.config.ts` adds the route in dev and in a build with `TIMELY_STYLEGUIDE=1`; a normal build has no route and the page is not in its output. The design guard fails when a `components/ui/*.vue` is not shown in the guide. Hover and focus are seen by moving the pointer or tabbing through the guide.

---

## 7. Motion

- **Vocabulary** (`motion.css`, one set of `@keyframes`): the names planned for the slices are `rise`, `glide`, `pop`, `ring-out`, `spark`, `grow-x`, `grow-y`, `draw`, `breathe`, `fade`, `drift`. Until a slice uses one, it is not in the file.
- **The gate**: every animation sits under `:root[data-motion="lively"]` (or `html[data-motion="lively"]`). `transition` uses `var(--dur-*)` and `var(--ease-*)`. Colour and background feedback may run in Calm; transform transitions only under the gate.
- **Calm keeps**: every number, line, state, colour and label. Calm stops the count-up, the sparks, the drawing rings and bars, the view transition and the card tilt.
- **Reduced motion** forces calm and kills animation and transition (`reset.css`).
- **JS-driven effects** check `isLively()` from `useMotion()` before they run.
- The view transition (`useViewTransition`) and the milestone toasts come with slices 10 and 11.

---

## 8. Recipes

### 8.1 Add a feature component (most work)

1. Read section 6; use the existing classes and `Ui*` components first.
2. `app/components/<area>/<Name>.vue`: no `<style>`, under about 150 lines. Logic in `app/utils/<area>.ts` with a test in `tests/unit/`.
3. Styles in `app/assets/css/features/<area>.css`, selectors prefixed `<area>-`, only `var(--…)` values. A new file gets one `@import … layer(features)` line in `main.css`.
4. Area colours: `:style="areaVars(color)"`; CSS uses `var(--c)` and `var(--c-ink)`.
5. Motion: only `:root[data-motion="lively"] .<area>-x { animation: rise var(--dur-enter) var(--ease-out) both }`, keyframes from `motion.css`.
6. State in ARIA attributes; targets at least `var(--hit)`; the focus ring comes from `base.css`.
7. `npm test` (the guards), `npx nuxi typecheck`, `npm run build`; screenshots at 1280 and 400, light and dark, Calm and Lively.

### 8.2 Add a primitive (rare)

Only when it owns ARIA, focus, keys or timing, or a class repeats in three or more features.

1. CSS in `app/assets/css/ui/<name>.css` (layer `ui`): the block, its variants and responsive rules in one file; component tokens on the block.
2. Vue only if it owns behaviour: `app/components/ui/<Name>.vue`, typed props, `defineModel` for `v-model`, no `<style>`, under about 80 lines.
3. A section in the style guide with every state (the guard checks that each `ui/*.vue` is in the style guide source).
4. A row in section 6 of this file and a changelog line.

### 8.3 Add or change a token

1. A primitive first (if the value is new), then the semantic token in light and dark, then its use.
2. If it is text or a boundary, add the pair to the contrast list in `tests/unit/designContrast.test.ts`.
3. Document it in section 2 and the changelog (section 11).
4. A rename keeps the old name as an alias in `tokens-legacy.css` with a comment (deprecated in version X; the new name is in section 2); the guard's `legacyTokenUse` count goes down.

### 8.4 Standing rule for every doer brief

> Design system rules (spec/design-system.md, enforced by `npm test`): use only `var(--...)` tokens for colour, font size, spacing, radius, shadow, duration and z-index; no raw hex, px font sizes or z-index above 9 outside `app/assets/css/tokens.css`. New `.vue` files have no `<style>` block: put CSS in `app/assets/css/features/<area>.css` (selectors prefixed `<area>-`) and import it in `main.css` under `layer(features)`; never restyle a bare primitive selector (`.btn`, `.chip`, `.card`) there, use a contextual selector. Use existing classes and `Ui*` components before writing markup; add a new `Ui*` component only if it owns ARIA state, focus, keys or timing, following the "Add a primitive" recipe (CSS in `assets/css/ui/`, a style guide section, a docs row). Life area colours reach CSS only as `:style="areaVars(color)"` (`--c`, `--c-ink`). State goes in ARIA attributes; targets are at least `var(--hit)`. Animations only under `:root[data-motion="lively"]` with keyframes from `motion.css`; Calm must still show every number and state. Logic goes in `app/utils` with tests. If the design guard reports a lower legacy count, lower the baseline in `tests/unit/designSystem.test.ts` in the same commit. Add no dependency.

---

## 9. Guards and how to read a failure

`npm test` runs two guards (no new dependency; the scanner strips comments and `url(...)`):

- `tests/unit/designSystem.test.ts`:
  - **Hard rules.** A `.vue` file gains a `<style>` block that is not in the list (`STYLE_BLOCK_FILES`), or a listed file loses its block without leaving the list. A bare primitive selector in a feature file. A `components/ui/*.vue` that the style guide (`app/dev`) does not show.
  - **Ratchet.** Thirteen counts of legacy values (raw colours in CSS, `.vue` and `.ts`; font sizes in px; radius literals; z-index literals; `@keyframes` outside `motion.css`; ungated `animation`; literal `transition` durations; legacy `@media` widths; colour keys in `:style`; `!important` outside reset; old token names). The baseline is in `BASELINE` at the top of the file.
- `tests/unit/designContrast.test.ts`: every text and boundary pair (section 2.2) in every theme and part of the day, read from `tokens.css`; `SURFACE` equals the tokens; every design swatch through `fillFor` reaches 3:1 on both surfaces; text on each fill reaches 4.5:1 or is in the known-limit list.

Reading a failure:
- **"X rose from A to B"**: new legacy code was added. The message lists the first places. Use the token or the primitive instead (section 8). Do not raise the baseline.
- **"X fell from A to B. Set BASELINE.X = B"**: legacy code was removed (good). Lower the number in the same change so the baseline stays true.
- **"keeps the scoped <style> blocks…"**: a new `<style>` block. Move the CSS to `features/<area>.css` (section 8.1).
- **A contrast failure** names the pair and its ratio. Adjust the token minimally (section 8.3) and report the change; the guard prints the ratio it needs.
- **A `fillFor` or ink failure** names the colour and theme. Teal is the known limit.

The guards read the source and the tokens; they do not render. The browser checks (captures at 1280 and 400) are the other half, run by hand for each slice.

---

## 10. Deprecations

Old names are aliases in `tokens-legacy.css`. Each goes when its count reaches zero; the total is the ratchet's `legacyTokenUse` (450 after slice 3b, down from 587). Target: slice 12, when the last screens are rewritten.

| Old name | Use it as | Deprecated in | Remaining uses (0.0.2) |
| --- | --- | --- | --- |
| `--bg` | `--surface` (the page is `--paper`) | 0.0.2 | 15 |
| `--bg-2` | `--surface-2` | 0.0.2 | 9 |
| `--bg-3` | `--surface-hover` | 0.0.2 | 8 |
| `--bg-4` | `--accent-soft` | 0.0.2 | 5 |
| `--rule` | `--line` | 0.0.2 | 18 |
| `--rule-2` | `--line-2` | 0.0.2 | 19 |
| `--ink-4` | `--control-border` or `--line` (decoration) | 0.0.2 | 3 |
| `--accent-deep` | `--accent-hover` | 0.0.2 | 3 |
| `--on-accent` | `--accent-ink` | 0.0.2 | 5 |
| `--attention` | `--danger` | 0.0.2 | 3 |
| `--warn` | `--warn-ink` | 0.0.2 | 4 |
| `--shadow` | `--elev-1` (cards) or `--elev-2` (menus) | 0.0.2 | 6 |
| `--focus-ring` | the focus rule in `base.css` | 0.0.2 | 2 |
| `--font-ui` | `--font` | 0.0.2 | 5 |
| `--fs-xs` | `--text-caption` | 0.0.2 | 24 |
| `--fs-sm` | `--text-small` | 0.0.2 | 49 |
| `--fs-md` | `--text-ui` | 0.0.2 | 19 |
| `--fs-lg` | `--text-title-s` | 0.0.2 | 7 |
| `--fs-xl` | `--text-title-l` | 0.0.2 | 1 |
| `--radius` | `--radius-sm` (or a role radius) | 0.0.2 | 15 |
| `--space-1` | `--sp-1` | 0.0.2 | 13 |
| `--space-2` | `--sp-2` | 0.0.2 | 81 |
| `--space-3` | `--sp-3` | 0.0.2 | 69 |
| `--space-4` | `--sp-4` | 0.0.2 | 39 |
| `--space-5` | `--sp-6` (24px, not 20px) | 0.0.2 | 15 |
| `--space-6` | `--sp-8` (32px) | 0.0.2 | 10 |
| `--space-7` | `--sp-12` (48px) | 0.0.2 | 3 |

Also in the ratchet, not an alias: the scoped `<style>` blocks (16), the colour literals in `.vue` (1), the colour literals in CSS (3, the week grid's dark overlay), font sizes in px (9), radius literals (15), z-index literals (6), `@keyframes` outside `motion.css` (9), ungated `animation` (11), literal `transition` durations (3), legacy `@media` widths (6), colour keys in `:style` (16) and `!important` outside reset (4).

---

## 11. Changelog

- **2026-11-04, Plan > Year (slice 7):** new classes in `features/year.css` (`.year-lede`, `.year-card`, `.year-paint`, `.year-summary`, `.year-sum-head`, `.year-big`, `.year-stack`, `.year-legend`, `.year-swatch`, `.year-swatch.is-blank`, `.year-detail`, `.year-empty`, `.year-months`, `.year-month`, `.year-row-block`) and rules on `.year-grid .week-cell`; no new token. Keyframes `year-grow` and `year-cell-in` are in `motion.css` (Lively only). The paint chip dot takes its colour through `areaVars`, so the inline colour ratchet falls from 14 to 13.
- **2026-11-04, Plan > Week (slice 6):** the schedule chips on Week are the 44 px target (`.template-switch .chip`), the card "Where the week goes" is `features/week-where.css` (`.where*`, `.where-donut*`, the ring's stroke 16 and 20 units), the grid card is on `--radius-xl` and `--elev-1`, and the selection ghost is an outline (dashed) over a 12% tint. The ratchet: `radiusLiteral` 13, `legacyTokenUse` 375, the style-block list 15 (the donut's block moved to features).

Dated entries with the app version. No separate version for the system.

- **0.1.0, 2026-11-04: three screens.** The shell (the rail, the phone bar, the top bar, the skip link) is built from the tokens and `features/shell.css`. `--z-tabbar` is 15 (was 40): the bar is over the page and the sticky bar, and under the popovers (the grid box and menu, the colour pop), so they open over it. The guard baselines fall with the removed legacy values (zIndexLiteral 6 to 5, transitionLiteral 3 to 2, legacyTokenUse 450 to 445).
- **0.0.2, 2026-11-03: design foundation.** Cascade layers (`reset`, `tokens`, `base`, `ui`, `features`, `motion`, `utilities`); the feature CSS moved to `features/`. Tokens in three tiers with the A2 palette (paper and card surfaces, cobalt accent, neutral dark) and rem type; old names aliased. `fillFor` checks both surfaces; the fallback colours are constants. `app/utils/breakpoints.ts` (768 is the phone edge). Preferences (`utils/prefs.ts`, `usePref`), dark mode and motion (`useTheme`, `useMotion`) and the head script (`utils/prepaint.ts`) set `data-theme`, `data-motion`, `data-choice` and `data-part` before first paint. The guards and the contrast test. This document. The focus ring is 3px.
- **0.0.2, slice 3b: primitives and the style guide.** The legacy button, form, list, section, shared and layout files moved to `ui/`, and their look follows the A2 prototype (pill buttons and chips, a 44px target, the fields at 16px text). New Vue primitives: `UiIcon`, `UiRing` (replaces `AdherenceRing`), `UiSwitch` (replaces `SleepToggle` and the dark-mode toggle), `UiSegmented`, `UiTick` (the Home done checks), `UiDialog` (the reset dialog). The living style guide at `/_styleguide` (dev, or `TIMELY_STYLEGUIDE=1`). The ambient tint of the page under lively motion. The Motion choice in the Account menu. The active guards: the bare primitive selector and the style guide coverage.
- 0.0.2: Vuetify and its icon font removed (no token change).
