# Timely data model (PostgreSQL / Supabase)

Status: **draft, not built**. The app stores one JSON document in `localStorage` today (`PlannerState`, storage version 8). This file defines the relational model that would replace it. The DDL is in `schema.sql`; the diagram is in `erd.drawio` and `erd.mmd`. Decision pending with the owner (see `../../.claude/agent.md`).

The source of truth for the shape is `app/types/planner.ts`; the seed and validation are in `app/utils/planner.ts`; the actions are in `app/stores/planner.ts`.

## 1. Mapping from the TypeScript model

| TypeScript (`PlannerState`) | Table | Notes |
| --- | --- | --- |
| `ambition: Ambition \| null` | `ambitions` | At most one row per user; no row means `null`. |
| `categories: Category[]` | `categories` | `order` is `sort_order`. Goal fields snake_cased. |
| `activities: Activity[]` | `activities` | `categoryId` is the primary category (NOT NULL). |
| `Activity.alsoCategoryIds` | `activity_extra_categories` | One row per secondary category (many-to-many). |
| `habits: Habit[]` | `habits` | `frequency` is split into `frequency_count` and `frequency_period`. |
| `templates: WeekTemplate[]` | `templates` | Without `slots`; list order kept in `sort_order`. |
| `WeekTemplate.slots: string[]` | `template_slots` | One row per painted hour (section 4). |
| `appliedWeeks: AppliedWeek[]` | `applied_weeks` | Keyed by ISO year and week; `id` is dropped (it was derived). |
| `settings.activeTemplateId` | `settings.active_template_id` | |
| `settings.projectionDefaults.years` | `settings.projection_years` | |
| `settings.timeGranularity` | (dropped) | Written but never read; see section 9. |
| `journal: Record<string, string>` | `journal_entries` | Key is the local date, `entry_date`. |
| `version` | (not stored) | Replaced by SQL migrations (section 9). |

## 2. Conventions

- **Multi-user ready.** Every table has `user_id uuid not null default auth.uid() references auth.users (id) on delete cascade`. On Supabase `auth.uid()` is the JWT subject; the schema also provides a local shim for plain PostgreSQL.
- **Ids are text, unique per user.** The app's ids are slugs for seed rows (`physique`, `deep-work`, `standard-week`) and generated strings for new rows. Keeping them as `text` means the seed and a localStorage import map one to one, with no id translation table. The primary key is `(user_id, id)`, and the default for new rows is `gen_random_uuid()::text`.
- **Composite foreign keys** `(user_id, x_id) references parent (user_id, id)`. A row can only point at rows of the same user, even if an id is guessed. This is the main multi-user integrity guard besides RLS.
- **Timestamps.** `created_at` and `updated_at` are `timestamptz not null default now()` on every table; `updated_at` is set by the `set_updated_at` trigger before each UPDATE.
- **Colours** are `#rrggbb` (check constraint). **Names** are not blank (`btrim(name) <> ''`).
- **Row level security** is enabled on every table with four policies (select, insert, update, delete) for the `authenticated` role, each `user_id = auth.uid()`. The `anon` role has no policy, so it sees and writes nothing.
- **Deletes** are `restrict` where the app refuses or moves content first (categories with content), `cascade` for owned children (slots, applied weeks, extra links) and `set null` for optional links (a habit's activity, the active template).

## 3. Tables

Types are PostgreSQL types. "PK" and "FK" are shown in the columns; `user_id` is part of every key except where noted.

### 3.1 `ambitions`

| Column | Type | Null | Default | Constraint | TS field |
| --- | --- | --- | --- | --- | --- |
| `user_id` | uuid | no | `auth.uid()` | PK, FK `auth.users(id)` cascade | (owner) |
| `statement` | text | no | | check not blank | `Ambition.statement` |
| `horizon_years` | integer | no | 5 | check > 0 | `Ambition.horizonYears` |
| `created_at`, `updated_at` | timestamptz | no | `now()` | | |

Indexes: the primary key. Delete: cascade with the user.

### 3.2 `categories`

| Column | Type | Null | Default | Constraint | TS field |
| --- | --- | --- | --- | --- | --- |
| `user_id` | uuid | no | `auth.uid()` | PK part, FK `auth.users` cascade | |
| `id` | text | no | `gen_random_uuid()::text` | PK part | `Category.id` |
| `name` | text | no | | check not blank | `name` |
| `color` | text | yes | | check `#rrggbb` | `color?` |
| `sort_order` | integer | no | | check >= 1; unique `(user_id, sort_order)` deferrable initially deferred | `order` |
| `goal_5y` | text | yes | | | `goal5y?` |
| `target_1y` | text | yes | | | `target1y?` |
| `target_tbd` | boolean | no | false | | `targetTbd?` |
| `created_at`, `updated_at` | timestamptz | no | `now()` | | |

The deferrable unique on `sort_order` lets a reorder swap two positions in one transaction. Indexes: primary key, unique `(user_id, sort_order)`. Delete: restrict (referenced by `activities` and `habits`), cascade to `activity_extra_categories`. The app refuses to delete a category with content until the content is moved to another category; the database makes the same rule enforceable.

### 3.3 `activities`

| Column | Type | Null | Default | Constraint | TS field |
| --- | --- | --- | --- | --- | --- |
| `user_id` | uuid | no | `auth.uid()` | PK part, FK `auth.users` cascade | |
| `id` | text | no | generated | PK part | `Activity.id` |
| `category_id` | text | no | | FK `(user_id, category_id)` to `categories`, restrict | `categoryId` (primary) |
| `name` | text | no | | check not blank | `name` |
| `short_code` | text | no | | check `^[A-Z]{1,3}$`; unique `(user_id, short_code)` | `shortCode` |
| `color` | text | no | | check `#rrggbb` | `color` |
| `created_at`, `updated_at` | timestamptz | no | `now()` | | |

Short codes are stored upper-cased, as the app does (`validateActivityFields`). Index: `(user_id, category_id)`. Delete of an activity: cascade to `template_slots` (its hours are emptied) and `activity_extra_categories`; set null on `habits.activity_id`.

### 3.4 `activity_extra_categories`

| Column | Type | Null | Default | Constraint | TS field |
| --- | --- | --- | --- | --- | --- |
| `user_id` | uuid | no | `auth.uid()` | PK part | |
| `activity_id` | text | no | | PK part; FK `activities` cascade | `Activity.id` |
| `category_id` | text | no | | PK part; FK `categories` cascade | an entry of `alsoCategoryIds` |
| `created_at`, `updated_at` | timestamptz | no | `now()` | | |

Trigger `activity_extra_categories_not_primary` rejects a row whose `category_id` is the activity's primary category. Trigger `activities_drop_primary_extra` removes a row when the activity's primary category is changed to that category (the app's `cleanAlsoCategoryIds`). Index: `(user_id, category_id)`.

### 3.5 `habits`

| Column | Type | Null | Default | Constraint | TS field |
| --- | --- | --- | --- | --- | --- |
| `user_id` | uuid | no | `auth.uid()` | PK part | |
| `id` | text | no | generated | PK part | `Habit.id` |
| `category_id` | text | no | | FK `categories`, restrict | `categoryId` |
| `activity_id` | text | yes | | FK `activities`, `on delete set null (activity_id)` | `activityId?` |
| `name` | text | no | | check not blank | `name` |
| `frequency_count` | integer | no | 1 | check >= 0 | `frequency.count` |
| `frequency_period` | `habit_period` enum (`day`, `week`, `month`) | no | `'week'` | | `frequency.period` |
| `minutes_per_occurrence` | integer | yes | | check > 0 | `minutesPerOccurrence?` |
| `created_at`, `updated_at` | timestamptz | no | `now()` | | |

Indexes: `(user_id, category_id)`; partial `(user_id, activity_id) where activity_id is not null`. A habit may link to any activity of the user, not only one in its own category (the app allows this). Annual and quarterly habits are not representable: the enum has day, week and month only, as in the app.

### 3.6 `templates`

| Column | Type | Null | Default | Constraint | TS field |
| --- | --- | --- | --- | --- | --- |
| `user_id` | uuid | no | `auth.uid()` | PK part | |
| `id` | text | no | generated | PK part | `WeekTemplate.id` |
| `name` | text | no | | check not blank | `name` |
| `description` | text | yes | | | `description?` |
| `granularity_minutes` | smallint | no | 60 | check = 60 | `granularityMinutes` |
| `color` | text | yes | | check `#rrggbb` | `color?` |
| `sort_order` | integer | no | 0 | | position in the app's array (the first template is the fallback) |
| `created_at`, `updated_at` | timestamptz | no | `now()` | | |

`granularity_minutes` is pinned to 60: the type allows 30, but the app paints only hourly templates (`setActivitySlots` returns early when the granularity is not 60). If 30-minute templates are ever needed, the slot key changes to a half-hour index (0 to 47 per day) and the check is relaxed.

Delete: cascade to `template_slots` and `applied_weeks`; set null on `settings.active_template_id`.

### 3.7 `template_slots`

| Column | Type | Null | Default | Constraint | TS field |
| --- | --- | --- | --- | --- | --- |
| `user_id` | uuid | no | `auth.uid()` | PK part | |
| `template_id` | text | no | | PK part; FK `templates` cascade | owner of `slots` |
| `day` | smallint | no | | PK part; check 0 to 6 (0 = Monday) | index `day * 24 + hour` |
| `hour` | smallint | no | | PK part; check 0 to 23 (0 = 12AM) | index `day * 24 + hour` |
| `activity_id` | text | no | | FK `activities` cascade | the slot value (non-empty) |
| `created_at`, `updated_at` | timestamptz | no | `now()` | | |

Primary key `(user_id, template_id, day, hour)`: one activity per hour per template. This is the database form of the app's "exclusive painting" rule. Index: `(user_id, activity_id)`. Section 4 explains the encoding and the choice.

### 3.8 `applied_weeks`

| Column | Type | Null | Default | Constraint | TS field |
| --- | --- | --- | --- | --- | --- |
| `user_id` | uuid | no | `auth.uid()` | PK part | |
| `start_date` | date | no | | check `extract(isodow from start_date) = 1` (a Monday); unique `(user_id, start_date)` | `startDate` |
| `iso_year` | integer | no | generated | `generated always as (extract(isoyear from start_date)) stored`; PK part | (derived) |
| `iso_week` | integer | no | generated | `generated always as (extract(week from start_date)) stored`; PK part | (derived) |
| `template_id` | text | no | | FK `templates` cascade | `templateId` |
| `created_at`, `updated_at` | timestamptz | no | `now()` | | |

Primary key `(user_id, iso_year, iso_week)`: one applied template per ISO week, which is how the week is keyed. `start_date` stays as the date the app uses. A week without a row uses the active template (`effectiveTemplate`), so "unassigned" is the absence of a row. Years have 52 or 53 ISO weeks; the seed generates the rows for the chosen year (`seed_planner_defaults`).

Note: `extract` on a `date` is treated as immutable for generated columns on PostgreSQL 14 and later. This was not run (no local PostgreSQL), so verify it on the first `supabase db reset`.

### 3.9 `settings`

| Column | Type | Null | Default | Constraint | TS field |
| --- | --- | --- | --- | --- | --- |
| `user_id` | uuid | no | `auth.uid()` | PK, FK `auth.users` cascade | (owner) |
| `active_template_id` | text | yes | | FK `(user_id, active_template_id)` to `templates`, `on delete set null (active_template_id)` | `activeTemplateId` |
| `projection_years` | integer | no | 5 | check > 0 | `projectionDefaults.years` |
| `created_at`, `updated_at` | timestamptz | no | `now()` | | |

One row per user. The app's `ensureActiveTemplate` falls back to the first template when the active one is gone; the database clears the link, and the application does the same fallback.

### 3.10 `journal_entries`

| Column | Type | Null | Default | Constraint | TS field |
| --- | --- | --- | --- | --- | --- |
| `user_id` | uuid | no | `auth.uid()` | PK part | |
| `entry_date` | date | no | | PK part | key `YYYY-MM-DD` (device local date) |
| `body` | text | no | | check not blank | value |
| `created_at`, `updated_at` | timestamptz | no | `now()` | | |

A blank note is deleted, not stored (`setJournalEntry`), so the rule "no empty rows" is also a check.

## 4. Template slots: encoding and trade-off

**Current encoding.** `WeekTemplate.slots` is a `string[]` of length 168 (`7 * 24`, `slotCount(60)`). Index `i = day * 24 + hour`, where day 0 is Monday and hour 0 is 12AM. A value is `''` (empty) or the id of an activity. Example: `slots[0 * 24 + 8] = 'deep-work'` means Monday 8 to 9 AM is deep work.

**Proposed normalised table** `template_slots(template_id, day, hour, activity_id)` with primary key `(user_id, template_id, day, hour)`. Only painted hours have a row (sparse); `''` becomes "no row". The seed produces 454 rows for three templates; the maximum is 168 per template.

**Options compared**

| | A. Array (`text[]` or `jsonb` on `templates`) | B. Normalised rows (proposed) | C. Dense rows (168 per template) |
| --- | --- | --- | --- |
| Read a template | One row, one value. Simplest. | Join or one query by `template_id`; ordered by PK. | Same as B, more rows. |
| Write one hour | Rewrite the whole array (168 items; trivial). | One upsert or delete. | One update. |
| Write a whole grid | One UPDATE. | Delete and insert in one transaction (or one RPC). | One UPDATE per changed row. |
| Referential integrity | None. Activity deletes must clean the array in code. | FK to `activities` with cascade; no dangling ids. | Same as B. |
| One activity per hour | Implicit (one array cell). | Enforced by the primary key. | Enforced by the primary key. |
| SQL reporting (hours per category) | `unnest` with ordinality; awkward. | Plain `count(*)` with joins (see section 8). | Same as B. |
| Storage | Smallest for one template. | Proportional to painted hours. | Largest; 168 rows even when empty. |
| Length of 168 guaranteed | Only by a check on array length. | Structurally (day and hour ranges). | Structurally. |

**Recommendation: B.** The app paints and reads the whole grid, which suits either form, but the planned-hours and needed-vs-allocated computations are SQL aggregates over activities, which B does directly and enforces through foreign keys. Option A is a fine fallback if the owner wants the smallest possible change; it gives up the referential integrity and the aggregate queries. Option C is not worth it.

## 5. Client-only state (not in the database)

These stay in the browser and are not part of the data model:

| State | Where today | Notes |
| --- | --- | --- |
| Theme (light or dark) | `localStorage` key `timely.dark` (`app/app.vue`) | Per device, by design. |
| Selected planner year | `usePlannerYear` (in memory, set to the current ISO year on mount) | Not persisted; a reload selects the current year. |
| Navigation and selection | URL query: `tab`, `item`, `edit`, `add`, `category` (`useNav`) | Shareable; the database does not need it. |
| Home period | Nuxt `useState` (session) | Home is Today only in the current build. |
| Visualization view settings | In memory | |
| Onboarding flag | Does not exist in the code | Nothing to keep. |

## 6. Invariants the database must keep

Each one is an app rule; the column in brackets says where the database enforces it.

1. **One list of categories.** The Harada grid is the first eight categories by `sort_order`. [Not enforced; query with `order by sort_order limit 8`, or a view. Positions 1 to 8 are unique per user by the unique index.]
2. **Every activity has exactly one primary category.** [NOT NULL FK.]
3. **An activity is counted once in Insights,** by its primary category. [Query rule; each activity has one `category_id`.]
4. **An activity is never a secondary category of itself,** and a secondary category is never the primary one. [Trigger `activity_extra_categories_not_primary`, and `activities_drop_primary_extra`.]
5. **Goals comparison counts each activity once per category.** For a category, the compared activities are the activities linked from its habits plus the activities that list it as secondary. Primary membership alone does not count. [`comparedActivityIds`; query in section 8 uses `union`, which removes duplicates.]
6. **Allocated time is the active template's hours** of those activities, per week. Needed time is the habits' weekly occurrences times minutes per occurrence: `day` counts times 7, `week` as is, `month` times 12 / 52. [Query rule; `alignmentStatus` tolerance in the app: max(30 min, 10 percent of need).]
7. **Exclusive painting.** One activity per hour per template; painting over another activity needs the app's reassignment confirmation. [Primary key of `template_slots`.]
8. **Week resolution.** A week uses its applied template if it has a row, else the active template. [Query rule; `effectiveTemplate`.]
9. **Short codes** are 1 to 3 upper-case letters and unique per user. [Check and unique index.]
10. **Deleting content.** A category with activities or habits cannot be deleted until they move; a template can be deleted only when another one exists. [Restrict FKs for the first; the second is an app rule to add as a check or trigger if wanted.]
11. **Journal.** Blank notes do not exist. [Check constraint.]
12. **Habit links** may point at any activity, and a link is cleared (not the habit) when the activity goes. [FK set null.]

## 7. Sample queries

These use psql variables: `\set uid '<your user uuid>'`. Under RLS the `user_id` predicates are redundant but harmless; keep them so the queries also work for the table owner. Weeks are for ISO year 2026 (53 weeks); change the year and the 52 generator bound for another year.

### 7.1 Planned hours per category per ISO week

Hours are slot counts (one slot is one hour). The week's template is the applied row if present, else the active template.

```sql
with year_weeks as (
  select (date '2026-01-04' - (extract(isodow from date '2026-01-04')::int - 1) + g * 7)::date as week_start
  from generate_series(0, 52) as g                       -- 53 weeks; use 0..51 for 52-week years
),
week_template as (
  select yw.week_start,
         coalesce(aw.template_id, s.active_template_id) as template_id
  from year_weeks yw
  join public.settings s on s.user_id = :'uid'
  left join public.applied_weeks aw
         on aw.user_id = s.user_id and aw.start_date = yw.week_start
  where extract(isoyear from yw.week_start) = 2026
)
select wt.week_start,
       a.category_id,
       count(*) as planned_hours
from week_template wt
join public.template_slots ts
  on ts.user_id = :'uid' and ts.template_id = wt.template_id
join public.activities a
  on a.user_id = ts.user_id and a.id = ts.activity_id
group by wt.week_start, a.category_id
order by wt.week_start, a.category_id;
```

Monthly totals use the same weeks, expanded to days (`day` 0 to 6 of each week maps to `slot day`):

```sql
with year_weeks as (
  select (date '2026-01-04' - (extract(isodow from date '2026-01-04')::int - 1) + g * 7)::date as week_start
  from generate_series(0, 52) as g
),
week_template as (
  select yw.week_start, coalesce(aw.template_id, s.active_template_id) as template_id
  from year_weeks yw
  join public.settings s on s.user_id = :'uid'
  left join public.applied_weeks aw on aw.user_id = s.user_id and aw.start_date = yw.week_start
  where extract(isoyear from yw.week_start) = 2026
),
days as (
  select wt.template_id, (wt.week_start + d)::date as day_date, d as slot_day
  from week_template wt
  cross join generate_series(0, 6) as d
)
select date_trunc('month', dy.day_date)::date as month,
       a.category_id,
       count(*) as planned_hours
from days dy
join public.template_slots ts
  on ts.user_id = :'uid' and ts.template_id = dy.template_id and ts.day = dy.slot_day
join public.activities a
  on a.user_id = ts.user_id and a.id = ts.activity_id
where extract(year from dy.day_date) = 2026
group by 1, 2
order by 1, 2;
```

### 7.2 Needed against allocated time per category (per week, active template)

> Not in the app: the planned-against-needed comparison was removed on 2026-10-29 (circular: both sides come from the same habits). The query stays as a design reference for a possible time budget per life area.

```sql
with needed as (
  select h.category_id,
         sum(
           case h.frequency_period
             when 'day'   then h.frequency_count * 7
             when 'week'  then h.frequency_count
             when 'month' then h.frequency_count * 12.0 / 52
           end * h.minutes_per_occurrence
         ) / 60.0 as needed_hours
  from public.habits h
  where h.user_id = :'uid' and h.minutes_per_occurrence is not null
  group by h.category_id
),
compared as (                                  -- each (category, activity) once
  select category_id, activity_id
  from public.habits
  where user_id = :'uid' and activity_id is not null
  union
  select category_id, activity_id
  from public.activity_extra_categories
  where user_id = :'uid'
),
allocated as (
  select c.category_id, count(*)::numeric as allocated_hours
  from compared c
  join public.settings s on s.user_id = :'uid'
  join public.template_slots ts
    on ts.user_id = :'uid' and ts.template_id = s.active_template_id and ts.activity_id = c.activity_id
  group by c.category_id
)
select cat.sort_order,
       cat.name,
       round(coalesce(n.needed_hours, 0), 1)                   as needed_h_per_week,
       coalesce(al.allocated_hours, 0)                         as allocated_h_per_week,
       coalesce(al.allocated_hours, 0) - coalesce(n.needed_hours, 0) as gap_h
from public.categories cat
left join needed n on n.category_id = cat.id
left join allocated al on al.category_id = cat.id
where cat.user_id = :'uid'
order by cat.sort_order;
```

The app's verdict (under, over, ok, none) is a function of `needed`, `allocated` and the tolerance in section 6; it is not in SQL here.

### 7.3 Insights: each activity counted once, by primary category

```sql
select a.category_id, count(*) as planned_hours_active_template
from public.template_slots ts
join public.settings s on s.user_id = ts.user_id and s.active_template_id = ts.template_id
join public.activities a on a.user_id = ts.user_id and a.id = ts.activity_id
where ts.user_id = :'uid'
group by a.category_id
order by a.category_id;
```

### 7.4 The Harada grid (first eight categories)

```sql
select id, name, sort_order
from public.categories
where user_id = :'uid'
order by sort_order
limit 8;
```

### 7.5 Painting and clearing hours (write examples)

Paint Training on Monday 7 to 8 AM and 8 to 9 AM, overwriting whatever is there (the app first asks for confirmation when the hours belong to another activity):

```sql
insert into public.template_slots (user_id, template_id, day, hour, activity_id)
values (:'uid', 'standard-week', 0, 7, 'training'),
       (:'uid', 'standard-week', 0, 8, 'training')
on conflict (user_id, template_id, day, hour)
do update set activity_id = excluded.activity_id;
```

Clear an activity's hours from a template:

```sql
delete from public.template_slots
where user_id = :'uid' and template_id = 'standard-week' and activity_id = 'training';
```

Replace a whole grid: delete the template's slots and insert the new ones in one transaction, or call one PL/pgSQL function that does both (one round trip, see the effort evaluation).

## 8. Indexes and performance

- Primary keys lead with `user_id`, so every per-user query and RLS predicate uses an index.
- Foreign-key columns are not indexed automatically in PostgreSQL. The schema indexes `activities(category_id)`, `habits(category_id)`, `habits(activity_id)` (partial), `template_slots(activity_id)`, `applied_weeks(template_id)` and `activity_extra_categories(category_id)`.
- Volumes are small: a user has roughly 10 categories, 10 to 50 activities, 50 to 200 habits, 3 to 10 templates and up to 168 painted hours per template; a year has 53 applied-week rows at most. No partitioning or special indexing is needed.

## 9. Changes from the current app and decisions for the owner

- **`timeGranularity` is dropped.** It is in the stored state and the type, but nothing reads it. The model omits it. Removing it from the app is a storage change (bump `PLANNER_STATE_VERSION`), which the owner has to decide (open item in `.claude/agent.md`).
- **Ids stay text.** Keeps seed and imports one to one. Uuid primary keys would be more conventional; they would need an id mapping on import and a seed with generated ids.
- **Migrations replace the version field.** The app resets saves on any version mismatch because it has no migrations. A database needs versioned SQL migrations (Supabase CLI `supabase/migrations/`); the `version` field is not stored.
- **`PLANNER_STATE_VERSION` is 8 in the code**, while `.claude/agent.md` still says 7. The model here reflects the code (version 8, `alsoCategoryIds` and the `journal` field both present).
- **`applied_weeks.id` is not kept**; the derived id `${templateId}-${startDate}` is not needed when the week is the key.
- **Owner decisions:** hosted Supabase or local only; magic-link login or none for a single user; whether the localStorage save stays as an offline cache; whether a 30-minute granularity is ever needed (it would change `template_slots`); whether habits may link across categories (the app allows it; the comparison counts the hours in the habit's category).

## 10. Files

- `schema.sql`: DDL, triggers, RLS, optional seed function (generated from the app seed).
- `erd.drawio`: entity relationship diagram (diagrams.net).
- `erd.mmd`: the same diagram in Mermaid, rendered on GitHub.
- `effort-evaluation.md`: effort, options and phased plan.
- `README.md`: how to open the diagram and apply the schema.
