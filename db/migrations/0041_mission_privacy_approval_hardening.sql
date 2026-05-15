-- Migration 0041: Mission privacy, approval hardening, and reset safety.

alter table daily_missions_v2
  add column if not exists rejected_by uuid references users(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists auto_approved_at timestamptz,
  add column if not exists review_deadline_at timestamptz;

create index if not exists daily_missions_v2_review_deadline_idx
  on daily_missions_v2(couple_id, mission_date, status, review_deadline_at);

do $$
declare
  duplicate_record record;
  replacement_record record;
begin
  for duplicate_record in
    select *
    from (
      select
        id,
        couple_id,
        mission_date,
        mission_item_id,
        row_number() over (
          partition by couple_id, mission_date, mission_item_id
          order by
            case status when 'completed' then 1 when 'waiting_partner_approval' then 2 else 3 end,
            created_at,
            id
        ) as duplicate_rank
      from daily_missions_v2
      where mission_item_id is not null
    ) ranked
    where duplicate_rank > 1
  loop
    select id, text, mission_kind
      into replacement_record
    from daily_mission_bank_items bank
    where bank.couple_id = duplicate_record.couple_id
      and bank.type = 'mission'
      and not exists (
        select 1
        from daily_missions_v2 existing
        where existing.couple_id = duplicate_record.couple_id
          and existing.mission_date = duplicate_record.mission_date
          and existing.mission_item_id = bank.id
      )
    order by bank.created_at, bank.id
    limit 1;

    if found then
      update daily_missions_v2
      set
        mission_item_id = replacement_record.id,
        mission_kind = replacement_record.mission_kind,
        title = replacement_record.text,
        updated_at = now()
      where id = duplicate_record.id;
    else
      update daily_missions_v2
      set mission_item_id = null, updated_at = now()
      where id = duplicate_record.id;
    end if;
  end loop;

  for duplicate_record in
    select *
    from (
      select
        id,
        couple_id,
        mission_date,
        reward_item_id,
        row_number() over (
          partition by couple_id, mission_date, reward_item_id
          order by
            case status when 'completed' then 1 when 'waiting_partner_approval' then 2 else 3 end,
            created_at,
            id
        ) as duplicate_rank
      from daily_missions_v2
      where reward_item_id is not null
    ) ranked
    where duplicate_rank > 1
  loop
    select id, text
      into replacement_record
    from daily_mission_bank_items bank
    where bank.couple_id = duplicate_record.couple_id
      and bank.type = 'reward'
      and not exists (
        select 1
        from daily_missions_v2 existing
        where existing.couple_id = duplicate_record.couple_id
          and existing.mission_date = duplicate_record.mission_date
          and existing.reward_item_id = bank.id
      )
    order by bank.created_at, bank.id
    limit 1;

    if found then
      update daily_missions_v2
      set reward_item_id = replacement_record.id, reward = replacement_record.text, updated_at = now()
      where id = duplicate_record.id;
    else
      update daily_missions_v2
      set reward_item_id = null, updated_at = now()
      where id = duplicate_record.id;
    end if;
  end loop;

  for duplicate_record in
    select *
    from (
      select
        id,
        couple_id,
        mission_date,
        punishment_item_id,
        row_number() over (
          partition by couple_id, mission_date, punishment_item_id
          order by
            case status when 'completed' then 1 when 'waiting_partner_approval' then 2 else 3 end,
            created_at,
            id
        ) as duplicate_rank
      from daily_missions_v2
      where punishment_item_id is not null
    ) ranked
    where duplicate_rank > 1
  loop
    select id, text
      into replacement_record
    from daily_mission_bank_items bank
    where bank.couple_id = duplicate_record.couple_id
      and bank.type = 'punishment'
      and not exists (
        select 1
        from daily_missions_v2 existing
        where existing.couple_id = duplicate_record.couple_id
          and existing.mission_date = duplicate_record.mission_date
          and existing.punishment_item_id = bank.id
      )
    order by bank.created_at, bank.id
    limit 1;

    if found then
      update daily_missions_v2
      set punishment_item_id = replacement_record.id, punishment = replacement_record.text, updated_at = now()
      where id = duplicate_record.id;
    else
      update daily_missions_v2
      set punishment_item_id = null, updated_at = now()
      where id = duplicate_record.id;
    end if;
  end loop;
end $$;

create unique index if not exists daily_missions_v2_unique_mission_item_per_day
  on daily_missions_v2(couple_id, mission_date, mission_item_id)
  where mission_item_id is not null;

create unique index if not exists daily_missions_v2_unique_reward_item_per_day
  on daily_missions_v2(couple_id, mission_date, reward_item_id)
  where reward_item_id is not null;

create unique index if not exists daily_missions_v2_unique_punishment_item_per_day
  on daily_missions_v2(couple_id, mission_date, punishment_item_id)
  where punishment_item_id is not null;

with ranked_rewards as (
  select
    id,
    couple_id,
    source_type,
    xp_amount,
    row_number() over (
      partition by couple_id, user_id, source_type, label
      order by created_at, id
    ) as duplicate_rank
  from couple_rewards
),
duplicate_mission_xp as (
  select couple_id, coalesce(sum(xp_amount), 0) as xp_to_remove
  from ranked_rewards
  where duplicate_rank > 1
    and source_type = 'mission'
  group by couple_id
),
stats_update as (
  update daily_mission_couple_stats stats
  set
    xp = greatest(0, stats.xp - duplicate_mission_xp.xp_to_remove),
    updated_at = now()
  from duplicate_mission_xp
  where stats.couple_id = duplicate_mission_xp.couple_id
  returning stats.couple_id
)
delete from couple_rewards
where id in (
  select id
  from ranked_rewards
  where duplicate_rank > 1
);

create unique index if not exists couple_rewards_unique_source_label
  on couple_rewards(couple_id, user_id, source_type, label);

drop policy if exists "Couple members can read daily missions v2" on daily_missions_v2;
create policy "Mission owners can read private missions and partners can read submitted missions"
on daily_missions_v2 for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = daily_missions_v2.couple_id
      and cm.user_id = auth.uid()
  )
  and (
    daily_missions_v2.user_id = auth.uid()
    or daily_missions_v2.status in ('waiting_partner_approval', 'completed')
  )
);

drop policy if exists "Couple members can update daily missions v2" on daily_missions_v2;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and tablename = 'notifications'
    ) then
      alter publication supabase_realtime add table notifications;
    end if;
  end if;
end $$;
