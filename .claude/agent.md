# Timely: agent context

Shared context for any Claude Code session working on this repo. Read it first, then the specs it points to. Keep it short and current: update it when a decision, convention or open item changes.

## What this is

Timely is a local-first planning app. It combines two ideas:

- **The why (goals):** a Harada grid. One 5-year ambition, 8 life areas (categories), each with a 5-year goal, a 1-year target and measurable daily habits.
- **The time (planner):** a weekly template of hour slots, applied across the 52 weeks of the year, with projections and insights.

The link between them is the product: a habit points at an activity, and Insights compares the time scheduled for those activities with the time the habits ask for.

The owner is a solo developer. The app is still in dev mode: no production users, no backward compatibility needed.

## Stack and commands

Nuxt 4, Vue 3, Pinia, Vuetify (neutralised, see the style spec), TypeScript. State persists in browser `localStorage`; there is no backend.

```bash
npm run dev                 # dev server (dev-only 404s for Vuetify/mdi @fs CSS are known and harmless)
npm run build               # production build; must stay clean
npx nuxi typecheck          # must stay at 0 errors
```

If `npx nuxi typecheck` cannot resolve vue-tsc, run `npm i --no-save vue-tsc@3 @vue/language-core@3` (never commit that to `package.json` or the lockfile).

## Where things are

- `app/app.vue`: app shell, topbar, tab list, theme toggle.
- `app/pages/index.vue`: switches the view by the active tab id.
- `app/components/harada/`: Goals view (`HaradaView.vue`, `HabitList.vue`).
- `app/components/AutoTextarea.vue`: shared auto-growing textarea.
- `app/components/planner/`: `PlannerView.vue` (week grid + year grid), `InsightsView.vue`, `LegendView.vue` (the Configuration tab).
- `app/types/planner.ts`: data model. `app/utils/planner.ts`: seed data, state validation, pure calculations. `app/stores/planner.ts`: Pinia store and actions.
- `app/utils/storage/` and `app/plugins/planner-persistence.client.ts`: localStorage persistence.
- `app/assets/css/main.css`: all design tokens and styles. `vuetify.config.ts`: Vuetify themes (`timely`, `timelyDark`).
- `spec/`: specifications (below). `design/` is an old gitignored design export with the previous look; do not use it.

## Specs (read before changing behaviour or UI)

- `spec/README.md`: index of the specs and what changed since the PRD.
- `spec/frontend-design.md`: the current visual style, tokens, components and rules. **Authoritative for any UI work.**
- `spec/weekly_planner_prd_and_design_doc.md`: the PRD (v3, target structure with requirement IDs and acceptance criteria). `spec/build-plan.md`: slice-by-slice build plan.
- `spec/references/grille-harada-meilleure-version.html`: the original Harada prototype; origin of the palette and the Goals layout.

## Target structure (in progress)

The product is moving to Home · Goals · Planner · Visualization (Insights and Configuration removed). The decisions, requirements and acceptance criteria are in `spec/weekly_planner_prd_and_design_doc.md` (v3); the slice-by-slice plan is `spec/build-plan.md`. Work on branch `feat/home-and-new-structure`, one slice at a time, one commit per slice. Sections below that describe the CURRENT build (navigation order, Configuration tab, drag-select week grid) are superseded slice by slice; update them as each slice ships.

## Model and decisions

- **One list of categories.** Goal dimensions and planner categories are the same thing. `Category` has `id, name, color, order` plus `goal5y, target1y, targetTbd`. The first 8 categories by `order` form the 3x3 Goals grid. Categories are managed only in the Configuration tab.
- **Activities are a separate level** under a category. **Habits** belong to a category, are measurable (frequency count per day/week/month plus optional `minutesPerOccurrence`) and may link to an activity.
- **Insights compares like with like:** per category, the hours scheduled through the activities its habits link to, against the hours those habits ask for. A quiet second line shows everything scheduled in the category. An activity is never counted in two categories.
- **Navigation order is Goals, Planner, Insights, Configuration.** Goals is the default tab. Templates are still managed in the Planner's template switcher, not in Configuration.
- **Storage has no migrations.** The saved state carries `version` (`PLANNER_STATE_VERSION`). A version mismatch or an invalid or corrupt state is discarded and replaced by the seeded default. Bump the version whenever the stored shape changes. Keep the seed in `app/utils/planner.ts` a good test dataset (several categories with linked habits so Insights shows real bars).
- **UI language is English.** User-entered content can be in any language.
- **Style:** one font (IBM Plex Sans), calm blue palette, minimalist, light and dark themes. Details in `spec/frontend-design.md`. Do not reintroduce serif or mono fonts or the old terracotta accent.

## Working conventions

- **Delegate implementation to the `doer` agent** to save tokens, with explicit file paths, steps and verification. The lead session plans, reviews screenshots and reports. Give the doer a clear "commit / do not commit / push" instruction every time.
- **Commit and push only when the owner asks.** Never push to `main`. Stage specific files by name, never `git add -A`. Never touch the owner's untracked files.
- **Commit messages** are conventional (`feat:`, `fix:`, `style:`, `chore:`), and end with a blank line and these trailers:
  ```
  Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01F4QzgWo6pmyzMMJzrBAvTG
  ```
  (Use the trailers the session's system reminder gives if they differ.)
- **Line endings:** the working copy is CRLF and the repo stores LF. Keep CRLF on edited files.
- **Verify UI work visually.** Build for production, serve `.output/server/index.mjs`, and take headless-Edge screenshots with `puppeteer-core` installed in the session scratchpad, never in the repo. Check 1280px and 400px, light and dark, no horizontal overflow, no console errors. Look at the screenshots; do not trust only automated checks.
- **Permissions:** the owner's personal setup is in `.claude/settings.local.json` (gitignored): edits are accepted automatically, build/typecheck/read-only git are allowed, and `git push`, installs and `rm` still ask.
- **Tools on this machine:** Windows 11, Git Bash and PowerShell. The GitHub CLI (`gh`) is not installed, so PRs are opened by the owner through the compare link; PR text is handed over to paste.

## Current state

- Branch `feat/harada-goals` (the base of the new work), open as PR #7 against `main` (`https://github.com/jga-22/timely`). All earlier fixes (`fix/mobile-version`, `fix/planner`) are already in `main`.
- Shipped on the branch: Goals tab, merged categories, measurable habits, English seed, auto-growing text boxes, calm single-font redesign (light and dark), new navigation order, typecheck cleanup, removal of unused legacy components.
- The `spec/` folder and this file may still be uncommitted; check `git status`.

## Open items and ideas

- Move template management into Configuration (today it lives in the Planner's template switcher).
- Most seeded habits are not linked to activities yet; Economic and Social have no activities (Environment has Errands), so they show "No target yet". Add activities and link habits in the app or the seed.
- "Hydration completed but contains mismatches" appears in the console when the saved state differs from the seeded default (the server renders the seed, the client restores storage). Not proven to predate the branch; a client-only wrapper would remove it but changes server output.
- Annual and quarterly habits are approximated as monthly (frequency only supports day/week/month).
- The owner runs Node v24.12.0, which predates several 2026 security releases; they plan to update to the latest 24.x LTS. Optionally add `.nvmrc` and `engines` to pin a minimum.
- Not yet checked visually: dark theme beyond overflow, the weekly/monthly Insights charts after the redesign.
- PR #7's title and description are outdated; the owner updates them from text we provide.
