-- Migration 0046: keep reward_bank_items.effect in sync with supported special rewards.
--
-- Migration 0042 expanded reward_inventory_items.reward_effect but older DBs can
-- still reject new special rewards at reward_bank_items.effect.

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'reward_bank_items_effect_check'
  ) then
    alter table reward_bank_items
      drop constraint reward_bank_items_effect_check;
  end if;

  alter table reward_bank_items
    add constraint reward_bank_items_effect_check
    check (
      effect is null
      or effect in (
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
end $$;
