# Changelog

All notable changes to Timely, newest first. Versions follow [Semantic Versioning](https://semver.org/); `0.x` is dev mode: no production users, no backward compatibility promised. Saved state version is 8.

## 0.0.2 - lighter app

The app downloads less. The screens look and behave as before.

### Changed
- Smaller download: the main style sheet drops from about 560 KB to about 52 KB (from 90 KB to 10 KB compressed).
- Dark mode works as before: the same switch in the Account menu, and the choice is kept across reloads.

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
