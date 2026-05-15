# Sprint 7.2 - Hardening before AI

## Goal

Tighten the app after Sprint 1-7 before starting Sprint 8 AI. This sprint is about reliability, security, real-user flow, and emotional product quality.

## Sprint Task Board

- `[DONE] S7.2.1` Migration and RLS operational guardrails: local migration checker, current migration inventory, and clear manual apply/test flow.
- `[DONE] S7.2.2` Notification bell durability: move bell from local-only state to DB-backed inbox with local fallback.
- `[DONE] S7.2.3` Auth/admin cleanup: remove or neutralize plaintext pending signup risk without breaking current signup/pair flow.
- `[DONE] S7.2.4` Two-user QA automation: add a focused script for realtime/missed notification smoke testing.
- `[DONE] S7.2.5` Encoding and copy cleanup: fix mojibake on high-traffic UI surfaces and keep Vietnamese tone warm.
- `[DONE] S7.2.6` RLS audit pass: document and patch table-level access gaps for couple-owned data.
- `[DONE] S7.2.7` AI privacy gate: add opt-out/privacy foundation before any AI insight feature reads couple data.

## Completed Work

### S7.2.1 - Migration and RLS operational guardrails

DONE

- Added `scripts/check-migrations.mjs`.
- Added `npm run check:migrations`.
- `npm run qa` now runs migration check before typecheck/test/build.

### S7.2.2 - Notification bell durability

DONE

- Added `db/migrations/0022_notification_inbox_dismissed_at.sql`.
- Updated `src/lib/notificationStore.ts`:
  - loads DB notifications for the current user.
  - persists new bell notifications to `notifications`.
  - syncs read state and clear/dismiss state to DB.
  - keeps localStorage fallback for offline/dev mode.
- Updated `src/components/RealtimeProvider.tsx` to configure notification sync after couple/user context is known.

Manual live requirement:
- Apply `0022_notification_inbox_dismissed_at.sql` before expecting DB-backed clear/dismiss behavior.

### S7.2.3 - Auth/admin cleanup

DONE

- `src/app/api/auth/request-signup/route.ts`
  - DEV auto-approve now creates the Supabase account before writing any pending state.
  - plaintext passwords are no longer written to `data/pending_signups.json`.
- `src/app/api/auth/admin/approve/route.ts`
  - no longer reads password from pending file.
  - manual admin approval must provide a password directly.
- `.gitignore`
  - ignores `data/pending_signups.json`.
- Existing local `data/pending_signups.json` was sanitized to remove password fields.

### S7.2.4 - Two-user QA automation

DONE

- Added `scripts/e2e-missed-notifications.js`.
- Added `npm run e2e:missed`.
- The script creates two Supabase users, pairs them into one couple, writes `activity_events` as user A, then confirms user B can read the partner activity through RLS.

Manual live requirement:
- Run only after migrations `0021`, `0022`, and `0023` are applied to Supabase.

### S7.2.5 - Encoding and copy cleanup

DONE

- Rewrote `src/app/signup/page.tsx` with clean UTF-8 Vietnamese copy and warmer couple-oriented messaging.
- Cleaned the floating notification bell high-traffic labels to avoid mojibake.

### S7.2.6 - RLS audit pass

DONE

- Added `scripts/audit-rls.mjs`.
- Added `npm run check:rls`.
- `npm run qa` now runs RLS audit.
- Audit covers 18 core tables.

### S7.2.7 - AI privacy gate

DONE

- Added `db/migrations/0023_ai_privacy_settings.sql`.
- Added `src/lib/aiPrivacyService.ts`.
- Added `/privacy` route with loading/error/success states.
- Added dashboard link to `/privacy`.
- AI insights are disabled by default until the current user explicitly opts in.

## Current Status

Sprint 7 is complete in code. Sprint 7.2 starts from the seven improvement areas identified after reviewing Sprint 1-7:

1. Live Supabase migration state needs clearer checks.
2. Admin/pending signup flow still contains plaintext-password technical debt.
3. Notification bell should not rely only on localStorage.
4. Realtime and missed notifications need stronger two-user QA.
5. Text encoding/copy needs cleanup.
6. RLS needs an explicit audit before release.
7. AI needs privacy/opt-out groundwork before Sprint 8.

## Verification

- `npm run check:migrations` - CLEAN, 23 migrations, latest `0023_ai_privacy_settings.sql`
- `npm run check:rls` - CLEAN, 18 core tables covered
- `npm run typecheck` - CLEAN
- `npm run test` - 53 tests passed
- `npm run build` - CLEAN, 25 routes

## Next Exact Task

Manual test S7.2.2/S7.2.7 after applying migrations `0021`, `0022`, and `0023` in Supabase:

1. Login with a paired user.
2. Open `/privacy`, turn AI insights on, refresh, confirm it stays on.
3. Turn AI insights off, refresh, confirm it stays off.
4. Login with two paired users in two browsers.
5. Trigger partner notifications and confirm the bell persists them after refresh.
6. Mark read and clear notifications, refresh, confirm read/clear state remains.
7. Run `npm run e2e:missed` to validate RLS substrate for missed activity.

After manual verification passes, continue to Sprint 8 AI insights with the privacy gate enforced.

## Manual Test Flow For This Sprint

After each completed slice:

1. Run `npm run qa` or the listed verification commands.
2. Start or reuse `npm run dev`.
3. Login two paired users in separate browsers.
4. Check the user flow affected by the slice.
5. Confirm the UI still feels like a private couple space: warm copy, clear states, no broken or generic dashboard behavior.

## Last Updated

- Date: May 14, 2026
- Updated by: AI Code Assistant
