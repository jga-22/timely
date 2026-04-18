# Weekly Planning App — PRD & Design Document

## 1. Product overview

A lightweight personal web app that helps users model their **theoretical week**,visualize how their time is distributed, simulate future trajectories, and compare planned weeks with real-life exceptions such as vacations, days off, or route changes.

The product is intentionally simple:
- no required backend
- no required login
- no separate database at first
- local-first storage in the browser
- easy to publish and share publicly

---

## 2. Product vision

Help people become more intentional about how they spend their time by making weekly planning visible, measurable, and easy to simulate over months and years.

This is not a task manager.
This is not a calendar replacement.
This is a **time-allocation planning and reflection tool**.

---

## 3. Problem statement

People often have a vague idea of how they want to spend their week:
- work hours
- family time
- learning
- sports
- reading
- side projects
- rest

But they usually do not have:
- a simple way to design a full theoretical week
- a visual repartition of time by category
- a way to model recurring schedules
- a way to apply the plan to actual calendar weeks
- a way to simulate long-term outcomes if they maintain the same allocation over time

Traditional tools such as calendars and task managers focus on day-to-day execution, not on **weekly structure and life direction**.

---

## 4. Goals

### Primary goals
- Let users define a theoretical week using time blocks.
- Show how time is distributed by activity and category.
- Let users save multiple weekly templates.
- Let users apply a template to real weeks.
- Let users mark exceptions such as vacation, days off, holidays, or custom changes.
- Generate simple insights about where time goes.
- Estimate long-term accumulation over months and years.

### Secondary goals
- Make the app work offline or mostly offline.
- Keep the architecture minimal.
- Avoid backend complexity in v1.
- Make the app easy to host statically.

### Non-goals for v1
- Full calendar sync.
- Team collaboration.
- Authentication.
- Mobile native app.
- AI-generated coaching as a core dependency.
- Advanced habit tracking.

---

## 5. Target users

### Primary user
A reflective individual who wants to intentionally design their week and understand how their time distribution affects long-term life outcomes.

### Secondary users
- professionals balancing work, family, learning, and health
- students organizing study and personal development
- parents planning family routines
- creators tracking project time and growth

---

## 6. User needs

Users need to:
- create a weekly plan quickly
- define reusable activities and categories
- assign colors and short labels
- see charts summarizing time distribution
- compare ideal week vs applied weeks
- add week-level exceptions
- answer questions such as:
  - How much time do I spend on work vs personal growth?
  - How much reading or sport time will I accumulate in one year?
  - What happens if I keep this weekly structure for 3 years?
  - Which weeks are affected by vacation or time off?

---

## 7. Key product principles

1. **Local first**  
User data stays in the browser by default.

2. **Fast interaction**  
Editing a weekly grid should feel immediate.

3. **Visual clarity**  
The grid and charts should explain the week at a glance.

4. **Low friction**  
No login, no setup burden.

5. **Progressive complexity**  
Basic usage should be easy, while simulations and exception handling can be layered on top.

---

## 8. Core user stories

### Weekly template creation
- As a user, I want to create a weekly template with hourly or half-hour blocks so that I can model my ideal week.
- As a user, I want to assign one activity to a time range across multiple days at once so that repeating routines are fast to create.
- As a user, I want to define categories and activities so that I can group time meaningfully.
- As a user, I want to color-code activities so that the grid is easy to read.

### Visualization
- As a user, I want to see how many hours per week I allocate to each activity.
- As a user, I want to see percentage repartition by category.
- As a user, I want to visualize my week by day and by category.

### Planning real weeks
- As a user, I want to apply a template to a given week number or date range.
- As a user, I want to mark a week as vacation or custom mode.
- As a user, I want to override specific days or time blocks for a week.

### Simulation and insight
- As a user, I want to estimate how much time I will spend on each category over 6 months, 1 year, or 5 years.
- As a user, I want simple interpretations of my current structure.
- As a user, I want to compare multiple templates such as normal week, vacation week, and intense project week.

---

## 9. Functional requirements

## 9.1 Weekly template editor
The app must allow the user to:
- Create, update and delete weekly templates
- Select a day of the template and apply the different categories per block time


## 9.2 Categories and activities
The app must allow the user to:
- create categories
- create activities linked to categories
- define:
  - activity name
  - short code
  - color
  - category
- edit and delete activities

Example categories:
- Work
- Health
- Family
- Learning
- Personal Care
- Leisure
- Projects
- Sleep

## 9.3 Charts and analytics
The app must show:
- total hours by activity
- total hours by category
- percentage of weekly time by category
- stacked distribution by weekday
- optional cumulative projection over time

## 9.4 Week application
The app must allow the user to:
- create date-based week instances
- assign a template to specific weeks
- mark a week with a status:
  - normal
  - vacation
  - off
  - custom
- override selected cells for a given week instance

## 9.5 Simulation engine
The app must calculate:
- weekly totals
- monthly estimates
- yearly estimates
- multi-year cumulative totals
- estimates based on selected template repetition
- estimates adjusted for excluded weeks such as vacation/off weeks

## 9.6 Local persistence
The app must persist data in-browser using:
- localStorage for simplest version
- or IndexedDB if data structure grows

## 9.7 Import/export
The app should support:
- export full app state as JSON
- import JSON backup
- reset all data

---

## 10. Nice-to-have features

Not required for v1, but useful later:
- recurring exceptions
- public share link with encoded state
- printable weekly summary
- dark/light themes
- predefined life scenarios
- compare planned vs actual logged time
- AI-generated recommendations
- calendar export (.ics)
- PWA installable experience

---

## 11. Success criteria

For a personal v1, success means:
- I can define one or more weekly templates without a backend.
- I can reopen the app and keep my data.
- I can visualize time distribution immediately.
- I can simulate 1-year and 5-year accumulation.
- I can mark vacation weeks and see adjusted projections.
- The app feels simple enough to keep using.

Potential measurable metrics later:
- time to create first weekly template under 10 minutes
- return usage at least once per week
- fewer than 3 clicks to access insights from the main screen

---

## 12. MVP scope

### In scope
- weekly grid editor
- categories and activities management
- charts for hours and percentages
- save multiple templates locally
- create week instances
- mark weeks as normal/vacation/off/custom
- simple cumulative projections
- JSON import/export

### Out of scope
- authentication
- multi-user sync
- backend database
- real calendar integration
- push notifications

---

## 13. UX concept

### Main navigation
A simple layout with 4 main sections:
1. **Planner**
2. **Templates**
3. **Applied Weeks**
4. **Insights**

### Planner screen
Contains:
- recurring block builder
- weekly templae setup
- activity palette
- category/activity table
- quick actions: apply block, clear block, erase, copy day, clear week
- summary charts below or beside the grid
- visual summary of the template time repartition

### Templates screen
Contains:
- list of saved templates
- duplicate / rename / delete
- preview card of weekly distribution

### Applied Weeks screen
Contains:
- calendar-style list of weeks
- template assigned to each week
- week status badge
- button to override specific days

### Insights screen
Contains:
- weekly totals
- projections over months/years
- scenario comparison
- short textual insights

---

## 14. Suggested user flow

### First-time flow
1. Open app
2. Create categories and activities
3. Add recurring activity blocks by selecting activity, time range, and days
4. Save as “Standard Week”
5. Refine exceptions in the weekly grid if needed
6. Review charts
7. Apply template to future weeks
8. Mark vacation weeks
9. Open insights and projections

### Repeat flow
1. Open app
2. Select template or week
3. Adjust one or two blocks
4. Review updated projections

---

## 15. Information architecture

```text
App State
├── settings
│   ├── timeGranularity
│   ├── theme
│   └── projectionDefaults
├── categories[]
├── activities[]
├── templates[]
│   ├── id
│   ├── name
│   ├── description
│   └── grid
├── appliedWeeks[]
│   ├── id
│   ├── startDate
│   ├── templateId
│   ├── status
│   ├── overrides
│   └── notes
└── insightsCache
```

---

## 16. Data model proposal

## 16.1 Category
```ts
interface Category {
  id: string
  name: string
  color?: string
}
```

## 16.2 Activity
```ts
interface Activity {
  id: string
  name: string
  shortCode: string
  categoryId: string
  color: string
}
```

## 16.3 Template
```ts
interface WeekTemplate {
  id: string
  name: string
  description?: string
  granularityMinutes: 60 | 30
  slots: string[]
}
```

`slots` is a flattened grid of activity IDs.
For hourly slots:
- 24 hours × 7 days = 168 cells
For 30-minute slots:
- 48 × 7 = 336 cells

## 16.4 Applied week
```ts
interface AppliedWeek {
  id: string
  startDate: string
  templateId: string
  status: 'normal' | 'vacation' | 'off' | 'custom'
  overrides?: Record<string, string>
  notes?: string
}
```

`overrides` maps slot index to activity ID.

## 16.5 Projection settings
```ts
interface ProjectionSettings {
  years: number
  excludedWeekStatuses: Array<'vacation' | 'off'>
}
```

---

## 17. Technical design

## 17.1 Recommended stack
For simplicity, the best stack is:
- **Frontend framework:** Nuxt or Vue
- **UI:** simple CSS or Tailwind
- **Charts:** Chart.js or ECharts
- **State:** Pinia
- **Persistence:** localStorage first, IndexedDB later if needed
- **Hosting:** Vercel, Netlify, or Cloudflare Pages

### Best recommendation for your use case
Because you already know Vue well, a very pragmatic choice is:
- **Nuxt 4 or latest Nuxt stable** for app structure and simple deployment
- **Pinia** for state
- **localStorage** persistence plugin
- **Chart.js** for first charts

This keeps everything in one codebase without a separate backend.

## 17.2 Why this stack
- no API layer required
- fast MVP delivery
- easy static deployment
- familiar developer experience
- simple client-side persistence
- later extensible to backend if needed

---

## 18. Architecture overview

```text
Browser App
├── UI Layer
│   ├── RecurringBlockEditor
│   ├── WeeklyGrid
│   ├── ActivityPalette
│   ├── TemplateToolbar
│   ├── TemplateList
│   ├── WeekCalendar
│   └── InsightsPanel
├── State Layer
│   ├── categories store
│   ├── activities store
│   ├── templates store
│   ├── applied weeks store
│   └── settings store
├── Domain Layer
│   ├── grid utilities
│   ├── recurring block application utilities
│   ├── aggregation engine
│   ├── projection engine
│   └── import/export utilities
└── Persistence Layer
    └── browser storage adapter
```

---

## 19. Key technical decisions

### Decision 1: local-first persistence
Store data in the browser so the app remains extremely simple.

**Pros**
- no backend
- no user account management
- no infrastructure cost
- immediate performance

**Cons**
- data tied to device/browser unless exported
- no sync across devices

### Decision 2: template + applied week model
Separate the ideal recurring week from real instantiated weeks.

**Pros**
- clean conceptual model
- supports projections and exceptions
- easy to compare normal week vs actual plan

### Decision 3: derived analytics in memory
Compute charts and insights from current state in memory.

**Pros**
- very fast for small datasets
- no need for server-side aggregation

### Decision 4: slot-based canonical model with block-based authoring
Store templates as flattened slot arrays, while exposing a recurring block builder in the UI.

**Pros**
- fast template creation for repeating weekly routines
- keeps analytics and persistence simple
- allows fine-grained refinement without changing the underlying model

**Cons**
- requires conversion logic from block actions to slot updates
- the UI needs to explain the difference between quick authoring and detailed refinement

---

## 20. Core computation logic

## 20.1 Weekly aggregation
For each slot:
- get activity
- map activity to category
- add slot duration to totals

## 20.1.b Recurring block application
For a block action:
1. select activity
2. select start and end time
3. select one or more days
4. resolve corresponding slot indexes
5. write the activity ID into those slots

The recurring block editor is only an authoring shortcut.
The canonical stored template remains `slots: string[]`.

## 20.2 Applied week resolution
For a given week:
1. load base template
2. apply week status logic
3. apply slot overrides
4. compute final totals

## 20.3 Projection logic
For selected future range:
1. determine included weeks
2. assign template or default template
3. exclude or reduce vacation/off weeks
4. sum activity/category hours
5. convert to months/years and percentages

Example output:
- Work: 1,920 h/year
- Reading: 156 h/year
- Sport: 208 h/year
- Personal Project: 312 h/year

---

## 21. Performance considerations

This app is lightweight by nature.
Even client-side computation is sufficient because:
- grid sizes are small
- week records are limited
- analytics are basic aggregates

Optimization ideas:
- keep normalized state
- memoize chart datasets
- debounce persistence writes
- optionally move from localStorage to IndexedDB if storing many week instances

---

## 22. Security and privacy

### v1 privacy posture
- no login
- no cloud sync
- no personal data required
- all data stays local unless user exports it

### Risks
- local browser storage can be lost if user clears browser data
- shared devices reduce privacy

Mitigation:
- encourage regular JSON export
- optional auto-backup download later

---

## 23. Error handling

The app should gracefully handle:
- corrupted local storage
- invalid imported JSON
- deleted activities referenced by templates
- missing template on applied week

Strategy:
- validate imported data with schema checks
- display non-blocking warnings
- offer repair options where possible

---

## 24. Testing strategy

### Unit tests
- grid indexing utilities
- aggregation engine
- projection engine
- import/export validation

### Component tests
- weekly grid interactions
- activity assignment
- charts rendering with known data

### Manual tests
- create template
- save and reload browser
- apply template to weeks
- mark vacation weeks
- verify projections change correctly

---

## 25. Rollout approach

### Phase 1 — local MVP
- build planner
- add charts
- save in browser
- support JSON export/import

### Phase 2 — practical planning
- add applied weeks
- add vacation/off/custom status
- add projections

### Phase 3 — polish
- better mobile responsiveness
- PWA support
- richer comparisons
- shareable templates

---

## 26. Suggested screen list

1. **Home / Planner**
2. **Manage Activities**
3. **Templates**
4. **Applied Weeks**
5. **Insights / Projection**
6. **Settings / Import-Export**

---

## 27. Suggested MVP UI components

- `RecurringBlockEditor.vue`
- `WeeklyGrid.vue`
- `ActivityPalette.vue`
- `TemplateToolbar.vue`
- `DayCopyControls.vue`
- `CategoryManager.vue`
- `TemplateCard.vue`
- `WeekAssignmentPanel.vue`
- `HoursBarChart.vue`
- `CategoryStackedChart.vue`
- `ProjectionSummary.vue`
- `ImportExportPanel.vue`

---

## 28. Open questions

Before implementation, these product questions should be decided:

1. Should v1 use hourly blocks only, or support 30-minute blocks from day one?
2. Should sleep be included in the week by default?
3. Should users plan only one theoretical week or multiple scenario templates?
4. Should applied weeks use ISO week numbers, date ranges, or both?
5. Should vacation weeks be fully excluded or categorized separately?
6. Do you want insights to stay descriptive or become prescriptive?
7. Is mobile-first editing a priority from the beginning?

---

## 29. Recommended final direction

For your case, the best first version is:
- **Nuxt + Pinia + localStorage + Chart.js**
- one-page planner with side panels
- hourly grid only in v1
- recurring block builder as the default creation flow
- weekly grid as the refinement flow
- multiple templates
- week application and vacation marking
- simple cumulative projections
- JSON import/export

That gives you a real usable product quickly, with almost no infrastructure burden.

---

## 30. Proposed MVP backlog

### Epic 1 — foundation
- initialize app
- define data models
- create Pinia stores
- add persistence layer

### Epic 2 — planner
- build recurring block editor
- build weekly grid refinement surface
- build activity/category manager
- implement block apply/clear interactions
- implement paint/edit interactions

### Epic 3 — analytics
- compute totals
- add bar chart
- add percentage stacked chart

### Epic 4 — templates and weeks
- save templates
- assign template to calendar weeks
- add week status and overrides

### Epic 5 — insights
- build projection engine
- add summary cards
- add scenario comparisons

### Epic 6 — portability
- import/export JSON
- reset and recovery flows

---

## 31. Future evolution path

If the app becomes useful to more people, later you can add:
- optional cloud sync
- user accounts
- collaborative family planning
- actual time tracking
- calendar integration
- AI insights based on long-term behavior

But none of that is needed now.

---

## 32. Final recommendation

Build this as a **local-first Nuxt web app**.

It is the best balance between:
- simplicity
- speed of development
- maintainability
- zero backend overhead
- public shareability

The concept is strong because it sits between life design, planning, and simulation rather than simple scheduling.
