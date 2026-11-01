# Changelog

All notable changes to Timely, newest first. Versions follow [Semantic Versioning](https://semver.org/); `0.x` is dev mode: no production users, no backward compatibility promised. Saved state version is 8.

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
