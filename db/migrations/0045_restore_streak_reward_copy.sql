-- Migration 0045: rename protect-streak-once reward copy to restore-streak.
--
-- The effect key stays protect_streak_once so existing inventory keeps working.
-- Runtime behavior now restores the latest lost streak instead of adding a
-- future protection charge.

update reward_bank_items
set text = 'Khôi phục streak',
    updated_at = now()
where effect = 'protect_streak_once'
  and text = 'Protect streak 1 lần';

update reward_bank_items
set text = '[TEST] Khôi phục streak',
    updated_at = now()
where effect = 'protect_streak_once'
  and text = '[TEST] Protect streak 1 lần';

update reward_inventory_items
set reward_text = 'Khôi phục streak',
    reward_payload = coalesce(reward_payload, '{}'::jsonb) || jsonb_build_object('description', 'Khôi phục chuỗi gần nhất bị mất.'),
    updated_at = now()
where reward_effect = 'protect_streak_once'
  and reward_text = 'Protect streak 1 lần';

update reward_inventory_items
set reward_text = '[TEST] Khôi phục streak',
    reward_payload = coalesce(reward_payload, '{}'::jsonb) || jsonb_build_object('description', 'Khôi phục chuỗi gần nhất bị mất.'),
    updated_at = now()
where reward_effect = 'protect_streak_once'
  and reward_text = '[TEST] Protect streak 1 lần';
