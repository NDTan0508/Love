-- Migration 0043: deferred mission reward claim and punishment review states.

alter table daily_missions_v2
  add column if not exists punishment_submitted_at timestamptz,
  add column if not exists punishment_reviewed_by uuid references users(id) on delete set null,
  add column if not exists punishment_rejected_at timestamptz;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'daily_missions_v2_punishment_status_check'
  ) then
    alter table daily_missions_v2
      drop constraint daily_missions_v2_punishment_status_check;
  end if;

  alter table daily_missions_v2
    add constraint daily_missions_v2_punishment_status_check
    check (punishment_status in ('pending', 'waiting_partner_approval', 'skipped', 'completed'));
end $$;

with ranked_inventory as (
  select
    id,
    row_number() over (
      partition by couple_id, user_id, source_mission_id, reward_type
      order by acquired_at, id
    ) as duplicate_rank
  from reward_inventory_items
  where source_mission_id is not null
    and reward_type = 'normal'
)
delete from reward_inventory_items
where id in (
  select id
  from ranked_inventory
  where duplicate_rank > 1
);

create unique index if not exists reward_inventory_unique_normal_mission_claim
  on reward_inventory_items(couple_id, user_id, source_mission_id, reward_type)
  where source_mission_id is not null
    and reward_type = 'normal';

create index if not exists daily_missions_v2_active_punishments_idx
  on daily_missions_v2(couple_id, punishment_status, applied_punishment_at desc)
  where applied_punishment_at is not null;
