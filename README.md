# timely

Nuxt scaffold for a local-first weekly planning app based on `spec/weekly_planner_prd_and_design_doc.md` (see `spec/README.md`).

## Stack

- Nuxt 4
- Pinia
- browser `localStorage` persistence

## Scripts

```bash
npm install
npm run dev
npm run build
```

## Current scaffold

- seeded planner state with categories, activities, one weekly template, and applied weeks
- Pinia store with local persistence
- planner dashboard page showing the weekly grid, weekly totals, and yearly projections
- Goals (Harada) tab: a 3x3 grid with a 5-year ambition and eight dimensions, each with a 5-year goal, daily/weekly habits (optionally linked to a Timely activity with minutes per occurrence), and a measurable 1-year target; Insights compares scheduled time per dimension with habit targets
