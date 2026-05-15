# Sprint 12 - Couple Daily Mission Game Economy

## Goal

Turn Daily Mission V2 into a real couple game loop:

- Mess missions are online teasing / message-based tasks.
- Action missions are real-life playful moments.
- Normal rewards are private inventory items claimed later.
- System special rewards are rare gameplay powers earned from action mission milestones.

## Sprint Task Board

- `[DONE]` S12.1 Create Sprint 12 handoff and lock product rules.
- `[DONE]` S12.2 Add schema for reward bank, punishment bank, inventory, cycle state, and economy safety flags.
- `[DONE]` S12.3 Implement reward economy server logic: bank CRUD, cycle-based drops, inventory, and power-effect resolution.
- `[DONE]` S12.4 Wire daily mission completion and streak rewards into inventory drops.
- `[DONE]` S12.5 Add production UI for reward card, inventory tabs, use modal, drop animation, punishment card, and bank management.
- `[DONE]` S12.6 Add targeted API routes and client service methods for reward usage and bank management.
- `[DONE]` S12.7 QA with typecheck, tests, migration audit, and RLS audit.
- `[DONE]` S12.8 Add mission type hardening: mess/action bank matching, normal reward privacy, per-user action counters, and system-defined special rewards.

## Current Product Rules

- Mission types are `mess`, `action`, and generated `commission`.
- User bank items are typed as `mess` or `action` for missions, rewards, and punishments.
- Daily generation creates 3 missions per user from the bank, with matching reward and punishment type.
- A mess mission gets a mess reward and mess punishment.
- An action mission gets an action reward and action punishment.
- Completing any mission grants +20 XP, with no failed-mission XP deduction.
- Completing all 6 daily missions grants +30 XP and increases streak by 1.
- Missing 6/6 resets streak unless Protect Streak is active.
- Normal rewards are created from completed mission rewards and are private to the owning user.
- Special rewards are fixed in code, hidden from bank UI, duplicate-allowed, no-expiry inventory items.
- Every 5 completed action missions per user grants one random system special reward.

## Implemented In This Update

- Added migration `0042_mission_type_special_rewards.sql`.
- Added `bank_item_type`, `generated_by_special_reward`, reward inventory source fields, and `daily_mission_user_action_counters`.
- Relaxed mission status/type constraints for `failed` and `commission`.
- Changed daily generation to select reward/punishment from the same type as the picked mission.
- Changed mission approval to grant normal reward inventory from the completed mission reward.
- Added per-user action completion counter and guaranteed special reward on each 5th action completion.
- Added fixed special reward catalog and handlers for XP boosts, streak protection, mission changes, punishment skips, copy/swap, commissions, force redo, day off, and day-wide double XP.
- Tightened reward inventory fetch so normal inventory is current-user only; partner rewards are only provided as a special-use selection list.
- Updated mission cards with mess/action/commission badges and pastel type backgrounds.
- Updated bank UI so Mission, Reward, and Punishment banks all have Mess/Action sub-tabs.
- Updated inventory UI to show only unused Normal Rewards and Special Rewards.

## Rollout Notes

Apply migrations through `0042_mission_type_special_rewards.sql` in Supabase SQL Editor.

After deploy, verify with a real couple:

1. Add mess/action items to Mission, Reward, and Punishment banks.
2. Trigger daily generation and confirm reward/punishment type matches mission type.
3. Complete and approve a mess mission, then confirm its normal reward appears only for that user.
4. Complete and approve 5 action missions for one user, then confirm one special reward appears for that user only.
5. Claim a normal reward and confirm it disappears from inventory and sends the partner notification.
6. Use representative special rewards: instant XP, double XP one mission, skip punishment, commission tomorrow, copy reward, swap reward, protect streak.

## QA

- `npm run typecheck` passed.
- `npm run check:migrations` passed.
- `npm run check:rls` passed.
- `npm test` passed: 10 files, 54 tests.

## Last Updated

- Date: May 15, 2026
- Updated by: AI Code Assistant
