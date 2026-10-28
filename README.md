# Timely

A local-first weekly planner joined to a Harada goals grid. You write one 5-year ambition, split it into eight life areas with measurable habits, and plan a week of hour slots. Timely then shows whether the time you plan matches the time your habits need.

- **Home:** today's hours, today's activities and a journal note for any past day.
- **Goals:** the ambition, eight life areas (goal, 1-year target, habits), and a comparison of needed against planned time. A List or Grid view shows the Harada map.
- **Week:** a typical week painted in hour slots, activities, week types (Standard, Vacation and others, from presets) and the year, one ISO year at a time.
- **Insights:** planned hours by life area over a year or several.

First-time users get a short guided setup (ambition, one or two goals with a habit each, then a tour). The app works without an account: data stays in the browser. With an account (Google sign-in) it is stored in Supabase, one row per user.

## Stack

Nuxt 4, Vue 3, Pinia, TypeScript. Vuetify is used only as a neutral shell. Storage is pluggable: browser `localStorage` (default) or Supabase. There is no Timely backend. Hosting is on Vercel, with Vercel Web Analytics (page views, no cookies).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000, data in this browser
npm run build        # production build, must stay clean
npm run preview      # serve the production build
npx nuxi typecheck   # must stay at 0 errors
```

If `npx nuxi typecheck` cannot find `vue-tsc`, run `npm i --no-save --legacy-peer-deps vue-tsc@3 @vue/language-core@3` (never commit that change).

## Configuration

Copy `.env.example` to `.env`. With nothing set, Timely saves to the browser.

| Variable | Meaning |
| --- | --- |
| `NUXT_PUBLIC_STORAGE` | `local` (default) or `supabase` |
| `NUXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | publishable (anon) key; never put a secret key here |

Supabase mode also needs the `planner_state` table and Google sign-in set up. Steps, SQL and the Google client are in `spec/database/README.md`. The Google client secret stays in the Supabase dashboard, never in `.env` or Vercel.

## Deploying on Vercel

Set the three variables above for the project and add the deployed URL to Supabase (Authentication, URL configuration) and to the Google client's authorised origins. Enable Web Analytics in the project settings; the script is added automatically on Vercel builds.

## Documentation

- `CLAUDE.md` and `.claude/agent.md`: working context for Claude Code sessions (structure, decisions, conventions, open items).
- `spec/README.md`: index of the specs and a changelog since the PRD.
- `spec/weekly_planner_prd_and_design_doc.md`: the product requirements.
- `spec/frontend-design.md`: the visual style and components.
- `spec/database/`: Supabase storage.
- `spec/screens/`: reference screenshots.

Terms and the Privacy Policy are at `/terms` and `/privacy` in the app. The text has not been legally reviewed.
