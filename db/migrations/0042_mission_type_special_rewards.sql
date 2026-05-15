-- Migration 0042: Mission type matching and fixed system special rewards.

alter table daily_mission_bank_items
  add column if not exists bank_item_type text not null default 'mess';

update daily_mission_bank_items
set bank_item_type = mission_kind
where bank_item_type is null
  or bank_item_type not in ('mess', 'action');

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'daily_mission_bank_items_mission_kind_check'
  ) then
    alter table daily_mission_bank_items
      drop constraint daily_mission_bank_items_mission_kind_check;
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'daily_mission_bank_items_bank_item_type_check'
  ) then
    alter table daily_mission_bank_items
      drop constraint daily_mission_bank_items_bank_item_type_check;
  end if;

  alter table daily_mission_bank_items
    add constraint daily_mission_bank_items_mission_kind_check
    check (mission_kind in ('mess', 'action'));

  alter table daily_mission_bank_items
    add constraint daily_mission_bank_items_bank_item_type_check
    check (bank_item_type in ('mess', 'action'));
end $$;

update daily_mission_bank_items
set mission_kind = bank_item_type
where type in ('reward', 'punishment')
  and mission_kind is distinct from bank_item_type;

alter table daily_missions_v2
  add column if not exists generated_by_special_reward boolean not null default false;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'daily_missions_v2_mission_kind_check'
  ) then
    alter table daily_missions_v2
      drop constraint daily_missions_v2_mission_kind_check;
  end if;

  alter table daily_missions_v2
    add constraint daily_missions_v2_mission_kind_check
    check (mission_kind in ('mess', 'action', 'commission'));

  if exists (
    select 1 from pg_constraint
    where conname = 'daily_missions_v2_status_check'
  ) then
    alter table daily_missions_v2
      drop constraint daily_missions_v2_status_check;
  end if;

  alter table daily_missions_v2
    add constraint daily_missions_v2_status_check
    check (status in ('pending', 'waiting_partner_approval', 'completed', 'failed'));
end $$;

alter table reward_inventory_items
  add column if not exists source_type text,
  add column if not exists source_mission_id uuid references daily_missions_v2(id) on delete set null;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'reward_inventory_items_reward_effect_check'
  ) then
    alter table reward_inventory_items
      drop constraint reward_inventory_items_reward_effect_check;
  end if;

  alter table reward_inventory_items
    add constraint reward_inventory_items_reward_effect_check
    check (
      reward_effect is null
      or reward_effect in (
        'skip_punishment',
        'change_mission',
        'double_mission_xp',
        'instant_xp',
        'block_troll',
        'choose_partner_mission',
        'copy_partner_reward',
        'swap_rewards',
        'protect_streak',
        'skip_one_punishment',
        'change_one_mission',
        'double_xp_one_mission',
        'instant_20_xp',
        'create_partner_commission_tomorrow',
        'copy_partner_reward',
        'swap_reward',
        'protect_streak_once',
        'force_partner_redo_mission',
        'skip_all_punishments_today',
        'instant_100_xp',
        'choose_all_partner_missions_tomorrow',
        'double_xp_today',
        'mission_day_off'
      )
    );

  if exists (
    select 1 from pg_constraint
    where conname = 'reward_inventory_items_source_type_check'
  ) then
    alter table reward_inventory_items
      drop constraint reward_inventory_items_source_type_check;
  end if;

  alter table reward_inventory_items
    add constraint reward_inventory_items_source_type_check
    check (source_type is null or source_type in ('mess', 'action'));
end $$;

create table if not exists daily_mission_user_action_counters (
  user_id uuid not null references users(id) on delete cascade,
  couple_id uuid not null references couples(id) on delete cascade,
  completed_action_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, couple_id)
);

create index if not exists daily_mission_user_action_counters_couple_idx
  on daily_mission_user_action_counters(couple_id, completed_action_count);

create index if not exists reward_inventory_items_user_type_status_idx
  on reward_inventory_items(user_id, reward_type, status, acquired_at desc);

create index if not exists reward_inventory_items_source_mission_idx
  on reward_inventory_items(source_mission_id);

alter table daily_mission_user_action_counters enable row level security;

drop policy if exists "Users can read own action reward counters" on daily_mission_user_action_counters;
create policy "Users can read own action reward counters"
on daily_mission_user_action_counters for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_mission_user_action_counters.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can manage action reward counters" on daily_mission_user_action_counters;
create policy "Couple members can manage action reward counters"
on daily_mission_user_action_counters for all
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_mission_user_action_counters.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_mission_user_action_counters.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read reward inventory items" on reward_inventory_items;
create policy "Users can read own reward inventory items"
on reward_inventory_items for select
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = reward_inventory_items.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can manage reward inventory items" on reward_inventory_items;
create policy "Users can manage own reward inventory items"
on reward_inventory_items for all
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = reward_inventory_items.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = reward_inventory_items.couple_id
      and cm.user_id = auth.uid()
  )
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and tablename = 'daily_mission_user_action_counters'
    ) then
      alter publication supabase_realtime add table daily_mission_user_action_counters;
    end if;
  end if;
end $$;
