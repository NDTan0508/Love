-- Migration 0039: Couple Daily Mission System V2.

create table if not exists daily_mission_bank_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  type text not null check (type in ('mission', 'reward', 'punishment')),
  mission_kind text not null default 'mess' check (mission_kind in ('mess', 'action')),
  text text not null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists daily_mission_used_content (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  type text not null check (type in ('mission', 'reward', 'punishment')),
  text text not null,
  normalized_text text not null,
  used_at timestamptz not null default now()
);

create table if not exists daily_mission_cycle_states (
  couple_id uuid not null references couples(id) on delete cascade,
  type text not null check (type in ('mission', 'reward', 'punishment')),
  used_item_ids jsonb not null default '[]'::jsonb,
  shuffled_queue jsonb not null default '[]'::jsonb,
  cycle_number integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (couple_id, type)
);

create table if not exists daily_missions_v2 (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  mission_date date not null,
  mission_item_id uuid references daily_mission_bank_items(id) on delete set null,
  reward_item_id uuid references daily_mission_bank_items(id) on delete set null,
  punishment_item_id uuid references daily_mission_bank_items(id) on delete set null,
  mission_kind text not null default 'mess' check (mission_kind in ('mess', 'action')),
  title text not null,
  reward text not null,
  punishment text not null,
  status text not null default 'pending' check (status in ('pending', 'waiting_partner_approval', 'completed')),
  xp_reward integer not null default 20,
  reward_updated boolean not null default false,
  punishment_updated boolean not null default false,
  requested_at timestamptz,
  completed_at timestamptz,
  approved_by uuid references users(id) on delete set null,
  applied_punishment_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists daily_mission_change_requests (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  mission_date date not null,
  user_id uuid not null references users(id) on delete cascade,
  type text not null check (type in ('reward', 'punishment')),
  requested_by uuid not null references users(id) on delete cascade,
  proposed_values jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists daily_mission_couple_stats (
  couple_id uuid primary key references couples(id) on delete cascade,
  xp integer not null default 0,
  streak_count integer not null default 0,
  last_all_completed_date date,
  last_missed_date date,
  updated_at timestamptz not null default now()
);

create table if not exists daily_mission_streak_rewards (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  milestone_days integer not null check (milestone_days in (3, 7, 15, 30)),
  xp_reward integer not null check (xp_reward in (50, 100, 200, 500)),
  claimed_by uuid references users(id) on delete set null,
  claimed_at timestamptz not null default now(),
  unique (couple_id, milestone_days)
);

alter table daily_missions_v2
  alter column xp_reward set default 20;

alter table daily_mission_bank_items
  add column if not exists mission_kind text not null default 'mess';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'daily_mission_bank_items_mission_kind_check'
  ) then
    alter table daily_mission_bank_items
      add constraint daily_mission_bank_items_mission_kind_check
      check (mission_kind in ('mess', 'action'));
  end if;
end $$;

alter table daily_missions_v2
  add column if not exists mission_item_id uuid references daily_mission_bank_items(id) on delete set null,
  add column if not exists reward_item_id uuid references daily_mission_bank_items(id) on delete set null,
  add column if not exists punishment_item_id uuid references daily_mission_bank_items(id) on delete set null,
  add column if not exists mission_kind text not null default 'mess';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'daily_missions_v2_mission_kind_check'
  ) then
    alter table daily_missions_v2
      add constraint daily_missions_v2_mission_kind_check
      check (mission_kind in ('mess', 'action'));
  end if;
end $$;

create index if not exists daily_mission_bank_items_couple_type_idx
  on daily_mission_bank_items(couple_id, type, created_at desc);

create index if not exists daily_mission_used_content_recent_idx
  on daily_mission_used_content(couple_id, type, used_at desc);

create index if not exists daily_mission_cycle_states_couple_idx
  on daily_mission_cycle_states(couple_id);

create index if not exists daily_missions_v2_today_idx
  on daily_missions_v2(couple_id, mission_date desc, user_id);

create index if not exists daily_missions_v2_status_idx
  on daily_missions_v2(couple_id, mission_date, status);

create index if not exists daily_mission_change_requests_pending_idx
  on daily_mission_change_requests(couple_id, mission_date desc, status);

create index if not exists daily_mission_streak_rewards_couple_idx
  on daily_mission_streak_rewards(couple_id, milestone_days);

alter table daily_mission_bank_items enable row level security;
alter table daily_mission_used_content enable row level security;
alter table daily_mission_cycle_states enable row level security;
alter table daily_missions_v2 enable row level security;
alter table daily_mission_change_requests enable row level security;
alter table daily_mission_couple_stats enable row level security;
alter table daily_mission_streak_rewards enable row level security;

drop policy if exists "Couple members can read mission bank items" on daily_mission_bank_items;
create policy "Couple members can read mission bank items"
on daily_mission_bank_items for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_mission_bank_items.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can manage mission bank items" on daily_mission_bank_items;
create policy "Couple members can manage mission bank items"
on daily_mission_bank_items for all
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_mission_bank_items.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_mission_bank_items.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read used mission content" on daily_mission_used_content;
create policy "Couple members can read used mission content"
on daily_mission_used_content for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_mission_used_content.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read mission cycle states" on daily_mission_cycle_states;
create policy "Couple members can read mission cycle states"
on daily_mission_cycle_states for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_mission_cycle_states.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read daily missions v2" on daily_missions_v2;
create policy "Couple members can read daily missions v2"
on daily_missions_v2 for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_missions_v2.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can update daily missions v2" on daily_missions_v2;
create policy "Couple members can update daily missions v2"
on daily_missions_v2 for update
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_missions_v2.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_missions_v2.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read mission change requests" on daily_mission_change_requests;
create policy "Couple members can read mission change requests"
on daily_mission_change_requests for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_mission_change_requests.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can manage mission change requests" on daily_mission_change_requests;
create policy "Couple members can manage mission change requests"
on daily_mission_change_requests for all
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_mission_change_requests.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_mission_change_requests.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read daily mission stats" on daily_mission_couple_stats;
create policy "Couple members can read daily mission stats"
on daily_mission_couple_stats for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_mission_couple_stats.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read streak mission rewards" on daily_mission_streak_rewards;
create policy "Couple members can read streak mission rewards"
on daily_mission_streak_rewards for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_mission_streak_rewards.couple_id
      and cm.user_id = auth.uid()
  )
);

do $$
declare
  tbl text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array array[
      'daily_missions_v2',
      'daily_mission_bank_items',
      'daily_mission_cycle_states',
      'daily_mission_change_requests',
      'daily_mission_couple_stats',
      'daily_mission_streak_rewards'
    ]
    loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and tablename = tbl
      ) then
        execute format('alter publication supabase_realtime add table %I', tbl);
      end if;
    end loop;
  end if;
end $$;
