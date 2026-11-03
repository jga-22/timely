> Planner output (2026-11-03) behind the design system of 0.0.2: the decisions, the three-tier tokens, the layers and the guards. The rules it sets live in `spec/design-system.md`; this file keeps the reasoning.

# Timely design system plan (A2-based)

Read-only planner output, 2026-11-03. Sources: `.claude/agent.md`, `spec/frontend-design.md`, `scratchpad/migration-plan.md`, `spec/mockups/prototype-a2.html` + `prototype-a2/a2.css` + `a2.js`, `app/assets/css/*.css`, `usePlannerFill.ts`, `utils/palette.ts`, `utils/focus.ts`, `useShowSleep.ts`, the shared components, `tests/unit/fileSize.test.ts`, `vitest.config.ts`, `nuxt.config.ts`.
Tags: **[fact]** checked in code, **[assume]** to verify, **[rec]** recommendation.

Facts that shape the plan:
- Raw hex in CSS is already only in `tokens.css` [fact]. In `.vue`/`.ts` it appears as colour fallbacks (`#888`, `#999999`, `#5d6b7a`, `#d6d3d1`) in 6 components/composables, plus seed, sleep and store data [fact].
- 15 `z-index` literals (1 to 40) in 6 files, incl. 29/30 for the teleported grid popups [fact]. Many `@media` widths (480, 560, 768, 900, 1024, 1280, hover, pointer) [fact]. 5 px font sizes left (week-grid, onboarding) [fact]. 8 `!important` (5 are the Vuetify neutralisation in `base.css`) [fact].
- 16 components have `<style>` blocks (LifeAreaList 125 lines, HaradaMap 104, TimeSplitDonut 89, ...) [fact]; about 10 `:style` bindings set `background` directly instead of a `--c` variable [fact].
- No stylelint, no `@vue/test-utils`; Vitest runs in `node` over `tests/unit/**` [fact]. `ResetDataDialog.vue` has a hand-written Tab trap; the Welcome dialog has none (agent.md open item) [fact].
- `palette.ts` `SURFACE` is hard-coded (`#ffffff` / `#0f1624`) and must equal the token surface [fact]; A2 has two surfaces (paper `#f4f2ec`, card `#fffefb`).
- A2 paints blocks as a 24 % tint plus a 3 px solid edge (`color-mix`), which contradicts frontend-design.md 5.3 "No softening" [fact].

---

## 1. Principles, and what not to build

Principles
1. **Tokens are the only source of values.** Colour, font size, space, radius, shadow, duration, easing, z-index come from `var(--…)`. Raw values live in `tokens.css`; a test fails otherwise.
2. **CSS first, Vue only for behaviour.** A pattern becomes a Vue component only when it owns ARIA state, focus, keyboard or timing (switch, dialog, tick, tooltip, toast, ring, segmented, icon). Everything else is a class.
3. **One cascade model.** `@layer` sets precedence; file order and specificity stop mattering. New components have no `<style>` block.
4. **State in ARIA, not classes.** Style `[aria-pressed="true"]`, `[aria-current="page"]`, `[aria-checked="true"]`, `[aria-expanded]`; a visual state with no ARIA equivalent uses `.is-*`.
5. **Motion is decoration and opt-in.** Every keyframe animation sits under `:root[data-motion="lively"]`; Calm and reduced motion keep every number, line and state.
6. **Area colours are user data.** They pass `fillFor` (3:1) and reach CSS only as `--c` / `--c-ink`.
7. **Grow by need.** A primitive is built in the slice that first needs it, from the recipe (6.1), and lands in the style guide the same day.

Do not build
- No component library: no `UiButton`, `UiCard`, `UiChip`, `UiBadge`, `UiStack`, `UiText` wrappers (a class does it).
- No CSS-in-JS, Tailwind, Sass, PostCSS plugins, token build pipeline (Style Dictionary, JSON to CSS).
- No Histoire/Storybook. No stylelint for now (install + config); Vitest guards cover the rules (Q4).
- No global announcer service: inline `role="status"` stays; the toast is the only global live region.
- No theme engine beyond `data-theme`, `data-motion`, `data-part` on `<html>`.
- No icon library, no icon font.
- No component unit tests (no DOM env); primitives are checked on the style guide page in the browser.

---

## 2. Token architecture

### 2.1 Tiers
| Tier | Where | Naming | Who may use it |
|---|---|---|---|
| Primitive | `tokens.css` §1 | hue + step: `--stone-50`, `--blue-600`, `--night-900`, `--sand-200` | only semantic tokens in `tokens.css` |
| Semantic | `tokens.css` §2 light, §3 dark, §4 parts, §5 scales | role: `--surface`, `--ink-2`, `--accent-soft`, `--sp-4` | every CSS file |
| Component | the CSS file of that primitive, on its root selector | `--<block>-<prop>`: `--chip-h`, `--ring-stroke`, `--tick-size` | that block, and call sites that resize it |

Component tokens are local (`.chip { --chip-h: var(--hit); min-height: var(--chip-h) }`), not a global registry. Add one only when a call site needs to change it.

### 2.2 Semantic set (values = A2 light / dark) [rec]
Colour
- Surfaces: `--paper` (page, `#f4f2ec` / `#121417`), `--surface` (cards, inputs, `#fffefb` / `#1b1e23`), `--surface-2` (tracks, seg background; A2 `--line-2`), `--surface-hover`.
- Ink: `--ink`, `--ink-2`, `--ink-3` (all AA on paper and surface), `--ink-inverse` (tooltip and toast text).
- Lines: `--line`, `--line-2` (decoration), `--control-border` (3:1 boundary: inputs, outline buttons, ticks; A2 uses ink-3).
- Accent: `--accent`, `--accent-ink`, `--accent-soft`, `--accent-tint`.
- Status: `--warn-bg` / `--warn-ink` (A2 sand), `--danger`, `--danger-tint`, `--ok`.
- Focus: `--focus` (= accent), `--focus-width` 3px, `--focus-offset` 3px.
- Ambient: `--am-1`, `--am-2` per `html[data-part]` and theme. `--hatch` (free time).
- Planned time: `--cell-empty` (= surface), `--cell-line` (3:1 outline). Area colours are not tokens (2.4).

Type (role names; rem so the browser font size is respected [rec]; phone steps via `clamp()` inside the token, never in feature CSS): `--text-caption` 12, `--text-small` 13, `--text-meta` 14, `--text-ui` 15, `--text-body` 16, `--text-lede` 17, `--text-title-s` 18, `--text-title-m` 22, `--text-title-l` clamp 24 to 30, `--text-page` clamp 30 to 36, `--text-hero` clamp 34 to 44, `--text-number` clamp 40 to 56. `--weight-regular` 400, `--weight-medium` 500, `--weight-bold` 600; `--leading-tight` 1.1, `--leading-snug` 1.3, `--leading-body` 1.5; `--tracking-tight` -.02em; `--font`.

Space (n x 4 px, name = multiplier): `--sp-1` 4, `--sp-2` 8, `--sp-3` 12, `--sp-4` 16, `--sp-5` 20, `--sp-6` 24, `--sp-8` 32, `--sp-10` 40, `--sp-12` 48, `--sp-14` 56, `--sp-16` 64. Layout: `--page-pad-x` (56, 18 on phone), `--page-max` 900px, `--rail-w` 232px. New prefix because the old `--space-5` is 24 px; old names become aliases (3.2).

Radius and the concentric rule: `--radius-xl` 28 (cards, focal, dialogs), `--radius-lg` 20 (menus, sheets, selection bar, toast), `--radius-md` 14 (nav items, selected rows, notes), `--radius-sm` 10 (inputs, tooltip), `--radius-xs` 6 (mini blocks, phone year squares), `--radius-pill` 999px. **Rule:** a rounded box nested in another uses max(`--radius-xs`, parent radius minus parent padding), in practice the next token at or below it (card 28 with 16 padding gives 12, so `--radius-sm`). Shown with a picture in the guide.

Elevation: `--elev-1` (A2 `--shadow`: cards, the current seg item), `--elev-2` (A2 `--shadow-lift`: hover lift, menus, toast, selection bar, dialogs); dark twins. Hairlines are not elevation.

Motion: `--dur-fast` 120ms (hover, colour), `--dur-base` 200ms (switch, tick fill), `--dur-moderate` 300ms (view transition, toast), `--dur-enter` 450ms (rise, glide, slide), `--dur-draw` 900ms (rings, bars, path); `--ease-out` cubic-bezier(.2,.7,.2,1), `--ease-spring` cubic-bezier(.34,1.45,.64,1), `--ease-in-out`; `--stagger` 70ms (`calc(var(--i) * var(--stagger))`).

Z-index (named; local stacking inside an `isolation: isolate` block may use 0 to 9): `--z-raised` 1, `--z-sticky` 10 (top bar, selection bar), `--z-popover` 20 (account menu, colour pop, grid box and menu), `--z-tabbar` 40, `--z-overlay` 50 (first run), `--z-toast` 60, `--z-tooltip` 80, `--z-skip` 90. A native `<dialog>` sits in the top layer and needs none.

Sizes: `--hit` 44px (minimum target), `--hit-lg` 48px (rail items), `--tick-lg` 76px (64 on phone), `--icon` 20px, `--icon-sm` 16px, `--dot` 10px.

Breakpoints (CSS variables do not work in `@media`, so one TS source plus a test): `app/utils/breakpoints.ts` exports `BREAKPOINTS = { phone: 480, tablet: 768, wide: 1100 }` and `matchesBreakpoint(name)`. CSS uses only these widths plus `(hover: none)`, `(pointer: coarse)`, `(prefers-reduced-motion: reduce)`. [rec] 768, not the 760 of A2: `focus.ts` and every phone rule already use 768. 560, 900, 1024, 1280 are folded in over the slices (ratchet, 6.2).

### 2.3 Modes
- `html[data-theme="dark"]` swaps semantic colour and elevation tokens. Primitives never change.
- `html[data-part="morning|afternoon|evening"]` swaps `--am-1` and `--am-2` only (x 2 themes).
- `html[data-motion="lively|calm"]` swaps no token; it gates rules (3.4). `data-choice` keeps the choice of the user for the Account menu when reduced motion forces calm.
- All three are set before first paint by the one nonce'd head script (5.2).

### 2.4 Area colours and the 3:1 rule
- Source: `category.color`, `activity.color`, `template.color`. Fallbacks move from components into `palette.ts` (`FALLBACK_COLOR`, `FALLBACK_TEMPLATE_COLOR`).
- `palette.ts`: `SURFACE` becomes `{ light: ['#fffefb', '#f4f2ec'], dark: ['#1b1e23', '#121417'] }` and `fillFor` shades until the colour reaches 3:1 on **every** surface of the theme (a block sits on a card, a dot on paper). A test asserts they equal `--surface` and `--paper`.
- Delivery: `usePlannerFill` gains `areaVars(color)` returning `{ '--c': fill, '--c-ink': inkOn(fill) }`; components write `:style="areaVars(color)"`; CSS paints `var(--c)`.
- Tints (A2): `color-mix(in srgb, var(--c) 24%, var(--surface))` is allowed only behind `--ink` text when the same element carries a solid `var(--c)` edge or dot that meets 3:1. This replaces "No softening" in the spec (Q2). Text on a solid fill uses `--c-ink`.

### 2.5 File layout
```
app/assets/css/
  main.css            @layer statement + imports (the only file nuxt.config loads)
  reset.css           layer reset: box-sizing, margins, [hidden], reduced-motion kill
  tokens.css          layer tokens: 1 primitives, 2 light, 3 dark, 4 parts, 5 scales (type, space, radius, elev, motion, z, sizes)
  tokens-legacy.css   layer tokens: old names as aliases (--bg*, --rule*, --on-accent, --fs-*, --space-*, --radius, --shadow, --font-ui); deleted at 0 uses
  base.css            layer base: html, body, headings, links, focus ring, form element defaults
  ui/*.css            layer ui: one file per primitive (button, card, chip, seg, switch, ring, bar, tick, row, page, empty, dialog, toast, tip, icon, menu, field, disclosure, pill)
  features/*.css      layer features: one file per area (shell, today, plan, week-grid, week-panels, year, progress, firstrun, account, auth, legal, ...)
  motion.css          layer motion: every @keyframes, plus lively rules that are not feature-specific (ambient, view transitions)
  utilities.css       layer utilities: .sr-only, .muted, .num, .nowrap, .hide-phone
```
The 20 existing files move into `features/` unchanged (3a) and are renamed or split only when a slice rewrites them.

---

## 3. CSS strategy

### 3.1 Layer order (ends the cascade-order fragility)
```css
/* main.css */
@layer reset, tokens, base, ui, features, motion, utilities;
@import './reset.css' layer(reset);
@import './tokens.css' layer(tokens);
@import './tokens-legacy.css' layer(tokens);
@import './base.css' layer(base);
@import './ui/button.css' layer(ui);
/* ... */
@import './features/shell.css' layer(features);
/* ... the 20 legacy files in their current order ... */
@import './motion.css' layer(motion);
@import './utilities.css' layer(utilities);
```
- A later layer always wins over an earlier one, whatever the specificity: features restyle primitives with no `!important` and no selector stacking; utilities always win.
- Inside `features` the legacy files keep their current relative order, so the move is behaviour-neutral. New feature files do not depend on order: each owns a prefix (3.3), so no two files style the same selector.
- `!important` flips inside layers (the important declaration of an earlier layer wins). Only `reset.css` may use it (`[hidden]`, the reduced-motion kill), which is exactly the wanted effect. The 5 Vuetify ones go with slice 2; the other 3 are reviewed in 3a.
- **Unlayered CSS beats every layer.** Vue `<style>` blocks are unlayered, so the 16 legacy blocks win over everything (today they mostly win through the scoped attribute anyway). Rule: no new `<style>` blocks; a legacy block moves to its feature file when a slice touches that component (ratchet, 6.2).
- [assume] Vite (postcss-import) inlines `@import ... layer(x)` correctly. Verify in 3a: `grep -c "@layer" .output/public/_nuxt/entry*.css` is above 0 and the before and after screenshots are identical. Fallback: wrap the content of each file in `@layer features { ... }` inside the file.

### 3.2 Incremental migration (no big bang)
1. 3a step 1: add `reset.css`, `utilities.css`, `motion.css` (near empty), the `@layer` statement, and import the 20 files into `features` in their current order. Old token values. Screenshots must be pixel-identical.
2. 3a step 2: rewrite `tokens.css` to the three tiers with A2 values; old names become aliases in `tokens-legacy.css` (`--bg: var(--surface)`, `--rule: var(--line)`, `--radius: var(--radius-sm)`, `--space-5: var(--sp-6)`, ...), so legacy feature CSS keeps working and already takes the new look.
3. Each later slice that rewrites a screen writes `features/<area>.css` with new tokens and primitives, deletes the legacy rules it replaced, and lowers the ratchet numbers in the guard test.
4. `tokens-legacy.css` is deleted when its ratchet count reaches 0 (target slice 12).

### 3.3 Naming convention (keeps the current style)
- Primitives: short unprefixed blocks `.btn`, `.card`, `.chip`, `.seg`, `.switch`, `.ring`, `.bar`, `.tick`, `.row`, `.pill`, `.dot`, `.ic`, `.page-head`, `.eyebrow`, `.empty`, `.sheet`, `.toast`, `.tip`.
- Variants: one hyphenated class, as today: `.btn-primary`, `.btn-quiet`, `.btn-icon`, `.card-focal`, `.bar-stack`. Parts: `.card-title`, `.row-main`, `.row-meta`. No BEM double underscore or double dash.
- State: ARIA selectors first; otherwise `.is-done`, `.is-now`, `.is-fresh`.
- Features: one prefix per area: `today-`, `plan-`, `wk-` (grid, kept), `yr-`, `prog-`, `fr-`, `acct-`, `shell-`. A feature file only holds selectors that start with its prefix, or contextual ones (`.today-focus .btn`).
- JS hooks: `data-*` attributes, never style classes.

### 3.4 Motion in CSS
- `@keyframes` live only in `motion.css` (shared vocabulary: `rise`, `glide`, `pop`, `ring-out`, `spark`, `grow-x`, `grow-y`, `draw`, `breathe`, `fade`, `drift`).
- An `animation` declaration appears only in a rule whose selector starts with `:root[data-motion="lively"]` (feature files may do this for their own parts).
- `transition` uses `var(--dur-*)` and `var(--ease-*)`. Colour and background feedback may run in Calm; transform transitions only under the lively gate.
- `reset.css` holds the reduced-motion kill: `animation: none !important; transition: none !important` on everything.

### 3.5 No duplicated rules
- One owner per selector: primitives in `ui/`, prefixed selectors in their feature file. A guard fails when a bare primitive selector (`.btn {`, `.chip:hover {`) appears in a feature file.
- Responsive variants of a block live in the file of that block, next to it (no trailing global `@media` dump like `shared.css` today).
- `buttons.css`, `forms.css`, `lists.css`, `sections.css`, `shared.css`, `layout.css` are the legacy primitives: 3b moves their rules into `ui/*.css` and deletes them.

---

## 4. Minimal component inventory

Vue primitives go in `app/components/ui/` (Nuxt path prefix: `ui/Switch.vue` renders as `<UiSwitch>`); app-wide singletons in `app/components/shell/` (`shell/Toast.vue` renders as `<ShellToast>`; this replaces the `shell/AppToast.vue` names of the migration plan, which would render as `ShellAppToast`). No `<style>` blocks: CSS in `assets/css/ui/<name>.css`.

| A2 pattern | Decision | API or classes | Lines | Reuse / replace | Slice |
|---|---|---|---|---|---|
| Icon set | **Vue** `ui/Icon.vue` + `utils/icons.ts` | `<UiIcon name="check" />`; props `name: IconName`, `size?: "sm" or "md"`. Always `aria-hidden`, `focusable="false"`. `icons.ts`: `ICONS = { check, today, plan, progress, left, right, plus, moon, sun, pencil, close, brand }` as arrays of path `d` strings (circles converted to paths); `type IconName = keyof typeof ICONS` | 25 + 40 | the pencil SVG of EditButton moves here; the text arrows of YearNav become icons | 3b |
| Button | CSS | `.btn`, `.btn-primary`, `.btn-quiet`, `.btn-danger`, `.btn-icon` (44 round), `.btn-sm` (dense rows only). Min height `--hit` | ~60 css | replaces `buttons.css`; EditButton keeps its API and renders `.btn-icon` + `UiIcon` | 3b |
| Surface, section | CSS | `.card` (surface, `--radius-xl`, `--elev-1`, padding `--sp-8`, phone `--sp-5`), `.card-focal`, `.section` + `.section-title` | ~30 | replaces the section rules of `sections.css` | 3b |
| Page header | CSS | `.page-head` with `.eyebrow`, `h1`, `.lede` | ~15 | exists, restyled | 3b |
| Stat | CSS | `.stat` with `.stat-value` (`--text-number`, `.num`) and `.stat-label` | ~10 | new | 3b |
| Ring | **Vue** `ui/Ring.vue` (a11y + draw) | props `value: number or null` (0 to 100), `size?: number` (px, default 28), `label?: string` (given: `role="img"` + `aria-label`; absent: `aria-hidden`), `done?: boolean` (check in the centre), `tone?: "accent" or "ok"`; default slot replaces the centre text | ~40 | **replaces** `AdherenceRing.vue` (3 call sites; `basis` maps to `tone`) | 3b |
| Progress bar | CSS | `.bar` with an `i` child bound to `--v` (0 to 1; `--c` optional); `.bar-stack` with `--i` per segment. The call site gives `role="img"` + `aria-label` | ~20 | replaces `.adh-area-meter` when Progress is rebuilt | 3b |
| Segmented control | **Vue** `ui/Segmented.vue` (aria-pressed group, v-model) | `<UiSegmented v-model="motion" :options="motionOptions" label="Motion" />` with `options: { value, label }[]`; renders `div.seg[role=group][aria-label]` of `button[aria-pressed]` | ~30 | Motion (Account), RangeControls Month or Week and Quarter or Year, Goals List or Grid, phone day tabs later | 3b |
| Sub-nav | CSS on links | `nav.seg.seg-nav` of `NuxtLink` with `aria-current="page"` | 0 extra | Plan sub-nav; rail and tab bar share the `[aria-current]` look | 4 |
| Chip | CSS | `.chip`, `[aria-pressed="true"]`, `.chips` row; `.dot` inside with `--c` | ~20 | replaces `.chip`, `.chip-add` | 3b |
| Pill (status) | CSS | `.pill`, `[data-state="now"]`, `.pill-quiet` | ~12 | new (countdown) | 5 |
| Switch | **Vue** `ui/Switch.vue` | `<UiSwitch v-model="showSleep">Show sleep</UiSwitch>` (slot = visible label; a `label` prop gives an sr-only one); `button[role=switch][aria-checked]` + `.track` | ~25 | **replaces** `SleepToggle.vue` and the dark switch in AccountMenu | 3b |
| List row with tick | **Vue** `ui/Tick.vue` + CSS `.row` | `<UiTick v-model="done" :label="tickLabel" size="lg" />`: `button[aria-pressed]` with the label from a pure helper ("Mark Run done"), 44 px hit (76 for `lg`); adds `.is-burst` and sparks only when `isLively()`. Row layout is CSS: `li.row` with `UiTick` + `.row-main` (`.row-title`, `.row-meta`) | ~45 + 25 css | replaces the done checks of `HomeActivities` and `HomeHabits` | 3b (used in 5) |
| Empty state | CSS | `.empty` with icon or illustration, text, actions | ~10 | replaces `.empty-state` | 3b |
| Dialog, sheet | **Vue** `ui/Dialog.vue` on native `<dialog>` + `showModal()` (top layer, inert background = focus trap, no z-index, no teleport) | `<UiDialog v-model:open="open" labelledby="reset-title" role="alertdialog" :dismissible="true" variant="center" :initial-focus="cancelRef">` + default slot; emits `close`. Open: remember `document.activeElement`, `showModal()`, focus `initialFocus` or the first focusable. The `cancel` event (Escape) closes when `dismissible`, otherwise `preventDefault()`. Close: focus the remembered element (explicit, not left to the browser). `variant="sheet"` is a bottom sheet under 768 px | ~70 + 40 css | **replaces** the manual trap in `ResetDataDialog.vue`; used by the recap (8) and the Replay warning (9) | 3b |
| Tooltip | **Directive** `v-tip` (plugin `app/plugins/tip.ts`) + singleton `shell/Tooltip.vue` | `<circle v-tip="label" tabindex="0">`; shows on pointerenter and focus, hides on leave, blur and Escape, sets `aria-describedby` to the singleton id, `position: fixed` at `--z-tooltip`. Never the only carrier of information | ~60 + 25 | new (A2 chart tips) | 6 (first chart with tips) |
| Toast | **Vue** singleton `shell/Toast.vue` + `composables/useToast.ts` | `useToast().show({ title, text, action })` with `action: { label, run }`; one at a time, 7 s, paused on hover and focus, close button, region `role="status"` always mounted, raised above the phone tab bar | ~50 + 30 | new | 8 (or the first slice that needs it) |
| Menu (account) | keep `AccountMenu.vue`; CSS `.menu` in `ui/menu.css` | behaviour unchanged | none | restyled | 3b |
| Disclosure | CSS on native `<details>` | `.disclosure` (plus and minus marker) | ~15 | exists | 3b |
| Fields | CSS | `.field`, `.field-label`, `.input` (aliases `.timely-input`, `.timely-select` until those files are rewritten) | ~30 | `AutoTextarea.vue` kept; its scoped CSS moves to `ui/field.css` | 3b |
| Focal card, day line, week strip, dream path, recap, ghost block | **Feature** components, not primitives | built from `.card`, `UiTick`, `.pill`, `.bar`, `UiRing` | n/a | n/a | 5 to 10 |

Kept: `EditButton.vue` (uses `UiIcon`), `AutoTextarea.vue`, `YearNav.vue` (`UiIcon` + `.btn-icon`), `IntroPlayer.vue`, `AccountMenu.vue`. Deleted in 3b: `AdherenceRing.vue`, `SleepToggle.vue` (call sites bind `UiSwitch` to `useShowSleep` in one line).

New primitive code in 3b: about 300 lines of Vue/TS and 400 lines of CSS, most of the CSS moved out of legacy files.

---

## 5. Composables and utils conventions

### 5.1 Preferences (localStorage, outside the planner state)
- `app/utils/prefs.ts` (pure): `PREF_KEYS = { dark: "timely.dark", motion: "timely.motion", showSleep: "timely.showSleep", weekClosed: "timely.weekClosed", ... }` and parsers (`parseBool`, `parseMotion`). One list, also the reference for the Privacy page.
- `app/composables/usePref.ts`: the `useShowSleep` pattern made generic once: `usePref<T>(key, fallback, parse, serialise)` returns `{ value, set }` (shared `useState`, read after mount, try/catch write). Then `useShowSleep`, `useMotion`, `useTheme`, `useWeekClosed` and the Progress switches are about 10 lines each. Built in 3a, when `useMotion` and `useTheme` become its 2nd and 3rd users.

### 5.2 Theme, motion, part of day
- `app/utils/motion.ts` (pure): `resolveMotion(choice, reduce)`, `partOfDay(minutes)`.
- `app/utils/prepaint.ts` (pure): `PREPAINT_SCRIPT`, the string built from `PREF_KEYS` that sets `data-theme`, `data-motion`, `data-choice`, `data-part`. `nuxt.config.ts` imports it for the existing head script (already nonce'd by `addScriptNonce`; no new script, no CSP change). Tested in Vitest by running the string against a fake `localStorage`, `matchMedia`, `document.documentElement` and a fixed `Date`.
- `useTheme()` returns `{ dark, toggle }` and keeps `useState("dark")`, so `usePlannerFill` is unchanged. `useMotion()` returns `{ choice, motion, setChoice, isLively }`. Every JS-driven effect (count-up, sparks, view transition, card tilt) checks `isLively()`.
- `useViewTransition()` arrives in slice 11 (route change only, lively only).

### 5.3 Focus and live regions
- `utils/focus.ts` stays the one focus module: add `focusHeading(el)` for route changes (`h1[tabindex=-1]`). New panels keep `focusEditField` / `focusEditById` (FR-UX-9). Dialog focus lives in `UiDialog`.
- Live regions: inline `role="status"` next to the thing that changed (the current convention). An animated number is `aria-hidden` and its final text sits in an `.sr-only` `role="status"`. The toast is the only global region.

### 5.4 Where rules live, tests
- Pure rules (texts, numbers, positions, ARIA labels built from data) in `app/utils/<area>.ts`, tested in `tests/unit/<area>.test.ts`, dates and minutes passed in. Components bind; they do not compute.
- Design guards in `tests/unit/designSystem.test.ts`, contrast in `tests/unit/designContrast.test.ts`, the small CSS scanner and token resolver in `tests/unit/helpers/css.ts` (with its own few cases).
- Primitives are checked in the browser on the style guide page (every state, 1280 and 400, light and dark, Calm and Lively), puppeteer in the scratchpad as today.

---

## 6. Recipes and guards

### 6.1 Recipes (copy into the doer brief)
**Add a feature component** (most work)
1. Read `spec/design-system.md` (Components); use existing classes and `Ui*` first.
2. `app/components/<area>/<Name>.vue`: no `<style>`, under about 150 lines, logic in `app/utils/<area>.ts` with a test.
3. Styles in `app/assets/css/features/<area>.css`, selectors prefixed `<area>-`, only `var(--...)` values; a new file gets one import line in `main.css` under `layer(features)`.
4. Life area colours: `:style="areaVars(color)"`; CSS uses `var(--c)` and `var(--c-ink)`.
5. Motion: only `:root[data-motion="lively"] .<area>-x { animation: rise var(--dur-enter) var(--ease-out) both }`, keyframes from `motion.css`.
6. State in ARIA attributes; targets at least `var(--hit)`; the focus ring comes from base.
7. `npm test` (guards), typecheck, build; screenshots at 1280 and 400, light and dark, Calm and Lively.

**Add a primitive** (rare: only when it owns ARIA, focus, keys or timing, or a class repeats in 3 or more features)
1. CSS `assets/css/ui/<name>.css` (layer ui): block, variants and responsive rules in one file; component tokens on the block.
2. Vue only if it owns behaviour: `components/ui/<Name>.vue`, typed props, `defineModel` for v-model, no `<style>`, under 80 lines.
3. A style guide section with every state (the guard checks that every `ui/*.vue` is referenced there).
4. A row in `spec/design-system.md` (Components) and a changelog line.

**Add or change a token**
1. Primitive (if a new raw value), then semantic in light and dark, then use it.
2. Add the pair to the contrast list if it is text or a boundary.
3. Document it in Tokens and the changelog.
4. A rename keeps the old name as an alias in `tokens-legacy.css` with a comment (deprecated in version X, use --y); the ratchet counts it down.

### 6.2 Guard tests (Vitest, no new dependency)
`tests/unit/designSystem.test.ts` scans `app/assets/css/**/*.css` (comments and `url(...)` stripped) and `app/**/*.vue`, `app/**/*.ts`:
1. **Raw colours**: no hex, `rgb(`, `rgba(`, `hsl(` outside `tokens.css`; none in `.vue`; in `.ts` only in an allowlist (`utils/palette.ts`, `utils/planner/seed*.ts`, `utils/sleep.ts`, `utils/presets.ts`, `utils/store/*` defaults) [assume: list confirmed in 3a].
2. **Font size**: `var(--text-*)`, `inherit`, `1em` or a percent.
3. **Radius**: `var(--radius-*)`, `0`, `50%` or a `calc()` of radius tokens.
4. **z-index**: `var(--z-*)` or an integer 0 to 9.
5. **Motion**: `@keyframes` only in `motion.css`; `animation` only in rules whose selector contains `[data-motion="lively"]`; transition durations only `var(--dur-*)`.
6. **Breakpoints**: every `@media` width is a value of `BREAKPOINTS` (imported from `app/utils/breakpoints.ts`; the min-width twin is +1).
7. **No `<style>` in new `.vue` files**: allowlist of the 16 current files; it may only shrink.
8. **Inline style**: `:style` / `style=` keys are custom properties (`--c`, `--c-ink`, `--v`, `--i`, `--p`, `--d`) or geometry (`left`, `top`, `width`, `height`, `bottom`); never `background`, `color`, `fill`, `stroke`, `border-color`.
9. **Primitive ownership**: a bare selector of a `ui/*.css` block (`.btn`, `.chip:hover`) never appears in `features/*.css`.
10. **`!important`** only in `reset.css`.
11. **Style guide coverage**: every `components/ui/*.vue` name appears in the style guide source.
12. **Docs coverage**: every semantic token in `tokens.css` appears in `spec/design-system.md`, and every token named there exists.
13. **Ratchet**: legacy violations (old token names, legacy `@media` widths, px font sizes, raw z-index, colour keys in `:style`, scoped blocks) are counted against a baseline object at the top of the test. It fails when a count goes up, and also when it goes down without the baseline being lowered, so progress is recorded in the same PR. The failure message prints the new number.

`tests/unit/designContrast.test.ts` resolves `tokens.css` (primitive to semantic, per theme and per part) with `contrastRatio` from `palette.ts`:
- Text, at least 4.5: `--ink`, `--ink-2`, `--ink-3` on `--paper`, `--surface`, `--surface-2`, `--am-1`, `--am-2` (every part, both themes); `--accent` on `--paper` and `--surface` (links); `--accent-ink` on `--accent`; `--warn-ink` on `--warn-bg`; `--ink-inverse` on `--ink` (tooltip, toast); `--danger` on `--surface`.
- Non-text, at least 3: `--control-border`, `--cell-line`, `--focus` on `--paper` and `--surface`; `--accent` on `--accent-soft` (pressed chip edge).
- `SURFACE` in `palette.ts` equals `--surface` and `--paper`; every `DESIGN_COLORS` swatch through `fillFor` reaches 3:1 on both surfaces in both themes; `inkOn(fill)` reaches 4.5 or is in the known-limit list.
- The restriction that keeps this parseable: a semantic colour token is a hex or `var(--primitive)`; `color-mix()` only in feature CSS, never as a semantic colour in a text pair.

Already there: `fileSize.test.ts` (400 lines; it also covers `app/dev/`).

---

## 7. Documentation

`spec/design-system.md` (new; authoritative for the system). `frontend-design.md` keeps layout, screen parts, voice and the a11y checklist and links here; its sections 2, 4.4 to 4.8 and 5 move here in 3a.
1. Principles and do-not-build (section 1).
2. Tokens: one table per group (name, light, dark, use, contrast), the concentric radius picture, the z scale, breakpoints.
3. Modes: theme, motion, part; the prepaint script; the preference keys.
4. Area colours: `fillFor`, `areaVars`, the tint rule.
5. CSS architecture: layers, files, naming, ownership.
6. Components: one entry each (when to use, classes or props, slots, emits, a11y, states, file).
7. Motion: keyframe vocabulary, durations, the lively gate, what Calm keeps.
8. Recipes (6.1).
9. Guards (6.2) and how to read a failure.
10. Deprecations: old name, new name, deprecated in, removal target, remaining count.
11. Changelog: dated entries with the app version ("0.0.2, 2026-11-xx: added --text-hero; changed dark --accent to #9ab8f5"). No separate semver for the system.

**Living style guide** [rec]: a dev route that renders the real components with the real CSS.
- `app/dev/StyleGuide.vue` (theme, motion and part switches at the top, section index) plus `app/dev/styleguide/Tokens.vue`, `Controls.vue`, `Feedback.vue`, `Data.vue` (each under 200 lines). Tokens shows computed values with live contrast numbers per pair; area swatches run through `fillFor`.
- Registered only in dev, or when built with `TIMELY_STYLEGUIDE=1`, through `hooks["pages:extend"]` in `nuxt.config.ts` (route `/_styleguide`). Normal production builds do not contain it; a scratch production build can be screenshotted. Same CSP, no new script.
- Not a static HTML in `spec/` (drifts from the real CSS); not Histoire (a dependency and a second build).

---

## 8. Sequencing with the 12 slices

| Slice | Design system work |
|---|---|
| 2 (Vuetify out) | Removes the `.v-application` `!important` rules. Prerequisite for layers (Vuetify CSS is unlayered and would beat them). |
| **3a** Tokens, layers, guards (1 session) | (1) `@layer` statement, the 20 files into `features` in their current order, `reset.css`, `utilities.css`, `motion.css`; pixel-identical screenshots. (2) Three-tier `tokens.css` with A2 values + `tokens-legacy.css`; `palette.ts` two surfaces + `FALLBACK_*`; `breakpoints.ts`. (3) `prefs.ts`, `usePref`, `useTheme`, `useMotion`, `motion.ts`, `prepaint.ts` + the head script. (4) Guard and contrast tests with the current baseline. (5) `spec/design-system.md` skeleton and the moves out of frontend-design.md. |
| **3b** Primitives + style guide (1.5 sessions) | `ui/*.css` from the legacy button, form, list, section, shared and layout files; `UiIcon`, `UiRing` (replaces AdherenceRing), `UiSwitch` (SleepToggle, dark switch), `UiSegmented` (Motion in Account), `UiTick`, `UiDialog` (ResetDataDialog); the style guide route; the ambient layer in `motion.css`; docs Components. |
| 4 Shell | Rail, tab bar, top bar in `features/shell.css`; sub-nav as `.seg-nav` links; `UiIcon`; `--z-*` for the bars and the grid popups (29/30 become `--z-popover`). |
| 5 Today | `features/today.css` replaces `home.css`; `UiTick`, `.card-focal`, `.pill`, `.bar`, `UiRing`; no scoped CSS. |
| 6 Week | `v-tip` + `shell/Tooltip.vue` (first chart tips); the scoped CSS of TimeSplitDonut moves to `features/week.css` (ratchet); block tint rule (2.4). |
| 7 Year | `.bar-stack`; year squares on tokens; legacy widths 1024 and 1280 folded. |
| 8 Progress | `shell/Toast.vue` + `useToast`; `UiDialog` for the recap; `features/progress.css` replaces `insights.css` + `adherence.css`. |
| 9 First run | `UiDialog` (Replay warning); full page at `--z-overlay`; the tour CSS in `onboarding.css` deleted. |
| 10, 11 | Motion vocabulary only from `motion.css`; `useViewTransition`; milestone toasts. |
| 12 | `tokens-legacy.css` deleted (ratchet at 0), remaining scoped blocks moved, docs final. |

Every slice after 3b: (a) uses tokens and existing primitives, (b) adds a primitive only through the recipe, (c) lowers the ratchet for the legacy it replaced, (d) adds a changelog line when a token or primitive changes.

**Reusable paragraph for every doer brief:**
> Design system rules (spec/design-system.md, enforced by `npm test`): use only `var(--...)` tokens for colour, font size, spacing, radius, shadow, duration and z-index; no raw hex, px font sizes or z-index above 9 outside `app/assets/css/tokens.css`. New `.vue` files have no `<style>` block: put CSS in `app/assets/css/features/<area>.css` (selectors prefixed `<area>-`) and import it in `main.css` under `layer(features)`; never restyle a bare primitive selector (`.btn`, `.chip`, `.card`) there, use a contextual selector. Use existing classes and `Ui*` components before writing markup; add a new `Ui*` component only if it owns ARIA state, focus, keys or timing, following the "Add a primitive" recipe (CSS in `assets/css/ui/`, a style guide section, a docs row). Life area colours reach CSS only as `:style="areaVars(color)"` (`--c`, `--c-ink`). State goes in ARIA attributes; targets are at least `var(--hit)`. Animations only under `:root[data-motion="lively"]` with keyframes from `motion.css`; Calm must still show every number and state. Logic goes in `app/utils` with tests. If the design guard reports a lower legacy count, lower the baseline in `tests/unit/designSystem.test.ts` in the same commit. Add no dependency.

---

## 9. Risks and estimate

| Risk | Mitigation |
|---|---|
| `@import ... layer()` not inlined as expected by Vite/Nuxt [assume] | Check the built CSS in 3a step 1; fallback: in-file `@layer` wrapping |
| Unlayered scoped styles now beat all global CSS; a global rule that won before by specificity may lose | Pixel compare in 3a step 1 (the capture scripts of `refactor/split-views`); fix by moving that scoped rule into its feature file |
| Aliases make old screens look half-A2 between slices (cards on paper, mixed radii) | Accepted in dev mode; alias `--radius` to `--radius-sm` and `--bg` to `--surface` so it reads coherent; screenshots in 3a |
| Regex guards give false positives (URLs, SVG data, comments) | Strip comments and `url(...)` first; allowlist by file, not by line; scanner under about 120 lines with its own small test |
| Ratchet friction for the doer | The failure message prints the new number and the line to change; the brief paragraph says so |
| Native `<dialog>` quirks (scroll lock, iOS sheet) | `overscroll-behavior: contain`, `body:has(dialog[open]) { overflow: hidden }`; check at 400 touch |
| Contrast with the A2 palette (ink-3 on ambient tints, dark accent on accent-soft) | The contrast test runs on every part and theme |
| `fillFor` against two surfaces darkens some user colours a little more | Documented; the swatch test lists every change |
| Scope creep into a component library | Section 1 do-not-build; the reviewer rejects a `Ui*` with no ARIA, focus, keys or timing reason |

Estimate (doer sessions): 3a **1** (1.5 if the layer import needs the fallback), 3b **1.5 to 2**, plus about **0.25 per later slice** for ratchet and docs upkeep, mostly offset because the primitives make slices 5 to 9 cheaper. Net: slice 3 grows from 1.5 to about **2.5 to 3** sessions; the migration total goes from about 20 to about **21 to 22**. Confidence medium.

---

## 10. Open questions for the owner (each with a recommendation)

1. **Two surfaces (paper and card), as in A2?** Rec: yes; it is the A2 look, and `fillFor` checks both.
2. **Tinted blocks with a solid edge (A2) instead of "No softening"?** Rec: yes, with the rule in 2.4 (the solid edge carries 3:1; text on the tint is `--ink`).
3. **Breakpoint 768 instead of the 760 of A2?** Rec: 768 (matches `focus.ts` and every current phone rule).
4. **Guards as Vitest tests, no stylelint?** Rec: Vitest only; revisit stylelint if the scanner passes 150 lines.
5. **Style guide as a dev-only route (`/_styleguide`, also with `TIMELY_STYLEGUIDE=1`)?** Rec: yes; no static copy, no Histoire.
6. **Font sizes in rem (respects the browser font size) instead of the px of A2?** Rec: rem in tokens; the same pixels at the default size.
7. **Delete `AdherenceRing.vue` and `SleepToggle.vue` for `UiRing` and `UiSwitch`?** Rec: yes, in 3b.
8. **Ratchet that also fails on an unrecorded improvement?** Rec: yes (keeps the baseline true); if it feels too strict, switch to fail-on-increase only.
9. **`spec/design-system.md` takes tokens and components over from `frontend-design.md`?** Rec: yes; frontend-design.md keeps layout, screens, voice and a11y.
10. **Toast and tooltip built only when first needed (slices 8 and 6), not in 3b?** Rec: yes (grow by need).
