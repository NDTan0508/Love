# Sprint 5 Handoff - May 11, 2026

## Status: SPRINT 5 DONE

Sprint 5 is the roadmap slice for notifications + media polish.

Sprint 4 is complete. Sprint 5 must now be tracked as an ordered task board, not as a loose summary.

## Sprint 5 Task Board

- `[DONE] S5.1` Notification foundation: schema, migration, service, dashboard list UI.
- `[DONE] S5.2` Dev reminder seed path: fallback reminders + dashboard seed action for live Supabase.
- `[DONE] S5.3` Dev scheduling behavior: convert reminders from static/seed-only behavior into data-driven dev reminder rules or local scheduling behavior.
- `[DONE] S5.4` Media optimization slice 1: client-side image optimization before save + shared image render helper for card/detail/preview.
- `[DONE] S5.5` Thumbnail strategy decision: keep single optimized image URL for MVP (defer dedicated thumbnail persistence path).
- `[DONE] S5.6` Robust state cleanup across Sprint 5 surfaces: standardize remaining loading / empty / error states touched by notifications + media polish.
- `[DONE] S5.7` Live verification + Sprint 5 closeout: verify notification + media behavior against live Supabase and close sprint cleanly.

## Rule For This Handoff

This file is now the sprint task source of truth.

Required behavior for every future AI session:

1. Read this task board first.
2. Find the first task in order that is `IN PROGRESS` or `PENDING`.
3. Set `Next Exact Task` to that task only.
4. Do not jump ahead unless a blocker forces it.
5. After finishing one task, update its status immediately before moving to the next task.

## Scope Decision Update

Locked decisions:

- keep Sprint 5 split into notification work first, then media polish, then verification
- keep notification UI on `/dashboard` for MVP instead of building a full inbox route
- keep notification interaction minimal; no read/unread toggle
- keep local fallback available while live notification rows are still sparse
- keep media polish lightweight for MVP; avoid introducing a heavy media pipeline unless clearly needed
- keep one optimized image URL for Sprint 5 MVP; defer dedicated thumbnail persistence path beyond Sprint 5
- do not add browser push, cron infrastructure, or production automation yet unless Sprint 5 explicitly reaches that task

## Completed Work By Task

### S5.1 - Notification foundation

DONE

- `db/schema.sql`
  - added `notifications` table draft
- `db/migrations/0010_notifications.sql`
  - creates `notifications`
  - adds indexes
  - enables RLS
  - allows couple members to read notifications in their couple
  - allows couple members to insert notifications in their couple
- `src/lib/mockData.ts`
  - added `NotificationItem`
  - added local notification fallback rows
- `src/lib/notificationService.ts`
  - loads dashboard notification summary
  - limits dashboard list to top 3 items
  - formats notification badge/timestamp copy
- `src/components/DashboardContent.tsx`
  - renders notification block with loading / empty / error handling

### S5.2 - Dev reminder seed path

DONE

- `src/lib/notificationService.ts`
  - falls back to local reminders if live table is empty
  - exposes `seedNotificationReminders()` for the current couple
- `src/components/DashboardContent.tsx`
  - shows dashboard-only `Seed reminders that` action when live table is empty
- `src/lib/notificationService.test.ts`
  - covers stable fallback behavior when seed is requested without live backend

### S5.4 - Media optimization slice 1

DONE

- `src/lib/mediaUtils.ts`
  - client-side image optimization before upload
  - shared `getMemoryImageSrc()` helper for card/detail/preview
- `src/lib/mediaUtils.test.ts`
  - covers card/detail image source shaping
  - covers unchanged behavior for non-Unsplash URLs
- `src/app/timeline/create/page.tsx`
  - optimizes uploaded local image before save
  - preview uses shared image helper
- `src/app/timeline/[id]/page.tsx`
  - edit modal upload is optimized before save
  - detail hero image + preview use shared image helper
- `src/app/timeline/page.tsx`
  - timeline cards use shared image helper
- `src/components/DashboardContent.tsx`
  - dashboard recent memory cards use shared image helper

### S5.3 - Dev scheduling behavior

DONE

- `src/lib/notificationService.ts`
  - reminders are now rule-based instead of static mock-only rows
  - mood reminder rule fires when the current user has not checked in today
  - timeline inactivity rule fires when the latest memory is stale or timeline is empty
  - anniversary reminder rule fires when the configured anniversary is within the dev reminder window
  - fallback mode and seed mode now use the same rule-based reminder generation path
- `src/lib/notificationService.test.ts`
  - covers mood reminder rule
  - covers timeline inactivity rule
  - covers anniversary reminder rule

### S5.6 - Robust state cleanup across Sprint 5 surfaces

DONE

- `src/components/DashboardContent.tsx`
  - notification block has loading / empty / error states
  - recent memories block reads real timeline data with loading / empty / error states
- `src/app/timeline/[id]/page.tsx`
  - loading state cleaned up
  - not-found / error state uses shared `ErrorState`
  - file encoding / rough fallback text was cleaned during rewrite

### S5.5 - Thumbnail strategy decision

DONE

- decision locked for Sprint 5 MVP:
  - keep single optimized image URL as current contract
  - defer dedicated thumbnail persistence path to a future sprint if performance signals require it
- rationale:
  - current shared image helper already stabilizes card/detail/preview rendering
  - avoids introducing storage/schema complexity during Sprint 5 closeout window
  - keeps current upload/edit flow stable while still enabling post-Sprint optimization paths

### Additional implementation updates (requested during Sprint 5)

- `src/lib/notificationService.ts`
  - dashboard no longer depends on manual `Seed reminders that` action
  - template/rule-managed rows are no longer used as source of truth for rendering; notification list is now recomputed from current mood/timeline rules
  - fixed empty-dashboard case after deleting sample rows: when no reminder condition is triggered, service emits an `all-good` notification
  - added dedupe by content to prevent duplicate notifications (including duplicate `all-good` cards)
- `src/components/DashboardContent.tsx`
  - removed manual seed CTA path from notification block
  - recent memories now display memory-time labels from shared timeline helper
  - dashboard quick-action buttons are fixed at the bottom with increased page bottom padding so actions stay accessible without covering timeline content
- `db/migrations/0011_timeline_happened_at.sql`
  - adds `timeline_events.happened_at` for event-time based timeline behavior
  - backfills existing rows from `created_at`
  - adds descending index for timeline ordering
- `src/lib/timelineService.ts`
  - create/list/update memory now support `happenedAt`
  - timeline list sorts newest-first by `happenedAt` (fallback `createdAt`)
  - exposes shared `getMemoryTimeLabel()` formatter for timeline surfaces
- `src/app/timeline/create/page.tsx`
  - added `datetime-local` input so user selects the memory time at creation
- `src/app/timeline/page.tsx`
  - timeline card timestamp now uses selected memory time label
- `src/app/timeline/[id]/page.tsx`
  - memory detail header now uses selected memory time label
- `src/lib/timelineService.test.ts`
  - added coverage for `happenedAt` create behavior and newest-first sorting

## Verification Result (Sprint 5)

Live verification checklist has been executed and accepted.

Verified outcomes:

- `db/migrations/0010_notifications.sql` applied
- `db/migrations/0011_timeline_happened_at.sql` applied
- `/dashboard` shows notification block for paired user
- notifications follow current rule evaluation when `notifications` table is empty
- refresh keeps notification content consistent with latest mood/timeline state (no manual seed action)
- duplicate notification cards are not shown
- timeline upload/preview still works with large local images
- custom event time from `/timeline/create` is shown in timeline/detail/dashboard
- timeline sorting follows newest `happenedAt` first
- timeline/dashboard image covers render correctly after media polish changes
- new memories appear on `/dashboard` recent memories without mock updates

### S5.7 Verification Log (Final)

- local QA gate passed on latest code:
  - `npm run typecheck`
  - `npm run test`
  - `npm run build`
- notification rule path is stable in code/tests:
  - duplicate cards are deduped by content
  - rule-managed/template rows are not used as source of truth for rendering
  - empty-case still yields `all-good` notification
- live verification accepted by user and Sprint 5 is ready to close

## Next Exact Task

`SPRINT 6` - Start `S6.1` in `SPRINT_6_HANDOFF.md`

Smallest next implementation target:

- create Sprint 6 task board and start `S6.1` (capsule/mission/blog foundation)

## Risks / Notes

- live Supabase will still show empty/error behavior until `0010_notifications.sql` is applied
- after `0010_notifications.sql` is applied, dashboard notification rendering is driven by current mood/timeline rules (not persisted template rows)
- browser push, cron scheduling, and production automation are not started yet
- current media polish uses one optimized image URL, not separate stored thumbnail assets
- dashboard notification UI assumes a short list and is not a full inbox
- dashboard couple hero metadata is still mock-based even though recent memories now come from real timeline data
- anniversary dev reminders currently depend on the existing mock anniversary date, not a real persisted couple anniversary field

## Current Stable Commands

```bash
npm run dev
npm run test
npm run build
npm run qa
```

## Files To Review First Next Session

- `WEB LOVE — AI FULLSTACK IMPLEMENTATION PLAN.md`
- `SPRINT_5_HANDOFF.md`
- `db/migrations/0010_notifications.sql`
- `db/migrations/0011_timeline_happened_at.sql`
- `src/lib/notificationService.ts`
- `src/lib/mediaUtils.ts`
- `src/lib/timelineService.ts`
- `src/components/DashboardContent.tsx`
- `src/app/timeline/[id]/page.tsx`

## Manual Verification Flow

1. Start dev server with `npm run dev`
2. Log in and open `/dashboard`
3. Confirm the notification block appears under relationship health
4. Confirm notification CTA links route correctly
5. If `notifications` is empty, confirm `/dashboard` still renders notifications from current rule evaluation
6. Refresh `/dashboard` and confirm there are no duplicate cards and content follows latest mood/timeline state
7. Open `/timeline/create`, set a custom memory time, upload a large local image, and confirm preview appears normally
8. Save the memory and confirm selected time renders correctly in `/timeline`, `/timeline/[id]`, and `/dashboard`
9. Confirm image still renders correctly across timeline card/detail/dashboard recent memories

## Last Updated

- Date: May 11, 2026
- Updated by: AI Code Assistant
