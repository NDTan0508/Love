-- Migration 0044: make legacy/economy punishment bank items available to daily missions.
--
-- punishment_bank_items is a couple-level template bank. Daily mission generation
-- reads daily_mission_bank_items, then stores the selected punishment on
-- daily_missions_v2.user_id/punishment_item_id/punishment.

insert into daily_mission_bank_items (
  couple_id,
  type,
  mission_kind,
  text,
  created_at,
  updated_at
)
select
  punishment_bank_items.couple_id,
  'punishment',
  case
    when punishment_bank_items.category = 'action' then 'action'
    else 'mess'
  end,
  punishment_bank_items.text,
  punishment_bank_items.created_at,
  punishment_bank_items.updated_at
from punishment_bank_items
where not exists (
  select 1
  from daily_mission_bank_items existing
  where existing.couple_id = punishment_bank_items.couple_id
    and existing.type = 'punishment'
    and existing.text = punishment_bank_items.text
);
