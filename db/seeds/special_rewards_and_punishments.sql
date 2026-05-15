-- Test seed: all supported special rewards plus extra punishments.
-- Usage in Supabase SQL Editor:
-- 1. Replace the UUID in target_couple_id with your test couple_id.
-- 2. Run the whole file.
-- 3. The script is idempotent by (couple_id, text); running it again will not duplicate rows.

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

  update reward_bank_items
  set text = '[TEST] Khôi phục streak',
      updated_at = now()
  where couple_id = target_couple_id
    and effect = 'protect_streak_once'
    and text = '[TEST] Protect streak 1 lần';

  insert into reward_bank_items (couple_id, text, type, category, intensity, weight, effect, source)
  select target_couple_id, seed.text, seed.type, seed.category, seed.intensity, seed.weight, seed.effect, 'bank'
  from (
    values
      -- Current Daily Mission special rewards.
      ('[TEST] Skip 1 punishment', 'special', 'protection', 1, 8, 'skip_one_punishment'),
      ('[TEST] Đổi 1 mission', 'special', 'control', 2, 8, 'change_one_mission'),
      ('[TEST] Double XP 1 mission', 'special', 'boost', 2, 8, 'double_xp_one_mission'),
      ('[TEST] +20 XP ngay lập tức', 'special', 'boost', 2, 8, 'instant_20_xp'),
      ('[TEST] Tạo commission cho người kia ngày mai', 'special', 'control', 3, 7, 'create_partner_commission_tomorrow'),
      ('[TEST] Copy 1 reward của partner', 'special', 'fun', 3, 7, 'copy_partner_reward'),
      ('[TEST] Swap reward với partner', 'special', 'chaos', 3, 7, 'swap_reward'),
      ('[TEST] Khôi phục streak', 'special', 'protection', 4, 6, 'protect_streak_once'),
      ('[TEST] Bắt partner làm lại 1 mission', 'special', 'chaos', 4, 6, 'force_partner_redo_mission'),
      ('[TEST] Skip tất cả punishment hôm nay', 'special', 'protection', 4, 6, 'skip_all_punishments_today'),
      ('[TEST] +100 XP ngay lập tức', 'special', 'boost', 5, 5, 'instant_100_xp'),
      ('[TEST] Chọn toàn bộ mission ngày mai cho partner', 'special', 'control', 5, 5, 'choose_all_partner_missions_tomorrow'),
      ('[TEST] Double XP cả ngày', 'special', 'boost', 5, 5, 'double_xp_today'),
      ('[TEST] Miễn 1 ngày mission', 'special', 'protection', 5, 5, 'mission_day_off'),

      -- Legacy compatibility rewards still supported by server logic.
      ('[TEST-LEGACY] Skip punishment', 'special', 'protection', 1, 3, 'skip_punishment'),
      ('[TEST-LEGACY] Change mission', 'special', 'control', 2, 3, 'change_mission'),
      ('[TEST-LEGACY] Double mission XP', 'special', 'boost', 2, 3, 'double_mission_xp'),
      ('[TEST-LEGACY] Instant XP theo intensity', 'special', 'boost', 2, 3, 'instant_xp'),
      ('[TEST-LEGACY] Block troll charge', 'special', 'protection', 3, 3, 'block_troll'),
      ('[TEST-LEGACY] Choose partner mission', 'special', 'control', 3, 3, 'choose_partner_mission'),
      ('[TEST-LEGACY] Swap rewards', 'special', 'chaos', 3, 3, 'swap_rewards'),
      ('[TEST-LEGACY] Protect streak', 'special', 'protection', 4, 3, 'protect_streak')
  ) as seed(text, type, category, intensity, weight, effect)
  where not exists (
    select 1
    from reward_bank_items existing
    where existing.couple_id = target_couple_id
      and existing.text = seed.text
  );

  insert into punishment_bank_items (couple_id, text, category, intensity, safe, source)
  select target_couple_id, seed.text, seed.category, seed.intensity, true, 'bank'
  from (
    values
      ('[TEST] Gửi một câu xin lỗi ngọt trong mess', 'message', 1),
      ('[TEST] Khen người ấy 3 câu liên tiếp', 'message', 1),
      ('[TEST] Đổi avatar chat thành ảnh cute trong 10 phút', 'fun', 2),
      ('[TEST] Gửi voice 5 giây nói một câu sến', 'cringe', 2),
      ('[TEST] Nhắn một câu thả thính thật nghiêm túc', 'cringe', 2),
      ('[TEST] Làm một sticker tự chế gửi cho người ấy', 'fun', 3),
      ('[TEST] Để người ấy chọn tên gọi trong hôm nay', 'fun', 3),
      ('[TEST] Chụp một ảnh tay trái tim gửi người ấy', 'action', 3),
      ('[TEST] Hát 1 đoạn ngắn và gửi voice', 'cringe', 4),
      ('[TEST] Viết một đoạn 5 dòng nịnh người ấy', 'message', 4),
      ('[TEST] Cho người ấy chọn một nhiệm vụ mess thêm', 'chaos', 4),
      ('[TEST] Cho người ấy đổi 1 reward normal của bạn', 'chaos', 5)
  ) as seed(text, category, intensity)
  where not exists (
    select 1
    from punishment_bank_items existing
    where existing.couple_id = target_couple_id
      and existing.text = seed.text
  );

  insert into daily_mission_bank_items (couple_id, type, mission_kind, text, created_at, updated_at)
  select
    existing.couple_id,
    'punishment',
    case
      when existing.category = 'action' then 'action'
      else 'mess'
    end,
    existing.text,
    existing.created_at,
    existing.updated_at
  from punishment_bank_items existing
  where existing.couple_id = target_couple_id
    and not exists (
      select 1
      from daily_mission_bank_items daily_bank
      where daily_bank.couple_id = existing.couple_id
        and daily_bank.type = 'punishment'
        and daily_bank.text = existing.text
    );
end $$;
