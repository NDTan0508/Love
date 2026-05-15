# Sprint 11 - Playful Couple Product Upgrade

## Goal

Turn Sprint 10 mock features into a practical shared couple product: clean Vietnamese copy, simpler navigation, Supabase-backed Wishlist/Gifts, and a stronger realtime Games foundation.

## Sprint Task Board

- `[DONE] S11.1` Clean Vietnamese copy, app metadata, navigation, and production route exposure.
- `[DONE] S11.2` Add Supabase schema/RLS for shared wishlist, rewards, and game sessions.
- `[DONE] S11.3` Implement Wishlist/Gifts as shared couple data with surprise reservations and rewards.
- `[DONE] S11.4` Implement realtime Games V1: Couple Quiz, Drawing Guess, Heart Tic-tac-toe.
- `[DONE] S11.5` Add contextual Love Coach cards on dashboard, gifts, games, mood, and memories.
- `[DONE] S11.6` Update docs/audit/schema and run QA.
- `[DONE] S11.7` QA hardening from live tester pass: real couple profile, server-owned game moves, bell safe placement, and copy cleanup.

## Locked Product Decisions

- Direction: cute/playful, but with real shared data and private couple-only flows.
- Main nav: Home, Memories, Mood center action, Us, More.
- Wishlist: shared list with private surprise reservation.
- Games: couple-only realtime, 3 solid games first.
- Rewards: game XP connects to wishlist/coupon rewards.
- AI/Love Coach: proactive, visible on main pages, emotionally safe.

## Next Exact Task

Apply migration `0028_couple_profile_and_game_hardening.sql` in Supabase SQL Editor, then test Settings profile save with a real couple:

1. Open `/settings`.
2. Update couple name, anniversary date, your birthday, and phone.
3. Open `/dashboard` and `/stats`.
4. Confirm day count and couple name come from the saved profile.

## QA Status

- `npm.cmd run check:migrations` passed: 28 migrations, latest `0028_couple_profile_and_game_hardening.sql`.
- `npm.cmd run check:rls` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run test` passed: 10 files, 67 tests.
- `npm.cmd run build` passed.
- `npm.cmd run e2e:missed` passed.
- `node scripts/e2e-pair.js` passed: two users can pair and read shared timeline through RLS.
- Manual API game QA passed: partner move before joining is blocked with `403 not_player`; after both join, Heart Tic-tac-toe completes and creates exactly one game reward.
- Tried applying `0028` through `exec_sql`; remote project does not expose `public.exec_sql`, so migration must be applied manually in Supabase SQL Editor before profile fields can persist.
- Runtime smoke after dev server restart returned 200 for `/`, `/games`, `/gifts`, `/mood`, `/memories`, `/us`, `/more`, `/privacy`.
- Runtime smoke confirmed `/components` returns 404.

## Completed Work

- Added `0027_shared_wishlist_and_realtime_games.sql`.
- Added shared wishlist/reward/game tables to `db/schema.sql` and RLS audit.
- Replaced bottom nav with Home, Memories, Mood, Us, More.
- Added `/memories`, `/us`, and `/more` hubs.
- Rebuilt `/gifts` on shared wishlist data with private surprise reservations and reward XP.
- Rebuilt `/games` with Couple Quiz, Drawing Guess, and Heart Tic-tac-toe session UI.
- Added API routes for wishlist and games sessions/moves/restart.
- Cleaned visible Vietnamese copy on app shell, dashboard, settings, gifts, games, mood, privacy, date ideas, stats, and realtime notifications.
- Removed dev-only `/components` route from production.
- Added migration `0028_couple_profile_and_game_hardening.sql`.
- Added `src/lib/coupleProfileService.ts`.
- Rebuilt `/settings` with editable real couple profile fields.
- Updated `/dashboard` and `/stats` to use real couple profile instead of `mockCouple`.
- Changed game move/restart flow so the client calls API routes; API validates player membership, turn/state changes, and writes game state/reward with service role.
- Removed broad `game_sessions` update policy in migration `0028`.
- Rebuilt floating notification bell into a fixed bottom safe-zone control so it no longer overlaps header actions.
- Rebuilt `/games`, `/gifts`, `/signup`, and AI bonding pages copy where tester pass found visible broken Vietnamese.

## Last Updated

- Date: May 14, 2026
- Updated by: AI Code Assistant
