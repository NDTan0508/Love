-- Test grant: copy all special/power reward bank items into reward inventory.
-- Use this after special_rewards_and_punishments.sql.
--
-- Usage in Supabase SQL Editor:
-- 1. Replace target_couple_id with your test couple_id.
-- 2. Run the whole file.
-- 3. It grants each special/power reward to every member of the couple.
-- 4. It will not duplicate an unused copy of the same reward for the same user.

do $$
declare
  target_couple_id uuid := '61881d7d-a455-476e-888c-c5028b3c42ee';
begin
  if target_couple_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Replace target_couple_id with your real couple_id before running this seed.';
  end if;

  if not exists (select 1 from couples where id = target_couple_id) then
    raise exception 'couple_id % does not exist in couples.', target_couple_id;
  end if;

  if not exists (select 1 from couple_members where couple_id = target_couple_id) then
    raise exception 'couple_id % has no couple_members.', target_couple_id;
  end if;

  insert into reward_inventory_items (
    user_id,
    couple_id,
    reward_id,
    reward_text,
    reward_type,
    reward_category,
    reward_intensity,
    reward_weight,
    reward_effect,
    reward_payload,
    source_type,
    source_mission_id,
    status,
    acquired_from,
    acquired_at,
    used_at,
    expires_at,
    updated_at
  )
  select
    member.user_id,
    bank.couple_id,
    bank.id,
    bank.text,
    bank.type,
    bank.category,
    bank.intensity,
    bank.weight,
    bank.effect,
    jsonb_build_object(
      'seed', 'grant_special_rewards_to_inventory',
      'bankRewardId', bank.id,
      'effect', bank.effect
    ),
    null,
    null,
    'unused',
    'manual',
    now(),
    null,
    null,
    now()
  from reward_bank_items bank
  join couple_members member
    on member.couple_id = bank.couple_id
  where bank.couple_id = target_couple_id
    and bank.type in ('special', 'power')
    and not exists (
      select 1
      from reward_inventory_items existing
      where existing.couple_id = bank.couple_id
        and existing.user_id = member.user_id
        and existing.reward_id = bank.id
        and existing.status = 'unused'
    );
end $$;
