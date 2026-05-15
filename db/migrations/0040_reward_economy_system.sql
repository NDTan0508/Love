-- Migration 0040: Reward & Punishment Economy System.

create table if not exists reward_bank_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  text text not null,
  type text not null check (type in ('normal', 'power', 'special')),
  category text not null check (category in ('emotional', 'fun', 'control', 'protection', 'boost', 'chaos')),
  intensity integer not null check (intensity between 1 and 5),
  weight numeric not null default 1,
  effect text check (effect in ('skip_punishment', 'change_mission', 'double_mission_xp', 'instant_xp', 'block_troll', 'choose_partner_mission', 'copy_partner_reward', 'swap_rewards', 'protect_streak')),
  source text not null default 'bank' check (source = 'bank'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists punishment_bank_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  text text not null,
  category text not null check (category in ('fun', 'cringe', 'chaos', 'action', 'message')),
  intensity integer not null check (intensity between 1 and 5),
  safe boolean not null default true,
  source text not null default 'bank' check (source = 'bank'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists reward_inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  couple_id uuid not null references couples(id) on delete cascade,
  reward_id uuid references reward_bank_items(id) on delete set null,
  reward_text text not null,
  reward_type text not null check (reward_type in ('normal', 'power', 'special')),
  reward_category text not null check (reward_category in ('emotional', 'fun', 'control', 'protection', 'boost', 'chaos')),
  reward_intensity integer not null check (reward_intensity between 1 and 5),
  reward_weight numeric not null default 1,
  reward_effect text check (reward_effect in ('skip_punishment', 'change_mission', 'double_mission_xp', 'instant_xp', 'block_troll', 'choose_partner_mission', 'copy_partner_reward', 'swap_rewards', 'protect_streak')),
  reward_payload jsonb not null default '{}'::jsonb,
  status text not null default 'unused' check (status in ('unused', 'used', 'expired')),
  acquired_from text not null check (acquired_from in ('mission', 'daily_bonus', 'streak', 'manual')),
  acquired_at timestamptz not null default now(),
  used_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists reward_bank_cycle_states (
  couple_id uuid not null references couples(id) on delete cascade,
  bank_type text not null check (bank_type in ('reward', 'punishment')),
  subtype text not null default 'all' check (subtype in ('all', 'normal', 'power', 'special')),
  used_item_ids jsonb not null default '[]'::jsonb,
  last_selected_item_ids jsonb not null default '[]'::jsonb,
  cycle_number integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (couple_id, bank_type, subtype)
);

create index if not exists reward_bank_items_couple_type_idx
  on reward_bank_items(couple_id, type, category, created_at desc);

create index if not exists punishment_bank_items_couple_category_idx
  on punishment_bank_items(couple_id, category, created_at desc);

create index if not exists reward_inventory_items_user_status_idx
  on reward_inventory_items(user_id, status, expires_at desc);

create index if not exists reward_inventory_items_couple_idx
  on reward_inventory_items(couple_id, acquired_at desc);

create index if not exists reward_bank_cycle_states_couple_idx
  on reward_bank_cycle_states(couple_id, bank_type, subtype);

alter table reward_bank_items enable row level security;
alter table punishment_bank_items enable row level security;
alter table reward_inventory_items enable row level security;
alter table reward_bank_cycle_states enable row level security;

drop policy if exists "Couple members can read reward bank items" on reward_bank_items;
create policy "Couple members can read reward bank items"
on reward_bank_items for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = reward_bank_items.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can manage reward bank items" on reward_bank_items;
create policy "Couple members can manage reward bank items"
on reward_bank_items for all
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = reward_bank_items.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = reward_bank_items.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read punishment bank items" on punishment_bank_items;
create policy "Couple members can read punishment bank items"
on punishment_bank_items for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = punishment_bank_items.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can manage punishment bank items" on punishment_bank_items;
create policy "Couple members can manage punishment bank items"
on punishment_bank_items for all
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = punishment_bank_items.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = punishment_bank_items.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read reward inventory items" on reward_inventory_items;
create policy "Couple members can read reward inventory items"
on reward_inventory_items for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = reward_inventory_items.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can manage reward inventory items" on reward_inventory_items;
create policy "Couple members can manage reward inventory items"
on reward_inventory_items for all
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = reward_inventory_items.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = reward_inventory_items.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read reward cycle states" on reward_bank_cycle_states;
create policy "Couple members can read reward cycle states"
on reward_bank_cycle_states for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = reward_bank_cycle_states.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can manage reward cycle states" on reward_bank_cycle_states;
create policy "Couple members can manage reward cycle states"
on reward_bank_cycle_states for all
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = reward_bank_cycle_states.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = reward_bank_cycle_states.couple_id
      and cm.user_id = auth.uid()
  )
);

alter table daily_missions_v2
  add column if not exists punishment_status text not null default 'pending',
  add column if not exists punishment_resolved_at timestamptz,
  add column if not exists xp_multiplier numeric not null default 1,
  add column if not exists reward_claimed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'daily_missions_v2_punishment_status_check'
  ) then
    alter table daily_missions_v2
      add constraint daily_missions_v2_punishment_status_check
      check (punishment_status in ('pending', 'skipped', 'completed'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'daily_missions_v2_xp_multiplier_check'
  ) then
    alter table daily_missions_v2
      add constraint daily_missions_v2_xp_multiplier_check
      check (xp_multiplier >= 1 and xp_multiplier <= 5);
  end if;
end $$;

alter table daily_mission_couple_stats
  add column if not exists streak_protection_charges integer not null default 0,
  add column if not exists troll_block_charges integer not null default 0,
  add column if not exists last_reward_drop_at timestamptz;
