-- =============================================================================
-- Timely: PostgreSQL / Supabase schema (draft, see data-model.md)
--
-- Target: PostgreSQL 15 or later (Supabase is on 15+). The ON DELETE SET NULL (column)
-- form needs 15. gen_random_uuid() is built in from 13.
--
-- Run on an EMPTY database (local: `supabase db reset`, or psql, see README.md). The script
-- is not idempotent: re-running it fails on the first existing object.
--
-- Sections:
--   0. extensions and local-only shims (auth schema, roles) for plain PostgreSQL
--   1. enum and helper functions
--   2. tables (user_id on every table, composite keys, constraints, indexes)
--   3. triggers (updated_at, invariants that a CHECK cannot express)
--   4. row level security (own rows only, for the authenticated role)
--   5. seed function (OPTIONAL, separated, mirrors app/utils/planner/seed.ts createInitialState)
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. Extensions and local-only shims
-- -----------------------------------------------------------------------------

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- Supabase already provides schema auth, table auth.users, function auth.uid() and the
-- roles anon / authenticated. The blocks below only create them when they are missing,
-- so the same file runs on Supabase (no-op) and on plain PostgreSQL (local shim).

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key
);

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'auth' and p.proname = 'uid'
  ) then
    -- Same contract as Supabase: the subject of the JWT the request was made with, else NULL
    execute $fn$
      create function auth.uid() returns uuid
      language sql stable
      as $body$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $body$
    $fn$;
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 1. Enum and helper functions
-- -----------------------------------------------------------------------------

-- Habit frequency unit (the app's HabitPeriod)
create type public.habit_period as enum ('day', 'week', 'month');

-- Keeps updated_at current on every UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at := now();
  return new;
end
$fn$;

-- -----------------------------------------------------------------------------
-- 2. Tables
--
-- Conventions
--   * user_id uuid default auth.uid() references auth.users on delete cascade, on every table
--   * text ids: the app's ids (slugs for seed rows, generated ids for new rows), unique per user
--     through the composite primary key (user_id, id); no id is global
--   * composite foreign keys (user_id, x) so a row can only point at the same user's rows
--   * colours are '#rrggbb'; names are not blank
-- -----------------------------------------------------------------------------

-- Ambition: the one 5-year statement at the centre of the Harada grid (at most one per user)
create table public.ambitions (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  statement text not null check (btrim(statement) <> ''),
  horizon_years integer not null default 5 check (horizon_years > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Category: a life area, also the Harada grid cell and a goal holder. The first eight by sort_order form the grid.
create table public.categories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null check (btrim(name) <> ''),
  color text check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order integer not null check (sort_order >= 1),
  goal_5y text,
  target_1y text,
  target_tbd boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  -- Deferrable so that a reorder can swap two positions inside one transaction
  constraint categories_sort_order_key unique (user_id, sort_order) deferrable initially deferred
);

-- Activity: a named kind of time, owned by a primary category. Its hours count once in Insights.
create table public.activities (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  category_id text not null,
  name text not null check (btrim(name) <> ''),
  short_code text not null check (short_code ~ '^[A-Z]{1,3}$'),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, short_code),
  -- No cascade: the app moves a category's activities elsewhere before the category can go
  foreign key (user_id, category_id) references public.categories (user_id, id) on delete restrict
);

create index activities_category_idx on public.activities (user_id, category_id);

-- Secondary categories of an activity (the app's alsoCategoryIds): its hours also count in these
-- categories' Goals comparison, never in Insights. The primary category is never listed here (trigger).
create table public.activity_extra_categories (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_id text not null,
  category_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_id, category_id),
  foreign key (user_id, activity_id) references public.activities (user_id, id) on delete cascade,
  foreign key (user_id, category_id) references public.categories (user_id, id) on delete cascade
);

create index activity_extra_categories_category_idx on public.activity_extra_categories (user_id, category_id);

-- Habit: a recurring, optionally measurable attitude under a category. Links to at most one activity.
create table public.habits (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  category_id text not null,
  activity_id text,
  name text not null check (btrim(name) <> ''),
  frequency_count integer not null default 1 check (frequency_count >= 0),
  frequency_period public.habit_period not null default 'week',
  minutes_per_occurrence integer check (minutes_per_occurrence > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, category_id) references public.categories (user_id, id) on delete restrict,
  -- Unlinking an activity keeps the habit; only the link is cleared
  foreign key (user_id, activity_id) references public.activities (user_id, id) on delete set null (activity_id)
);

create index habits_category_idx on public.habits (user_id, category_id);
create index habits_activity_idx on public.habits (user_id, activity_id) where activity_id is not null;

-- Week template: a named week of hourly slots. Hours not listed are empty (the app's '' slot).
-- Shape of the app's slots: string[168], index = day * 24 + hour, day 0 = Monday, hour 0 = 12AM,
-- value '' or an activity id. Here: one row per painted hour, see data-model.md for the trade-off.
create table public.templates (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  id text not null default gen_random_uuid()::text,
  name text not null check (btrim(name) <> ''),
  description text,
  -- The app's granularity is hourly for every template it can paint (30 is typed but unused)
  granularity_minutes smallint not null default 60 check (granularity_minutes = 60),
  color text check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- One painted hour of one template. The primary key is the invariant "one activity per hour per template".
create table public.template_slots (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template_id text not null,
  day smallint not null check (day between 0 and 6),
  hour smallint not null check (hour between 0 and 23),
  activity_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, template_id, day, hour),
  foreign key (user_id, template_id) references public.templates (user_id, id) on delete cascade,
  -- Deleting an activity empties its hours (the app does the same)
  foreign key (user_id, activity_id) references public.activities (user_id, id) on delete cascade
);

create index template_slots_activity_idx on public.template_slots (user_id, activity_id);

-- Applied week: the template that governs one ISO week. Weeks without a row use the active template.
-- start_date is the Monday; the ISO year and week are derived from it, so they cannot drift.
create table public.applied_weeks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  start_date date not null check (extract(isodow from start_date) = 1),
  iso_year integer generated always as (extract(isoyear from start_date)::integer) stored,
  iso_week integer generated always as (extract(week from start_date)::integer) stored,
  template_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, iso_year, iso_week),
  unique (user_id, start_date),
  -- Deleting a template drops its applied weeks (the app does the same)
  foreign key (user_id, template_id) references public.templates (user_id, id) on delete cascade
);

create index applied_weeks_template_idx on public.applied_weeks (user_id, template_id);

-- Settings: one row per user (the app's PlannerSettings, without the unused timeGranularity)
create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  active_template_id text,
  projection_years integer not null default 5 check (projection_years > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Deleting the active template clears the setting; the app then falls back to the first template
  foreign key (user_id, active_template_id) references public.templates (user_id, id) on delete set null (active_template_id)
);

-- Journal (FR-HOME-11): one note per local calendar date. A blank note is deleted, not stored.
create table public.journal_entries (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date date not null,
  body text not null check (btrim(body) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);

-- -----------------------------------------------------------------------------
-- 3. Triggers
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'ambitions', 'categories', 'activities', 'activity_extra_categories', 'habits',
    'templates', 'template_slots', 'applied_weeks', 'settings', 'journal_entries'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end
$$;

-- A secondary category can never be the activity's primary category
create or replace function public.forbid_primary_as_extra()
returns trigger
language plpgsql
as $fn$
begin
  if exists (
    select 1 from public.activities a
    where a.user_id = new.user_id and a.id = new.activity_id and a.category_id = new.category_id
  ) then
    raise exception 'category % is already the primary category of activity %', new.category_id, new.activity_id
      using errcode = 'check_violation';
  end if;
  return new;
end
$fn$;

create trigger activity_extra_categories_not_primary
  before insert or update on public.activity_extra_categories
  for each row execute function public.forbid_primary_as_extra();

-- Moving an activity's primary category removes the new primary from its secondary list
create or replace function public.drop_extra_matching_primary()
returns trigger
language plpgsql
as $fn$
begin
  delete from public.activity_extra_categories
  where user_id = new.user_id and activity_id = new.id and category_id = new.category_id;
  return new;
end
$fn$;

create trigger activities_drop_primary_extra
  before update of category_id on public.activities
  for each row
  when (old.category_id is distinct from new.category_id)
  execute function public.drop_extra_matching_primary();

-- -----------------------------------------------------------------------------
-- 4. Row level security: a user sees and changes only their own rows
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'ambitions', 'categories', 'activities', 'activity_extra_categories', 'habits',
    'templates', 'template_slots', 'applied_weeks', 'settings', 'journal_entries'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = auth.uid())',
      t || '_select_own', t
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())',
      t || '_insert_own', t
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_update_own', t
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())',
      t || '_delete_own', t
    );
  end loop;
end
$$;

-- No policy exists for the anon role, so anonymous requests see and change nothing.
-- Local plain PostgreSQL only (Supabase grants these by default): the application role needs grants.
-- The table owner bypasses RLS, so connect the app as a role that is not the owner to test RLS.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Seed (OPTIONAL). Mirrors createInitialState() in app/utils/planner/seed.ts for one user.
--
-- Not run by the migration. Use it to get the same starter data the app seeds:
--   select public.seed_planner_defaults('<user uuid>');            -- ISO year of today
--   select public.seed_planner_defaults('<user uuid>', 2026);      -- a given ISO year
-- The function inserts plain rows: run it once per user, on a user with no planner data.
--
-- Generated from the app seed (ids, names, colours and habits as in the code). Regenerate when
-- the seed changes; the app's createHaradaSeed() and the three template builders are the source.
-- -----------------------------------------------------------------------------

create or replace function public.seed_planner_defaults(p_user uuid, p_year integer default null)
returns void
language plpgsql
as $fn$
declare
  y integer := coalesce(p_year, extract(isoyear from current_date)::integer);
  iso_weeks integer := extract(week from make_date(y, 12, 28))::integer;
  first_monday date := make_date(y, 1, 4) - (extract(isodow from make_date(y, 1, 4))::integer - 1);
begin
  insert into public.ambitions (user_id, statement, horizon_years)
  values (p_user, 'Best father, husband, son and brother — CDO / CIO within 5 years', 5);

  insert into public.categories (user_id, id, name, color, sort_order, goal_5y, target_1y, target_tbd)
  values
    (p_user, 'physique', 'Physical', '#7a9471', 1, 'Optimal fitness, stable energy, zero sleep debt.', 'To define — e.g. 3 workouts a week kept up all year, full medical check-up done.', true),
    (p_user, 'spirituelle', 'Spiritual', '#6e5c7c', 2, 'Inner clarity, calm in the face of professional pressure.', 'To define — e.g. 10 minutes of daily meditation kept, weekly journaling kept up.', true),
    (p_user, 'relationnelle', 'Relational & emotional', '#c4767f', 3, 'To be recognised by my family as a present, reliable father, husband, son and brother.', 'Weekly ritual with my wife and a monthly one-on-one ritual with each child, kept at 90% over the year.', false),
    (p_user, 'economique', 'Economic', '#c19a3e', 4, 'Financial independence, target net worth.', 'To define — e.g. target savings rate reached, exact amount invested over the year.', true),
    (p_user, 'cognitive', 'Cognitive', '#4a8683', 5, 'Stay at the leading edge of AI and enterprise architecture, able to lead a project of my own.', 'AI / enterprise architecture certification obtained and a personal project launched — personal dev app or enterprise architecture app (to be decided).', false),
    (p_user, 'sociale', 'Social', '#e09070', 6, 'An active role in a professional or entrepreneurial community.', 'To define — e.g. join an active community, start a mentoring relationship over the year.', true),
    (p_user, 'professionnelle', 'Professional', '#3c4b63', 7, 'Land a CDO or CIO role within five years.', 'Take on an expanded role (e.g. Lead Enterprise Architect) covering IT and data, with 3 strategic initiatives delivered and visible to the executive committee.', false),
    (p_user, 'environnement', 'Environment', '#5c7248', 8, 'A sustainable lifestyle, consistent with my values.', 'To define — e.g. fixed Sunday ritual kept all year, footprint reduced in one identified area.', true);

  insert into public.activities (user_id, id, name, short_code, category_id, color)
  values
    (p_user, 'deep-work', 'Deep Work', 'WRK', 'professionnelle', '#3c4b63'),
    (p_user, 'training', 'Training', 'TRN', 'physique', '#7a9471'),
    (p_user, 'family', 'Family Time', 'FAM', 'relationnelle', '#c19a3e'),
    (p_user, 'learning', 'Learning', 'LRN', 'cognitive', '#8a5a7a'),
    (p_user, 'projects', 'Projects', 'PRJ', 'cognitive', '#a04e3e'),
    (p_user, 'reading', 'Reading', 'RDG', 'cognitive', '#6e5c7c'),
    (p_user, 'planning', 'Weekly Planning', 'PLN', 'professionnelle', '#c19a3e'),
    (p_user, 'errands', 'Errands', 'ERR', 'environnement', '#d97757'),
    (p_user, 'sleep', 'Sleep', 'SLP', 'physique', '#6e5c7c');

  insert into public.activity_extra_categories (user_id, activity_id, category_id)
  values
    (p_user, 'reading', 'spirituelle');

  insert into public.habits (user_id, id, category_id, activity_id, name, frequency_count, frequency_period, minutes_per_occurrence)
  values
    (p_user, 'physique-1', 'physique', 'training', 'Regular exercise (frequency and type to set)', 6, 'week', 60),
    (p_user, 'physique-2', 'physique', null, 'Structured eating, no improvised meals', 1, 'day', null),
    (p_user, 'physique-3', 'physique', null, 'Organised sleep and recovery', 1, 'day', null),
    (p_user, 'physique-4', 'physique', null, 'Tracking simple indicators (weight, fitness)', 1, 'week', null),
    (p_user, 'physique-5', 'physique', null, 'Annual medical check-up', 1, 'month', null),
    (p_user, 'physique-6', 'physique', null, 'Limit screens before bed', 1, 'day', null),
    (p_user, 'physique-7', 'physique', null, 'Daily hydration', 1, 'day', null),
    (p_user, 'physique-8', 'physique', null, 'Stretching and mobility', 3, 'week', null),
    (p_user, 'spirituelle-1', 'spirituelle', null, 'Regular meditation', 1, 'day', null),
    (p_user, 'spirituelle-2', 'spirituelle', null, 'Reflection time / journal', 3, 'week', null),
    (p_user, 'spirituelle-3', 'spirituelle', 'reading', 'Inspiring reading', 3, 'week', 30),
    (p_user, 'spirituelle-4', 'spirituelle', null, 'Moments of screen-free silence', 1, 'day', null),
    (p_user, 'spirituelle-5', 'spirituelle', null, 'Clarify personal values', 1, 'month', null),
    (p_user, 'spirituelle-6', 'spirituelle', null, 'Daily gratitude', 1, 'day', null),
    (p_user, 'spirituelle-7', 'spirituelle', null, 'Retreat or extended time once a year', 1, 'month', null),
    (p_user, 'spirituelle-8', 'spirituelle', null, 'Align actions with values', 1, 'week', null),
    (p_user, 'relationnelle-1', 'relationnelle', 'family', 'Time dedicated to my wife (couple ritual)', 1, 'week', 90),
    (p_user, 'relationnelle-2', 'relationnelle', null, 'Time dedicated to my children, one-on-one', 1, 'month', null),
    (p_user, 'relationnelle-3', 'relationnelle', null, 'Regular calls and visits to my parents', 1, 'week', null),
    (p_user, 'relationnelle-4', 'relationnelle', null, 'Active connection with my brother / sister', 1, 'week', null),
    (p_user, 'relationnelle-5', 'relationnelle', 'family', 'Family ritual (e.g. Sunday together)', 1, 'week', 180),
    (p_user, 'relationnelle-6', 'relationnelle', null, 'Close circle of friends maintained', 1, 'month', null),
    (p_user, 'relationnelle-7', 'relationnelle', null, 'Recognise, express and regulate my emotions', 1, 'day', null),
    (p_user, 'relationnelle-8', 'relationnelle', null, 'Resolve tensions quickly, let nothing linger', 1, 'day', null),
    (p_user, 'economique-1', 'economique', null, 'Monthly budget tracking', 1, 'month', null),
    (p_user, 'economique-2', 'economique', null, 'Structured savings / investment plan', 1, 'month', null),
    (p_user, 'economique-3', 'economique', null, 'Annual net-worth review', 1, 'month', null),
    (p_user, 'economique-4', 'economique', null, 'Diversify income sources', 1, 'month', null),
    (p_user, 'economique-5', 'economique', null, 'Family protection (insurance, provident cover)', 1, 'month', null),
    (p_user, 'economique-6', 'economique', null, 'Quantified goals per deadline', 1, 'month', null),
    (p_user, 'economique-7', 'economique', null, 'Reduce spending not aligned with my values', 1, 'week', null),
    (p_user, 'economique-8', 'economique', null, 'Continuing education in personal finance', 1, 'month', null),
    (p_user, 'cognitive-1', 'cognitive', null, 'Active watch on AI / enterprise architecture', 3, 'week', null),
    (p_user, 'cognitive-2', 'cognitive', 'projects', 'Decide, then launch the personal project (personal dev app or EA app)', 2, 'week', 60),
    (p_user, 'cognitive-3', 'cognitive', 'learning', 'Regular technical reading', 3, 'week', 45),
    (p_user, 'cognitive-4', 'cognitive', null, 'Targeted certification course', 2, 'week', null),
    (p_user, 'cognitive-5', 'cognitive', null, 'Concrete experimentation (prototypes, personal POCs)', 1, 'week', null),
    (p_user, 'cognitive-6', 'cognitive', null, 'Share knowledge (articles, talks)', 1, 'month', null),
    (p_user, 'cognitive-7', 'cognitive', null, 'Learn a new domain each year', 1, 'month', null),
    (p_user, 'cognitive-8', 'cognitive', null, 'Regularly challenge what I know', 1, 'month', null),
    (p_user, 'sociale-1', 'sociale', null, 'Active participation in one or more communities', 1, 'week', null),
    (p_user, 'sociale-2', 'sociale', null, 'Mentoring, helping others', 1, 'week', null),
    (p_user, 'sociale-3', 'sociale', null, 'Association or entrepreneurial commitment', 1, 'month', null),
    (p_user, 'sociale-4', 'sociale', null, 'Contribution to a collective or network', 1, 'month', null),
    (p_user, 'sociale-5', 'sociale', null, 'Organising events or meetups', 1, 'month', null),
    (p_user, 'sociale-6', 'sociale', null, 'Visibility (content, speaking)', 1, 'week', null),
    (p_user, 'sociale-7', 'sociale', null, 'Maintain the existing network', 1, 'week', null),
    (p_user, 'sociale-8', 'sociale', null, 'New qualified connections each quarter', 1, 'month', null),
    (p_user, 'professionnelle-1', 'professionnelle', null, 'Targeted networking with IT / data leaders', 1, 'week', null),
    (p_user, 'professionnelle-2', 'professionnelle', null, 'Develop an executive posture and communication', 1, 'week', null),
    (p_user, 'professionnelle-3', 'professionnelle', null, 'High-impact assignments on the digital roadmap', 1, 'day', null),
    (p_user, 'professionnelle-4', 'professionnelle', null, 'Executive education / strategic certification', 1, 'month', null),
    (p_user, 'professionnelle-5', 'professionnelle', null, 'Identify an internal mentor or sponsor', 1, 'month', null),
    (p_user, 'professionnelle-6', 'professionnelle', null, 'Widen the scope: from EA to global IT/data governance', 1, 'month', null),
    (p_user, 'professionnelle-7', 'professionnelle', null, 'Showcase value created with quantified results', 1, 'month', null),
    (p_user, 'professionnelle-8', 'professionnelle', null, 'Publish professional articles to build my personal brand', 1, 'month', null),
    (p_user, 'professionnelle-9', 'professionnelle', 'planning', 'Plan the week around professional priorities', 1, 'week', 120),
    (p_user, 'environnement-1', 'environnement', null, 'Reduce my daily footprint', 1, 'day', null),
    (p_user, 'environnement-2', 'environnement', null, 'Sunday rituals: rest, nature, family', 1, 'week', null),
    (p_user, 'environnement-3', 'environnement', null, 'Aligned consumption choices', 1, 'day', null),
    (p_user, 'environnement-4', 'environnement', null, 'Optimise living and working environment', 1, 'month', null),
    (p_user, 'environnement-5', 'environnement', null, 'Point to define', 1, 'week', null),
    (p_user, 'environnement-6', 'environnement', null, 'Raise awareness among my circle', 1, 'month', null),
    (p_user, 'environnement-7', 'environnement', null, 'Simple annual review of my choices', 1, 'month', null),
    (p_user, 'environnement-8', 'environnement', null, 'Consistency between professional discourse (sustainable transformation) and personal life', 1, 'month', null);

  insert into public.templates (user_id, id, name, description, granularity_minutes, color, sort_order)
  values
    (p_user, 'standard-week', 'Standard Week', 'Balanced week: deep work, health, family, learning.', 60, '#5d6b7a', 1),
    (p_user, 'deep-work-week', 'Deep Work Week', null, 60, '#2a2a2a', 2),
    (p_user, 'vacation-week', 'Vacation', null, 60, '#c19a3e', 3);

  insert into public.template_slots (user_id, template_id, day, hour, activity_id)
  values
    (p_user, 'standard-week', 0, 0, 'sleep'),
    (p_user, 'standard-week', 0, 1, 'sleep'),
    (p_user, 'standard-week', 0, 2, 'sleep'),
    (p_user, 'standard-week', 0, 3, 'sleep'),
    (p_user, 'standard-week', 0, 4, 'sleep'),
    (p_user, 'standard-week', 0, 5, 'sleep'),
    (p_user, 'standard-week', 0, 6, 'sleep'),
    (p_user, 'standard-week', 0, 8, 'deep-work'),
    (p_user, 'standard-week', 0, 9, 'deep-work'),
    (p_user, 'standard-week', 0, 10, 'deep-work'),
    (p_user, 'standard-week', 0, 11, 'deep-work'),
    (p_user, 'standard-week', 0, 13, 'deep-work'),
    (p_user, 'standard-week', 0, 14, 'deep-work'),
    (p_user, 'standard-week', 0, 15, 'deep-work'),
    (p_user, 'standard-week', 0, 16, 'deep-work'),
    (p_user, 'standard-week', 0, 18, 'training'),
    (p_user, 'standard-week', 0, 20, 'family'),
    (p_user, 'standard-week', 0, 21, 'family'),
    (p_user, 'standard-week', 0, 22, 'sleep'),
    (p_user, 'standard-week', 0, 23, 'sleep'),
    (p_user, 'standard-week', 1, 0, 'sleep'),
    (p_user, 'standard-week', 1, 1, 'sleep'),
    (p_user, 'standard-week', 1, 2, 'sleep'),
    (p_user, 'standard-week', 1, 3, 'sleep'),
    (p_user, 'standard-week', 1, 4, 'sleep'),
    (p_user, 'standard-week', 1, 5, 'sleep'),
    (p_user, 'standard-week', 1, 6, 'sleep'),
    (p_user, 'standard-week', 1, 8, 'deep-work'),
    (p_user, 'standard-week', 1, 9, 'deep-work'),
    (p_user, 'standard-week', 1, 10, 'deep-work'),
    (p_user, 'standard-week', 1, 11, 'deep-work'),
    (p_user, 'standard-week', 1, 13, 'deep-work'),
    (p_user, 'standard-week', 1, 14, 'deep-work'),
    (p_user, 'standard-week', 1, 15, 'deep-work'),
    (p_user, 'standard-week', 1, 16, 'deep-work'),
    (p_user, 'standard-week', 1, 18, 'training'),
    (p_user, 'standard-week', 1, 20, 'family'),
    (p_user, 'standard-week', 1, 21, 'family'),
    (p_user, 'standard-week', 1, 22, 'sleep'),
    (p_user, 'standard-week', 1, 23, 'sleep'),
    (p_user, 'standard-week', 2, 0, 'sleep'),
    (p_user, 'standard-week', 2, 1, 'sleep'),
    (p_user, 'standard-week', 2, 2, 'sleep'),
    (p_user, 'standard-week', 2, 3, 'sleep'),
    (p_user, 'standard-week', 2, 4, 'sleep'),
    (p_user, 'standard-week', 2, 5, 'sleep'),
    (p_user, 'standard-week', 2, 6, 'sleep'),
    (p_user, 'standard-week', 2, 8, 'deep-work'),
    (p_user, 'standard-week', 2, 9, 'deep-work'),
    (p_user, 'standard-week', 2, 10, 'deep-work'),
    (p_user, 'standard-week', 2, 11, 'deep-work'),
    (p_user, 'standard-week', 2, 13, 'deep-work'),
    (p_user, 'standard-week', 2, 14, 'deep-work'),
    (p_user, 'standard-week', 2, 15, 'deep-work'),
    (p_user, 'standard-week', 2, 16, 'deep-work'),
    (p_user, 'standard-week', 2, 18, 'training'),
    (p_user, 'standard-week', 2, 20, 'family'),
    (p_user, 'standard-week', 2, 21, 'family'),
    (p_user, 'standard-week', 2, 22, 'sleep'),
    (p_user, 'standard-week', 2, 23, 'sleep'),
    (p_user, 'standard-week', 3, 0, 'sleep'),
    (p_user, 'standard-week', 3, 1, 'sleep'),
    (p_user, 'standard-week', 3, 2, 'sleep'),
    (p_user, 'standard-week', 3, 3, 'sleep'),
    (p_user, 'standard-week', 3, 4, 'sleep'),
    (p_user, 'standard-week', 3, 5, 'sleep'),
    (p_user, 'standard-week', 3, 6, 'sleep'),
    (p_user, 'standard-week', 3, 8, 'deep-work'),
    (p_user, 'standard-week', 3, 9, 'deep-work'),
    (p_user, 'standard-week', 3, 10, 'deep-work'),
    (p_user, 'standard-week', 3, 11, 'deep-work'),
    (p_user, 'standard-week', 3, 13, 'deep-work'),
    (p_user, 'standard-week', 3, 14, 'deep-work'),
    (p_user, 'standard-week', 3, 15, 'deep-work'),
    (p_user, 'standard-week', 3, 16, 'deep-work'),
    (p_user, 'standard-week', 3, 18, 'training'),
    (p_user, 'standard-week', 3, 20, 'family'),
    (p_user, 'standard-week', 3, 21, 'family'),
    (p_user, 'standard-week', 3, 22, 'sleep'),
    (p_user, 'standard-week', 3, 23, 'sleep'),
    (p_user, 'standard-week', 4, 0, 'sleep'),
    (p_user, 'standard-week', 4, 1, 'sleep'),
    (p_user, 'standard-week', 4, 2, 'sleep'),
    (p_user, 'standard-week', 4, 3, 'sleep'),
    (p_user, 'standard-week', 4, 4, 'sleep'),
    (p_user, 'standard-week', 4, 5, 'sleep'),
    (p_user, 'standard-week', 4, 6, 'sleep'),
    (p_user, 'standard-week', 4, 8, 'deep-work'),
    (p_user, 'standard-week', 4, 9, 'deep-work'),
    (p_user, 'standard-week', 4, 10, 'deep-work'),
    (p_user, 'standard-week', 4, 11, 'deep-work'),
    (p_user, 'standard-week', 4, 13, 'deep-work'),
    (p_user, 'standard-week', 4, 14, 'deep-work'),
    (p_user, 'standard-week', 4, 15, 'deep-work'),
    (p_user, 'standard-week', 4, 16, 'deep-work'),
    (p_user, 'standard-week', 4, 18, 'training'),
    (p_user, 'standard-week', 4, 20, 'family'),
    (p_user, 'standard-week', 4, 21, 'family'),
    (p_user, 'standard-week', 4, 22, 'sleep'),
    (p_user, 'standard-week', 4, 23, 'sleep'),
    (p_user, 'standard-week', 5, 0, 'sleep'),
    (p_user, 'standard-week', 5, 1, 'sleep'),
    (p_user, 'standard-week', 5, 2, 'sleep'),
    (p_user, 'standard-week', 5, 3, 'sleep'),
    (p_user, 'standard-week', 5, 4, 'sleep'),
    (p_user, 'standard-week', 5, 5, 'sleep'),
    (p_user, 'standard-week', 5, 6, 'sleep'),
    (p_user, 'standard-week', 5, 7, 'sleep'),
    (p_user, 'standard-week', 5, 9, 'errands'),
    (p_user, 'standard-week', 5, 10, 'errands'),
    (p_user, 'standard-week', 5, 11, 'family'),
    (p_user, 'standard-week', 5, 12, 'family'),
    (p_user, 'standard-week', 5, 14, 'learning'),
    (p_user, 'standard-week', 5, 15, 'learning'),
    (p_user, 'standard-week', 5, 17, 'projects'),
    (p_user, 'standard-week', 5, 18, 'projects'),
    (p_user, 'standard-week', 5, 22, 'sleep'),
    (p_user, 'standard-week', 5, 23, 'sleep'),
    (p_user, 'standard-week', 6, 0, 'sleep'),
    (p_user, 'standard-week', 6, 1, 'sleep'),
    (p_user, 'standard-week', 6, 2, 'sleep'),
    (p_user, 'standard-week', 6, 3, 'sleep'),
    (p_user, 'standard-week', 6, 4, 'sleep'),
    (p_user, 'standard-week', 6, 5, 'sleep'),
    (p_user, 'standard-week', 6, 6, 'sleep'),
    (p_user, 'standard-week', 6, 7, 'sleep'),
    (p_user, 'standard-week', 6, 9, 'reading'),
    (p_user, 'standard-week', 6, 10, 'reading'),
    (p_user, 'standard-week', 6, 11, 'family'),
    (p_user, 'standard-week', 6, 12, 'family'),
    (p_user, 'standard-week', 6, 13, 'family'),
    (p_user, 'standard-week', 6, 15, 'planning'),
    (p_user, 'standard-week', 6, 16, 'planning'),
    (p_user, 'standard-week', 6, 17, 'projects'),
    (p_user, 'standard-week', 6, 18, 'projects'),
    (p_user, 'standard-week', 6, 22, 'sleep'),
    (p_user, 'standard-week', 6, 23, 'sleep'),
    (p_user, 'deep-work-week', 0, 0, 'sleep'),
    (p_user, 'deep-work-week', 0, 1, 'sleep'),
    (p_user, 'deep-work-week', 0, 2, 'sleep'),
    (p_user, 'deep-work-week', 0, 3, 'sleep'),
    (p_user, 'deep-work-week', 0, 4, 'sleep'),
    (p_user, 'deep-work-week', 0, 5, 'sleep'),
    (p_user, 'deep-work-week', 0, 6, 'sleep'),
    (p_user, 'deep-work-week', 0, 7, 'training'),
    (p_user, 'deep-work-week', 0, 8, 'deep-work'),
    (p_user, 'deep-work-week', 0, 9, 'deep-work'),
    (p_user, 'deep-work-week', 0, 10, 'deep-work'),
    (p_user, 'deep-work-week', 0, 11, 'deep-work'),
    (p_user, 'deep-work-week', 0, 12, 'family'),
    (p_user, 'deep-work-week', 0, 13, 'deep-work'),
    (p_user, 'deep-work-week', 0, 14, 'deep-work'),
    (p_user, 'deep-work-week', 0, 15, 'deep-work'),
    (p_user, 'deep-work-week', 0, 16, 'deep-work'),
    (p_user, 'deep-work-week', 0, 18, 'training'),
    (p_user, 'deep-work-week', 0, 19, 'family'),
    (p_user, 'deep-work-week', 0, 20, 'family'),
    (p_user, 'deep-work-week', 0, 21, 'family'),
    (p_user, 'deep-work-week', 0, 23, 'sleep'),
    (p_user, 'deep-work-week', 1, 0, 'sleep'),
    (p_user, 'deep-work-week', 1, 1, 'sleep'),
    (p_user, 'deep-work-week', 1, 2, 'sleep'),
    (p_user, 'deep-work-week', 1, 3, 'sleep'),
    (p_user, 'deep-work-week', 1, 4, 'sleep'),
    (p_user, 'deep-work-week', 1, 5, 'sleep'),
    (p_user, 'deep-work-week', 1, 6, 'sleep'),
    (p_user, 'deep-work-week', 1, 7, 'training'),
    (p_user, 'deep-work-week', 1, 8, 'deep-work'),
    (p_user, 'deep-work-week', 1, 9, 'deep-work'),
    (p_user, 'deep-work-week', 1, 10, 'deep-work'),
    (p_user, 'deep-work-week', 1, 11, 'deep-work'),
    (p_user, 'deep-work-week', 1, 12, 'family'),
    (p_user, 'deep-work-week', 1, 13, 'deep-work'),
    (p_user, 'deep-work-week', 1, 14, 'deep-work'),
    (p_user, 'deep-work-week', 1, 15, 'deep-work'),
    (p_user, 'deep-work-week', 1, 16, 'deep-work'),
    (p_user, 'deep-work-week', 1, 18, 'training'),
    (p_user, 'deep-work-week', 1, 19, 'family'),
    (p_user, 'deep-work-week', 1, 20, 'family'),
    (p_user, 'deep-work-week', 1, 21, 'family'),
    (p_user, 'deep-work-week', 1, 23, 'sleep'),
    (p_user, 'deep-work-week', 2, 0, 'sleep'),
    (p_user, 'deep-work-week', 2, 1, 'sleep'),
    (p_user, 'deep-work-week', 2, 2, 'sleep'),
    (p_user, 'deep-work-week', 2, 3, 'sleep'),
    (p_user, 'deep-work-week', 2, 4, 'sleep'),
    (p_user, 'deep-work-week', 2, 5, 'sleep'),
    (p_user, 'deep-work-week', 2, 6, 'sleep'),
    (p_user, 'deep-work-week', 2, 7, 'training'),
    (p_user, 'deep-work-week', 2, 8, 'deep-work'),
    (p_user, 'deep-work-week', 2, 9, 'deep-work'),
    (p_user, 'deep-work-week', 2, 10, 'deep-work'),
    (p_user, 'deep-work-week', 2, 11, 'deep-work'),
    (p_user, 'deep-work-week', 2, 12, 'family'),
    (p_user, 'deep-work-week', 2, 13, 'deep-work'),
    (p_user, 'deep-work-week', 2, 14, 'deep-work'),
    (p_user, 'deep-work-week', 2, 15, 'deep-work'),
    (p_user, 'deep-work-week', 2, 16, 'deep-work'),
    (p_user, 'deep-work-week', 2, 18, 'training'),
    (p_user, 'deep-work-week', 2, 19, 'family'),
    (p_user, 'deep-work-week', 2, 20, 'family'),
    (p_user, 'deep-work-week', 2, 21, 'family'),
    (p_user, 'deep-work-week', 2, 23, 'sleep'),
    (p_user, 'deep-work-week', 3, 0, 'sleep'),
    (p_user, 'deep-work-week', 3, 1, 'sleep'),
    (p_user, 'deep-work-week', 3, 2, 'sleep'),
    (p_user, 'deep-work-week', 3, 3, 'sleep'),
    (p_user, 'deep-work-week', 3, 4, 'sleep'),
    (p_user, 'deep-work-week', 3, 5, 'sleep'),
    (p_user, 'deep-work-week', 3, 6, 'sleep'),
    (p_user, 'deep-work-week', 3, 7, 'training'),
    (p_user, 'deep-work-week', 3, 8, 'deep-work'),
    (p_user, 'deep-work-week', 3, 9, 'deep-work'),
    (p_user, 'deep-work-week', 3, 10, 'deep-work'),
    (p_user, 'deep-work-week', 3, 11, 'deep-work'),
    (p_user, 'deep-work-week', 3, 12, 'family'),
    (p_user, 'deep-work-week', 3, 13, 'deep-work'),
    (p_user, 'deep-work-week', 3, 14, 'deep-work'),
    (p_user, 'deep-work-week', 3, 15, 'deep-work'),
    (p_user, 'deep-work-week', 3, 16, 'deep-work'),
    (p_user, 'deep-work-week', 3, 18, 'training'),
    (p_user, 'deep-work-week', 3, 19, 'family'),
    (p_user, 'deep-work-week', 3, 20, 'family'),
    (p_user, 'deep-work-week', 3, 21, 'family'),
    (p_user, 'deep-work-week', 3, 23, 'sleep'),
    (p_user, 'deep-work-week', 4, 0, 'sleep'),
    (p_user, 'deep-work-week', 4, 1, 'sleep'),
    (p_user, 'deep-work-week', 4, 2, 'sleep'),
    (p_user, 'deep-work-week', 4, 3, 'sleep'),
    (p_user, 'deep-work-week', 4, 4, 'sleep'),
    (p_user, 'deep-work-week', 4, 5, 'sleep'),
    (p_user, 'deep-work-week', 4, 6, 'sleep'),
    (p_user, 'deep-work-week', 4, 7, 'training'),
    (p_user, 'deep-work-week', 4, 8, 'deep-work'),
    (p_user, 'deep-work-week', 4, 9, 'deep-work'),
    (p_user, 'deep-work-week', 4, 10, 'deep-work'),
    (p_user, 'deep-work-week', 4, 11, 'deep-work'),
    (p_user, 'deep-work-week', 4, 12, 'family'),
    (p_user, 'deep-work-week', 4, 13, 'deep-work'),
    (p_user, 'deep-work-week', 4, 14, 'deep-work'),
    (p_user, 'deep-work-week', 4, 15, 'deep-work'),
    (p_user, 'deep-work-week', 4, 16, 'deep-work'),
    (p_user, 'deep-work-week', 4, 18, 'training'),
    (p_user, 'deep-work-week', 4, 19, 'family'),
    (p_user, 'deep-work-week', 4, 20, 'family'),
    (p_user, 'deep-work-week', 4, 21, 'family'),
    (p_user, 'deep-work-week', 4, 23, 'sleep'),
    (p_user, 'deep-work-week', 5, 0, 'sleep'),
    (p_user, 'deep-work-week', 5, 1, 'sleep'),
    (p_user, 'deep-work-week', 5, 2, 'sleep'),
    (p_user, 'deep-work-week', 5, 3, 'sleep'),
    (p_user, 'deep-work-week', 5, 4, 'sleep'),
    (p_user, 'deep-work-week', 5, 5, 'sleep'),
    (p_user, 'deep-work-week', 5, 6, 'sleep'),
    (p_user, 'deep-work-week', 5, 7, 'sleep'),
    (p_user, 'deep-work-week', 5, 8, 'deep-work'),
    (p_user, 'deep-work-week', 5, 9, 'deep-work'),
    (p_user, 'deep-work-week', 5, 10, 'deep-work'),
    (p_user, 'deep-work-week', 5, 11, 'deep-work'),
    (p_user, 'deep-work-week', 5, 12, 'family'),
    (p_user, 'deep-work-week', 5, 13, 'family'),
    (p_user, 'deep-work-week', 5, 14, 'family'),
    (p_user, 'deep-work-week', 5, 15, 'family'),
    (p_user, 'deep-work-week', 5, 16, 'family'),
    (p_user, 'deep-work-week', 5, 17, 'family'),
    (p_user, 'deep-work-week', 5, 18, 'family'),
    (p_user, 'deep-work-week', 5, 19, 'family'),
    (p_user, 'deep-work-week', 5, 20, 'family'),
    (p_user, 'deep-work-week', 5, 21, 'family'),
    (p_user, 'deep-work-week', 5, 22, 'family'),
    (p_user, 'deep-work-week', 6, 0, 'sleep'),
    (p_user, 'deep-work-week', 6, 1, 'sleep'),
    (p_user, 'deep-work-week', 6, 2, 'sleep'),
    (p_user, 'deep-work-week', 6, 3, 'sleep'),
    (p_user, 'deep-work-week', 6, 4, 'sleep'),
    (p_user, 'deep-work-week', 6, 5, 'sleep'),
    (p_user, 'deep-work-week', 6, 6, 'sleep'),
    (p_user, 'deep-work-week', 6, 7, 'sleep'),
    (p_user, 'deep-work-week', 6, 8, 'family'),
    (p_user, 'deep-work-week', 6, 9, 'family'),
    (p_user, 'deep-work-week', 6, 10, 'family'),
    (p_user, 'deep-work-week', 6, 11, 'family'),
    (p_user, 'deep-work-week', 6, 12, 'family'),
    (p_user, 'deep-work-week', 6, 13, 'family'),
    (p_user, 'deep-work-week', 6, 14, 'family'),
    (p_user, 'deep-work-week', 6, 15, 'family'),
    (p_user, 'deep-work-week', 6, 16, 'family'),
    (p_user, 'deep-work-week', 6, 17, 'family'),
    (p_user, 'deep-work-week', 6, 18, 'family'),
    (p_user, 'deep-work-week', 6, 19, 'family'),
    (p_user, 'deep-work-week', 6, 20, 'family'),
    (p_user, 'deep-work-week', 6, 21, 'family'),
    (p_user, 'deep-work-week', 6, 22, 'family'),
    (p_user, 'vacation-week', 0, 0, 'sleep'),
    (p_user, 'vacation-week', 0, 1, 'sleep'),
    (p_user, 'vacation-week', 0, 2, 'sleep'),
    (p_user, 'vacation-week', 0, 3, 'sleep'),
    (p_user, 'vacation-week', 0, 4, 'sleep'),
    (p_user, 'vacation-week', 0, 5, 'sleep'),
    (p_user, 'vacation-week', 0, 6, 'sleep'),
    (p_user, 'vacation-week', 0, 7, 'sleep'),
    (p_user, 'vacation-week', 0, 8, 'errands'),
    (p_user, 'vacation-week', 0, 9, 'errands'),
    (p_user, 'vacation-week', 0, 10, 'training'),
    (p_user, 'vacation-week', 0, 11, 'training'),
    (p_user, 'vacation-week', 0, 12, 'family'),
    (p_user, 'vacation-week', 0, 13, 'family'),
    (p_user, 'vacation-week', 0, 14, 'family'),
    (p_user, 'vacation-week', 0, 15, 'family'),
    (p_user, 'vacation-week', 0, 16, 'family'),
    (p_user, 'vacation-week', 0, 17, 'family'),
    (p_user, 'vacation-week', 0, 18, 'family'),
    (p_user, 'vacation-week', 0, 19, 'family'),
    (p_user, 'vacation-week', 0, 20, 'family'),
    (p_user, 'vacation-week', 0, 21, 'family'),
    (p_user, 'vacation-week', 0, 22, 'family'),
    (p_user, 'vacation-week', 1, 0, 'sleep'),
    (p_user, 'vacation-week', 1, 1, 'sleep'),
    (p_user, 'vacation-week', 1, 2, 'sleep'),
    (p_user, 'vacation-week', 1, 3, 'sleep'),
    (p_user, 'vacation-week', 1, 4, 'sleep'),
    (p_user, 'vacation-week', 1, 5, 'sleep'),
    (p_user, 'vacation-week', 1, 6, 'sleep'),
    (p_user, 'vacation-week', 1, 7, 'sleep'),
    (p_user, 'vacation-week', 1, 8, 'errands'),
    (p_user, 'vacation-week', 1, 9, 'errands'),
    (p_user, 'vacation-week', 1, 10, 'training'),
    (p_user, 'vacation-week', 1, 11, 'training'),
    (p_user, 'vacation-week', 1, 12, 'family'),
    (p_user, 'vacation-week', 1, 13, 'family'),
    (p_user, 'vacation-week', 1, 14, 'family'),
    (p_user, 'vacation-week', 1, 15, 'family'),
    (p_user, 'vacation-week', 1, 16, 'family'),
    (p_user, 'vacation-week', 1, 17, 'family'),
    (p_user, 'vacation-week', 1, 18, 'family'),
    (p_user, 'vacation-week', 1, 19, 'family'),
    (p_user, 'vacation-week', 1, 20, 'family'),
    (p_user, 'vacation-week', 1, 21, 'family'),
    (p_user, 'vacation-week', 1, 22, 'family'),
    (p_user, 'vacation-week', 2, 0, 'sleep'),
    (p_user, 'vacation-week', 2, 1, 'sleep'),
    (p_user, 'vacation-week', 2, 2, 'sleep'),
    (p_user, 'vacation-week', 2, 3, 'sleep'),
    (p_user, 'vacation-week', 2, 4, 'sleep'),
    (p_user, 'vacation-week', 2, 5, 'sleep'),
    (p_user, 'vacation-week', 2, 6, 'sleep'),
    (p_user, 'vacation-week', 2, 7, 'sleep'),
    (p_user, 'vacation-week', 2, 8, 'errands'),
    (p_user, 'vacation-week', 2, 9, 'errands'),
    (p_user, 'vacation-week', 2, 10, 'training'),
    (p_user, 'vacation-week', 2, 11, 'training'),
    (p_user, 'vacation-week', 2, 12, 'family'),
    (p_user, 'vacation-week', 2, 13, 'family'),
    (p_user, 'vacation-week', 2, 14, 'family'),
    (p_user, 'vacation-week', 2, 15, 'family'),
    (p_user, 'vacation-week', 2, 16, 'family'),
    (p_user, 'vacation-week', 2, 17, 'family'),
    (p_user, 'vacation-week', 2, 18, 'family'),
    (p_user, 'vacation-week', 2, 19, 'family'),
    (p_user, 'vacation-week', 2, 20, 'family'),
    (p_user, 'vacation-week', 2, 21, 'family'),
    (p_user, 'vacation-week', 2, 22, 'family'),
    (p_user, 'vacation-week', 3, 0, 'sleep'),
    (p_user, 'vacation-week', 3, 1, 'sleep'),
    (p_user, 'vacation-week', 3, 2, 'sleep'),
    (p_user, 'vacation-week', 3, 3, 'sleep'),
    (p_user, 'vacation-week', 3, 4, 'sleep'),
    (p_user, 'vacation-week', 3, 5, 'sleep'),
    (p_user, 'vacation-week', 3, 6, 'sleep'),
    (p_user, 'vacation-week', 3, 7, 'sleep'),
    (p_user, 'vacation-week', 3, 8, 'errands'),
    (p_user, 'vacation-week', 3, 9, 'errands'),
    (p_user, 'vacation-week', 3, 10, 'training'),
    (p_user, 'vacation-week', 3, 11, 'training'),
    (p_user, 'vacation-week', 3, 12, 'family'),
    (p_user, 'vacation-week', 3, 13, 'family'),
    (p_user, 'vacation-week', 3, 14, 'family'),
    (p_user, 'vacation-week', 3, 15, 'family'),
    (p_user, 'vacation-week', 3, 16, 'family'),
    (p_user, 'vacation-week', 3, 17, 'family'),
    (p_user, 'vacation-week', 3, 18, 'family'),
    (p_user, 'vacation-week', 3, 19, 'family'),
    (p_user, 'vacation-week', 3, 20, 'family'),
    (p_user, 'vacation-week', 3, 21, 'family'),
    (p_user, 'vacation-week', 3, 22, 'family'),
    (p_user, 'vacation-week', 4, 0, 'sleep'),
    (p_user, 'vacation-week', 4, 1, 'sleep'),
    (p_user, 'vacation-week', 4, 2, 'sleep'),
    (p_user, 'vacation-week', 4, 3, 'sleep'),
    (p_user, 'vacation-week', 4, 4, 'sleep'),
    (p_user, 'vacation-week', 4, 5, 'sleep'),
    (p_user, 'vacation-week', 4, 6, 'sleep'),
    (p_user, 'vacation-week', 4, 7, 'sleep'),
    (p_user, 'vacation-week', 4, 8, 'errands'),
    (p_user, 'vacation-week', 4, 9, 'errands'),
    (p_user, 'vacation-week', 4, 10, 'training'),
    (p_user, 'vacation-week', 4, 11, 'training'),
    (p_user, 'vacation-week', 4, 12, 'family'),
    (p_user, 'vacation-week', 4, 13, 'family'),
    (p_user, 'vacation-week', 4, 14, 'family'),
    (p_user, 'vacation-week', 4, 15, 'family'),
    (p_user, 'vacation-week', 4, 16, 'family'),
    (p_user, 'vacation-week', 4, 17, 'family'),
    (p_user, 'vacation-week', 4, 18, 'family'),
    (p_user, 'vacation-week', 4, 19, 'family'),
    (p_user, 'vacation-week', 4, 20, 'family'),
    (p_user, 'vacation-week', 4, 21, 'family'),
    (p_user, 'vacation-week', 4, 22, 'family'),
    (p_user, 'vacation-week', 5, 0, 'sleep'),
    (p_user, 'vacation-week', 5, 1, 'sleep'),
    (p_user, 'vacation-week', 5, 2, 'sleep'),
    (p_user, 'vacation-week', 5, 3, 'sleep'),
    (p_user, 'vacation-week', 5, 4, 'sleep'),
    (p_user, 'vacation-week', 5, 5, 'sleep'),
    (p_user, 'vacation-week', 5, 6, 'sleep'),
    (p_user, 'vacation-week', 5, 7, 'sleep'),
    (p_user, 'vacation-week', 5, 8, 'errands'),
    (p_user, 'vacation-week', 5, 9, 'errands'),
    (p_user, 'vacation-week', 5, 10, 'training'),
    (p_user, 'vacation-week', 5, 11, 'training'),
    (p_user, 'vacation-week', 5, 12, 'family'),
    (p_user, 'vacation-week', 5, 13, 'family'),
    (p_user, 'vacation-week', 5, 14, 'family'),
    (p_user, 'vacation-week', 5, 15, 'family'),
    (p_user, 'vacation-week', 5, 16, 'family'),
    (p_user, 'vacation-week', 5, 17, 'family'),
    (p_user, 'vacation-week', 5, 18, 'family'),
    (p_user, 'vacation-week', 5, 19, 'family'),
    (p_user, 'vacation-week', 5, 20, 'family'),
    (p_user, 'vacation-week', 5, 21, 'family'),
    (p_user, 'vacation-week', 5, 22, 'family'),
    (p_user, 'vacation-week', 6, 0, 'sleep'),
    (p_user, 'vacation-week', 6, 1, 'sleep'),
    (p_user, 'vacation-week', 6, 2, 'sleep'),
    (p_user, 'vacation-week', 6, 3, 'sleep'),
    (p_user, 'vacation-week', 6, 4, 'sleep'),
    (p_user, 'vacation-week', 6, 5, 'sleep'),
    (p_user, 'vacation-week', 6, 6, 'sleep'),
    (p_user, 'vacation-week', 6, 7, 'sleep'),
    (p_user, 'vacation-week', 6, 8, 'errands'),
    (p_user, 'vacation-week', 6, 9, 'errands'),
    (p_user, 'vacation-week', 6, 10, 'training'),
    (p_user, 'vacation-week', 6, 11, 'training'),
    (p_user, 'vacation-week', 6, 12, 'family'),
    (p_user, 'vacation-week', 6, 13, 'family'),
    (p_user, 'vacation-week', 6, 14, 'family'),
    (p_user, 'vacation-week', 6, 15, 'family'),
    (p_user, 'vacation-week', 6, 16, 'family'),
    (p_user, 'vacation-week', 6, 17, 'family'),
    (p_user, 'vacation-week', 6, 18, 'family'),
    (p_user, 'vacation-week', 6, 19, 'family'),
    (p_user, 'vacation-week', 6, 20, 'family'),
    (p_user, 'vacation-week', 6, 21, 'family'),
    (p_user, 'vacation-week', 6, 22, 'family');

  -- Week index 0 is the first Monday of the ISO year; the pattern is the app's createSeedAppliedWeeks()
  insert into public.applied_weeks (user_id, start_date, template_id)
  select w.user_id, w.start_date, w.template_id
  from (
    select p_user as user_id,
      first_monday + g * 7 as start_date,
      case
        when g in (5, 6, 7, 14, 15, 24, 25, 26, 37, 38, 46, 47) then 'deep-work-week'
        when g in (12, 30, 31, 51) then 'vacation-week'
        when g in (9, 19, 40) then null
        else 'standard-week'
      end as template_id
    from generate_series(0, iso_weeks - 1) as g
  ) w
  where w.template_id is not null;

  insert into public.settings (user_id, active_template_id, projection_years)
  values (p_user, 'standard-week', 5);
end
$fn$;

-- Optional: seed every new sign-up automatically (Supabase). SECURITY DEFINER so that the
-- insert does not depend on the signing-up session passing RLS.
-- create or replace function public.seed_planner_for_new_user()
-- returns trigger
-- language plpgsql
-- security definer
-- set search_path = public
-- as $fn$
-- begin
--   perform public.seed_planner_defaults(new.id);
--   return new;
-- end
-- $fn$;
--
-- create trigger seed_planner_on_signup
--   after insert on auth.users
--   for each row execute function public.seed_planner_for_new_user();

commit;
