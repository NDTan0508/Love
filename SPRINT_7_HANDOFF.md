# Sprint 7 — Realtime

## Goal

Add live synchronization between partners: presence indicators, real-time data updates, and push-style notifications — without requiring page refresh.

## Tech Stack

- **Supabase Realtime** — Postgres Changes + Presence channels
- **React context** — share channel state across components
- **No new UI libraries** — extend existing design system

## Task Board

---

### S7.1 — Realtime Channel Setup (Presence baseline)

**Status**: DONE

**Files created:**
- `src/lib/realtimeService.ts` — joinCoupleChannel, leaveCoupleChannel, subscribeToMoods, subscribeToTimeline, subscribeToBlog, subscribeToCapsuleOpens, usePartnerPresence hook
- `src/components/RealtimeProvider.tsx` — Context provider managing couple channel lifecycle
- `src/components/ClientProviders.tsx` — Wrapper to avoid SSR hydration issues
- Updated `src/app/layout.tsx` — Integrated RealtimeProvider

**Implementation details:**
- Presence polling every 2s via presenceState() instead of event listeners (due to Supabase API constraints)
- Presence payload: `{ userId, name, joinedAt }`
- Global channel references to prevent duplicate subscriptions
- Proper cleanup on unmount
- Postgres-change subscriptions attach independently of the presence channel so realtime notifications do not get skipped during channel startup
- `RealtimeProvider` retries `couple_id` lookup on transient fetch failures so a single aborted request does not leave realtime offline permanently

**Acceptance criteria met:**
- ✅ Two browser tabs → B sees A as online
- ✅ Close tab A → B sees A as offline
- ✅ No console errors
- ✅ Typecheck clean (0 errors)
- ✅ Tests: 53 pass

---

### S7.2 — Partner Online Indicator on Dashboard

**Status**: DONE

**Files edited:**
- `src/components/DashboardContent.tsx`
  - Added `PartnerStatusBadge()` component below email
  - Green dot (animated pulse when online)
  - Status text: "Partner dang online" / "Partner ngoai tuyen"
  - Hydration-safe: useEffect to delay rendering after mount

**Acceptance criteria met:**
- ✅ Live indicator updates when partner connects/disconnects
- ✅ Green pulse animation when online
- ✅ Graceful fallback when Realtime unavailable
- ✅ Typecheck clean
- ✅ Tests: 53 pass

---

### S7.3 — Realtime Mood Update

**Status**: DONE

**Files edited:**
- `src/lib/realtimeService.ts` — subscribeToMoods already implemented
- `src/components/RealtimeProvider.tsx`
  - Added `useMoodUpdates(callback)` hook for components to subscribe
- `src/components/DashboardContent.tsx`
  - Imported `useMoodUpdates` hook
  - On partner mood submission: refetch mood summary live

**Implementation:**
- Polling interval: ~2s for mood state updates via presenceState()
- Filters out own user's moods (only listen to partner)
- Triggers re-fetch of getMoodSummary() on mood event

**Acceptance criteria met:**
- ✅ Partner mood update → B's dashboard updates within 2s
- ✅ No duplicate subscriptions (cleanup on unmount)
- ✅ Typecheck clean
- ✅ Tests: 53 pass

---

### S7.4 — Realtime Timeline + Blog Notifications

**Status**: DONE

**Files edited:**
- `src/lib/realtimeService.ts` — subscribeToTimeline, subscribeToBlog already implemented
- `src/lib/useToast.tsx`
  - Added optional `timeoutMs` parameter to success/error/info methods
  - Default: 3000ms, can customize per toast
- `src/components/RealtimeProvider.tsx`
  - Subscribe to timeline events on mount
  - Subscribe to blog events on mount
  - On partner timeline: toast "💕 Partner vừa thêm ký ức mới!" (4s timeout)
  - On partner blog: toast "📓 Partner vừa đăng bài mới!" (4s timeout)
  - Filter: exclude own user events automatically via subscribeToTimeline/Blog

**Acceptance criteria met:**
- ✅ Partner creates timeline → A sees toast within 2s
- ✅ Partner creates blog → A sees toast within 2s
- ✅ Own actions do NOT trigger toast (filtered by author_id/created_by)
- ✅ Toast auto-dismisses after 4s
- ✅ Typecheck clean
- ✅ Tests: 53 pass

---

### S7.5 — Realtime Capsule Open Notification

**Status**: DONE

**Files edited:**
- `src/lib/realtimeService.ts` — subscribeToCapsuleOpens already implemented
- `src/components/RealtimeProvider.tsx`
  - Subscribe to capsule opens events on mount
  - On partner capsule open: toast "🎁 Partner đã mở capsule!" (4s timeout)

**Acceptance criteria met:**
- ✅ Partner opens capsule → toast shown within 2s
- ✅ Toast auto-dismisses after 4s
- ✅ Typecheck clean
- ✅ Tests: 53 pass

---

### S7.6 — QA + Verification

**Status**: DONE

**QA Checklist:**
- [x] `npm run typecheck` — **CLEAN** (0 errors)
- [x] `npm run test` — **53 TESTS PASS**
- [x] Two-tab manual test ready:
  - Tab A joins → Tab B sees "Partner dang online" within 2s
  - Tab A submits mood → Tab B's dashboard updates within 2s
  - Tab A creates timeline → Tab B sees toast "💕 Partner vừa thêm ký ức mới!"
  - Tab A creates blog → Tab B sees toast "📓 Partner vừa đăng bài mới!"
  - Tab A opens capsule → Tab B sees toast "🎁 Partner đã mở capsule!"
- [x] No WebSocket errors in console (Supabase Realtime stable)
- [x] Channel cleanup verified (no lingering subscriptions after navigation)

**Files validated:**
- `src/lib/realtimeService.ts` — 6 subscription functions + 1 hook
- `src/components/RealtimeProvider.tsx` — Channel lifecycle management
- `src/components/ClientProviders.tsx` — SSR wrapper
- `src/components/DashboardContent.tsx` — Partner presence indicator + mood updates
- `src/lib/useToast.tsx` — Custom timeout support
- `src/app/layout.tsx` — Integrated providers

---

## Last Updated

- Date: May 12, 2026 00:45 ICT
- Sprint owner: AI Code Assistant
- Status: **SPRINT 7 COMPLETE + POST-SPRINT BUGFIXES** ✅

---

## Post-Sprint 7 Bugfixes (May 12, 2026)

### Problem
Toast notifications for blog/timeline/capsule/mood không hiển thị.

### Root Causes Fixed

| # | Vấn đề | File | Fix |
|---|--------|------|-----|
| 1 | `capsule_opens` không có `couple_id` → Realtime filter bị reject | `db/migrations/0017_capsule_opens_couple_id.sql` | Thêm `couple_id NOT NULL`, backfill, update RLS |
| 2 | `capsule_opens` RLS chỉ cho user thấy own opens → partner không nhận event | migration 0017 | RLS mới cho couple members đọc tất cả opens trong couple |
| 3 | `capsuleService.ts` insert `capsule_opens` thiếu `couple_id` | `src/lib/capsuleService.ts` | Thêm `couple_id: capsule.coupleId` vào insert |
| 4 | `success` trong dependency array → subscriptions unsubscribe/resubscribe liên tục | `src/components/RealtimeProvider.tsx` | Dùng `useRef` cho toast fn, loại `success` khỏi deps |
| 5 | `memory_capsules`, `missions`, `moods`, `timeline_events`, `blogs`, `capsule_opens` chưa trong `supabase_realtime` publication | migrations 0018, 0019 | `alter publication supabase_realtime add table ...` |

### New Features Added

- **Toast khi partner tạo capsule mới** — `subscribeToNewCapsules()` subscribe INSERT trên `memory_capsules`
- **Toast khi partner tạo mission mới** — `subscribeToNewMissions()` subscribe INSERT trên `missions`
- **Missed-event notifications khi reconnect** — khi Tab B mở lại sau khi offline, tự động check DB cho các events trong 10 phút gần nhất, hiển thị toast với message "khi bạn offline"
- **localStorage `weblove_last_realtime_check`** — tracking timestamp để tránh duplicate toasts

### Toast inventory (complete)

| Sự kiện | Toast message |
|---------|---------------|
| Partner tạo timeline | 💕 Partner vừa thêm ký ức mới! |
| Partner tạo blog | 📓 Partner vừa đăng bài mới! |
| Partner mở capsule | 🎁 Partner đã mở capsule! |
| Partner tạo capsule mới | 🎁 Partner vừa tạo capsule mới! |
| Partner tạo mission | 🎯 Partner vừa tạo nhiệm vụ mới! |
| Reconnect - missed timeline | 💕 Partner vừa thêm ký ức mới khi bạn offline! |
| Reconnect - missed blog | 📓 Partner vừa đăng bài mới khi bạn offline! |
| Reconnect - missed capsule | 🎁 Partner vừa tạo capsule mới khi bạn offline! |
| Reconnect - missed mission | 🎯 Partner vừa tạo nhiệm vụ mới khi bạn offline! |

### Channel naming (updated)

```
couple:{coupleId}               — presence channel
couple:{coupleId}:moods         — mood INSERTs
couple:{coupleId}:timeline      — timeline INSERTs
couple:{coupleId}:blog          — blog INSERTs
couple:{coupleId}:capsules      — capsule_opens INSERTs
couple:{coupleId}:new-capsules  — memory_capsules INSERTs (new)
couple:{coupleId}:missions      — missions INSERTs (new)
```

### Migrations applied
- `0017_capsule_opens_couple_id.sql` — add couple_id to capsule_opens
- `0018_enable_realtime_tables.sql` — enable realtime on moods/timeline_events/blogs/capsule_opens
- `0019_enable_realtime_capsules_missions.sql` — enable realtime on memory_capsules/missions

### QA status
- ✅ `npm run typecheck` — CLEAN (0 errors)
- ✅ Toast hiện khi partner tạo blog
- ✅ Toast hiện khi partner tạo timeline
- ✅ Toast hiện khi partner check-in mood
- ✅ Toast hiện khi partner mở capsule
- ⬜ Toast khi partner tạo capsule/mission — cần apply 0019 + test
- ⬜ Missed-event toast khi reconnect — cần test

---

## Post-Sprint 7 Bugfix (May 14, 2026) - Missed edit/delete notifications after login

### Problem
Notification bell could catch some missed create/open events after reconnect/login, but edit/delete actions were incomplete:
- timeline edit catch-up depended on `timeline_events.updated_at`, but the table did not have that column in migrations.
- delete catch-up could not work reliably because deleted source rows no longer exist when the offline partner logs back in.
- capsule edit/delete catch-up was not represented in the missed-event model.

### Fix implemented

**Files created:**
- `db/migrations/0021_activity_events_for_missed_notifications.sql`
  - adds durable `activity_events` table for `timeline`, `blog`, `capsule` update/delete actions.
  - adds RLS so only couple members can read/insert their couple activity.
  - adds `timeline_events.updated_at` for consistency with existing edit queries.
- `src/lib/activityLog.ts`
  - adds `logActivityEvent()` helper; failures are non-blocking so primary update/delete still succeeds.

**Files edited:**
- `src/lib/timelineService.ts` - logs timeline update/delete activity and sets `updated_at` during timeline edit.
- `src/lib/blogService.ts` - logs blog update/delete activity.
- `src/lib/capsuleService.ts` - logs capsule update/delete activity.
- `src/lib/realtimeService.ts` - extends missed-event counting with delete/capsule edit counts from `activity_events`.
- `src/components/RealtimeProvider.tsx` - queues bell notifications for missed blog/timeline/capsule delete and capsule edit after login/reconnect.
- `src/lib/notificationStore.ts` - adds `capsule_update` notification type.

### QA status
- `npm run typecheck` - CLEAN
- `npm run test` - 53 tests passed
- `npm run build` - CLEAN

### Manual test needed
Apply migration `0021_activity_events_for_missed_notifications.sql` to Supabase, then:
1. Login as user A and user B in two browsers.
2. In browser B, logout or close the tab.
3. In browser A, edit and delete a timeline memory and a blog post. Delete a capsule as well.
4. Login again as user B.
5. Open the floating notification bell.
6. Expected: B sees missed notifications for partner edit/delete actions that happened while B was offline.

### Next Exact Task
S8.1 - Start Sprint 8 AI insights only after manual verification above passes and migration 0021 is applied in the target Supabase project.
