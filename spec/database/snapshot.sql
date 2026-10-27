-- Timely: snapshot storage for Supabase (Postgres with auth and RLS).
-- One row per user holds the whole PlannerState as jsonb. Versioned by PLANNER_STATE_VERSION (app/utils/planner.ts).

create table if not exists public.planner_state (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  version int not null,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.planner_state enable row level security;

-- Own rows only. Signed-in users have the authenticated role.
create policy "planner_state_select_own" on public.planner_state
  for select to authenticated using (user_id = auth.uid());

create policy "planner_state_insert_own" on public.planner_state
  for insert to authenticated with check (user_id = auth.uid());

create policy "planner_state_update_own" on public.planner_state
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "planner_state_delete_own" on public.planner_state
  for delete to authenticated using (user_id = auth.uid());
