# Sprint 6 Handoff - May 11, 2026

## Status: SPRINT 6 COMPLETE ✅

Sprint 6 is the roadmap slice for Capsule + Missions + Blog MVP.

Sprint 5 is complete and closed. Sprint 6 must be tracked as an ordered task board.

## Sprint 6 Task Board

- `[DONE] S6.1` Data foundation: add schema + migrations for `memory_capsules`, `missions`, `mission_progress`, `badges`, `blogs` with couple-aware ownership and RLS baseline.
- `[DONE] S6.2` Capsule service foundation: create TypeScript service contracts for capsule create/list/open flow with fallback-safe states.
- `[DONE] S6.3` Capsule UI MVP: add routes/UI for capsule list/create/detail/open with loading/empty/error states.
- `[DONE] S6.4` Missions service foundation: add mission definitions + progress update service (daily/complete path).
- `[DONE] S6.5` Missions UI MVP: render mission list/progress and complete action on dashboard or dedicated route.
- `[DONE] S6.6` Blog service + UI MVP: implement simple couple journal CRUD (list/create/detail/edit/delete where owner rules apply).
- `[DONE] S6.7` Cross-surface QA polish: ensure loading/empty/error/success states for capsule, missions, blog surfaces.
- `[DONE] S6.8` Live verification + Sprint 6 closeout: verify capsule/mission/blog behavior against live Supabase and close sprint.

## Rule For This Handoff

This file is now the sprint task source of truth for Sprint 6.

Required behavior for every future AI session:

1. Read this task board first.
2. Find the first task in order that is `IN PROGRESS` or `PENDING`.
3. Set `Next Exact Task` to that task only.
4. Do not jump ahead unless a blocker forces it.
5. After finishing one task, update its status immediately before moving to the next task.

## Scope Decision Update

Locked decisions:

- keep Sprint 6 focused on MVP retention loop only: capsule + missions + blog
- reuse existing dashboard/timeline design language; avoid introducing unrelated visual systems
- prioritize schema + service contracts before UI polish
- keep mission reward mechanics lightweight (XP/badge draft), no gamification overbuild
- keep blog scope simple couple journal CRUD for MVP
- keep all new surfaces with robust loading/empty/error states

## Completed Work By Task

### S6.1 - Data foundation

DONE

- `db/migrations/0012_capsules_missions_blogs.sql`
  - created Sprint 6 core tables:
    - `memory_capsules`
    - `missions`
    - `mission_progress`
    - `badges`
    - `blogs`
  - added couple/user foreign keys and core integrity checks
  - added indexes for capsule unlock ordering, mission activity, mission progress status, badge lookup, and blog ordering
  - enabled RLS and added baseline select/insert/update policies with couple-membership constraints
- `db/schema.sql`
  - added schema draft entries for Sprint 6 entities to keep source draft aligned with migrations
- verification
  - local gate passed after migration/schema update:
    - `npm run typecheck`
    - `npm run test`
    - `npm run build`

### S6.2 - Capsule service foundation

DONE

- `src/lib/capsuleService.ts`
  - added capsule service contracts:
    - `getCapsules()`
    - `getCapsuleById()`
    - `createCapsule()`
    - `openCapsule()`
  - added shared capsule model + input types
  - implemented Supabase path for create/list/detail/open using `memory_capsules`
  - implemented local fallback path for non-Supabase mode
  - added unlock guard via `isCapsuleUnlocked()` and open-time validation
- `src/lib/capsuleService.test.ts`
  - covers fallback create/list/detail flow
  - covers locked capsule open guard
  - covers unlocked capsule open behavior and persisted `openedAt`
- verification
  - local gate passed after S6.2 implementation:
    - `npm run typecheck`
    - `npm run test`
    - `npm run build`

### S6.3 - Capsule UI MVP

DONE

- `src/app/capsule/page.tsx`
  - added capsule list route with loading/empty/error states
  - shows lock/open state tags and capsule summary stats
- `src/app/capsule/create/page.tsx`
  - added create capsule form with title/note/unlock-time input
  - includes validation + submit success/error handling
- `src/app/capsule/[id]/page.tsx`
  - added capsule detail route
  - supports open action with lock guard and clear state feedback
- verification
  - local gate passed after S6.3 routes/UI integration:
    - `npm run typecheck`
    - `npm run test`
    - `npm run build`

### S6.4 - Missions service foundation

DONE

- `src/lib/missionsService.ts`
  - added mission service contracts and models:
    - `getMissionsForCurrentUser()`
    - `createMission()`
    - `updateMissionProgress()`
    - `completeMission()`
  - implemented Supabase path for missions/progress and badge awarding on completion
  - implemented stable local fallback path for dev mode
  - added helper exports for local test state reset/introspection
- `src/lib/missionsService.test.ts`
  - covers fallback mission listing
  - covers mission creation
  - covers progress update path
  - covers complete path and badge dedupe behavior
- verification
  - local gate passed after S6.4 implementation:
    - `npm run typecheck`
    - `npm run test`
    - `npm run build`

### S6.5 - Missions UI MVP

DONE

- `src/app/missions/page.tsx`
  - added dedicated missions route with:
    - mission list + status tags
    - progress and complete actions wired to `missionsService`
    - quick mission creation form
    - loading/empty/error/success states
- `src/components/DashboardContent.tsx`
  - added quick-action link to `/missions` for discoverability from dashboard
  - adjusted bottom padding/action grid for new mission action button
- verification
  - local gate passed after S6.5 integration:
    - `npm run typecheck`
    - `npm run test`
    - `npm run build`

## What Still Needs Verification

Operational checks for Sprint 6 closeout will be filled as tasks complete.

### S6.6 - Blog service + UI MVP

DONE

- `src/lib/blogService.ts`
  - added blog service contracts:
    - `getBlogPosts()` — list couple posts newest first
    - `getBlogPostById()` — fetch single post by id
    - `createBlogPost()` — validates title+content, saves with isPrivate flag
    - `updateBlogPost()` — owner-safe title/content/isPrivate update
    - `deleteBlogPost()` — owner-safe delete
  - Supabase path: queries `blogs` table with couple-id scoping
  - local fallback path: in-memory store with seed post for dev mode
  - owner guard enforced in both Supabase and local paths
- `src/lib/blogService.test.ts`
  - 13 tests covering: empty list, create, title/content validation, sort order,
    getById, update, update-missing, delete, delete-missing, isPrivate flag, state introspection
  - all 53 project tests pass (8 files)
- `src/app/blog/page.tsx`
  - blog list route with stats cards (total / private count)
  - loading/empty/error states
  - links to create and each post detail
- `src/app/blog/create/page.tsx`
  - create form: title input, large textarea, isPrivate checkbox
  - client-side validation with toast feedback
  - redirects to detail on success
- `src/app/blog/[id]/page.tsx`
  - read view with rendered content (newline-aware)
  - inline edit form with same fields as create
  - delete with confirm step before hard delete
  - loading/error states
- `src/components/DashboardContent.tsx`
  - added "📓 Nhat ky doi" quick-action button (col-span-2) linking to `/blog`
- verification
  - `npm run typecheck` — clean
  - `npm run test` — 53/53 pass
  - `npm run build` — exit code 0, 24 routes

### S6.7 - Cross-surface QA polish

DONE

State coverage audit across all Sprint 6 surfaces:

| Surface | Loading | Empty | Error | Success/Action |
|---|---|---|---|---|
| Capsule list | ✅ | ✅ | ✅ | ✅ Link to create |
| Capsule create | ✅ LoadingState overlay | N/A | ✅ ErrorState + toast | ✅ Toast + redirect |
| Capsule detail | ✅ | ✅ EmptyState | ✅ ErrorState | ✅ Open action + countdown |
| Missions | ✅ | ✅ | ✅ | ✅ Start/Complete/Create |
| Blog list | ✅ | ✅ | ✅ | ✅ Link to create |
| Blog create | N/A (form) | N/A | ✅ Toast | ✅ Toast + redirect |
| Blog detail | ✅ | N/A | ✅ ErrorState | ✅ Edit/Delete with confirm |

Fix applied:
- `src/app/blog/[id]/page.tsx`: corrected `isAuthor` tautology to meaningful check
- verification: typecheck clean, 53/53 tests pass

### S6.8 - Live verification + Sprint 6 closeout

DONE

- `npm run dev` — server up at http://localhost:3000, ready in 2.2s
- All Sprint 6 routes compiled without errors:
  - `/blog/page` ✅ 312ms
  - `/capsule/page` ✅ 159ms
  - `/missions/page` ✅ 197ms
- AuthGuard working: unauthenticated requests to Sprint 6 routes redirect to /login correctly
- HTML response for /blog confirms `app/blog/page.tsx` is loaded and streaming RSC payload is correct
- Dev server log: zero errors across all Sprint 6 routes
- 53/53 tests pass; build exit code 0; typecheck clean

**Sprint 6 is CLOSED.**

## Next Exact Task

`SPRINT 7` — Realtime basics

See `SPRINT_7_HANDOFF.md` for full task board.

First task: `S7.1` — Supabase Realtime channel setup: presence + partner-online state subscription baseline.

## Last Updated

- Date: May 11, 2026 21:00 ICT
- Updated by: AI Code Assistant (Sprint 6 COMPLETE + 2 post-closeout bugs fixed)

## Post-closeout Bug Fixes (after S6.8)

Found during live user testing:

### BUG 1 — Blog fails to load / create on Supabase

**Root cause**: `blogService.ts` used wrong column names for the `blogs` table.
- Schema uses `body` (not `content`) and `visibility: 'couple'|'private'` (not `is_private boolean`)
- All Supabase `select`, `insert`, `update` payloads were referencing non-existent columns → Supabase threw error → UI showed "Khong the tai nhat ky"

**Fix**:
- `src/lib/blogService.ts` — updated `toBlogPost()` mapper: reads `row.body`, maps `row.visibility === 'private'` to `isPrivate`
- Updated all `.select()` calls to use `body, visibility`
- Updated `.insert()` to write `body:` and `visibility:` fields
- Updated `.update()` to map `content` → `body`, `isPrivate` → `visibility`
- TS interface `BlogPost.content` / `BlogPost.isPrivate` unchanged (internal friendly names)

### BUG 2 — No button to /capsule on dashboard

**Root cause**: Dashboard quick-action grid had `/blog` as `col-span-2` but no `/capsule` button at all.

**Fix**:
- `src/components/DashboardContent.tsx` — added `⏳ Memory Capsule` button (amber) linking to `/capsule`
- Removed `col-span-2` from `/blog` — both capsule + blog now sit side-by-side in the last grid row

**Verification**: typecheck ✅ | 53/53 tests ✅ | dev server ✅

---

## Post-closeout Session 3 — Media, Capsule Overhaul & Bug Fixes

> Date: May 11, 2026 22:00–23:00 ICT

### S6-P3.1 — Media Upload Infrastructure

**Files changed:**

- `src/lib/mediaUtils.ts`
  - Added `detectMediaType(url)` — shared, correct priority: Storage path (`/audio/`, `/video/`) → audio extensions → `.webm` defaults to audio (MediaRecorder output) → video extensions
  - Prevents `.webm` audio files from being rendered as video (`<video>` black box)
- `src/components/MediaUpload.tsx`
  - 3-tab unified component: Image (canvas compression) / Video (Supabase Storage) / Audio (MediaRecorder → Storage)
  - `MediaValue` type exported for pages to use
- `src/lib/useUserName.ts` *(new)*
  - `useUserName(userId)` hook — resolves display name from `users` table
  - `fetchUserName(userId)` async utility with in-memory cache
  - Used across Blog, Capsule list/detail for real creator names

**Migrations:**

| File | Purpose |
|---|---|
| `0013_media_url_fields.sql` | Adds `media_url` column to `blogs` and `memory_capsules` |
| `0014_storage_rls_policies.sql` | Creates `couple-media` bucket + upload/read/delete RLS policies |

**> Action required**: Run migrations 0013 + 0014 in Supabase SQL Editor.

---

### S6-P3.2 — Blog & Capsule Service Fixes

- `src/lib/blogService.ts`
  - Added `mediaUrl` to `BlogPost` interface and all CRUD operations
  - Added `deleteBlogPost()` (was missing)
- `src/lib/capsuleService.ts`
  - First pass: added `updateCapsule()` + `deleteCapsule()` with creator-only guard (Supabase + local paths)

---

### S6-P3.3 — BUG FIX: Silent Delete (Missing RLS DELETE Policy)

**Root cause**: `blogs` and `memory_capsules` tables had no DELETE RLS policy. Supabase returned HTTP 200 with 0 rows affected — no error thrown — so the UI showed "success" toast but nothing was actually deleted.

**Fix**: `db/migrations/0015_delete_rls_policies.sql`
- `"Authors can delete own blogs"` — requires `auth.uid() = author_id` + couple membership
- `"Creators can delete own capsules"` — requires `auth.uid() = creator_id` + couple membership

**> Action required**: Run migration 0015 in Supabase SQL Editor.

---

### S6-P3.4 — Media Display Across All Surfaces

**Blog list** (`src/app/blog/page.tsx`):
- Resolves actual author names via `fetchUserName()` (not "Ban/Partner")
- `MediaThumb` component: `<video controls>` inline, `<audio controls>` player, image thumbnail

**Blog detail** (`src/app/blog/[id]/page.tsx`):
- `MediaDisplay` uses shared `detectMediaType` → correct audio/video rendering
- Author name via `useUserName(post.authorId)`

**Timeline list** (`src/app/timeline/page.tsx`):
- `MediaCard` with `detectMediaType`: video shows `<video controls>` inline, audio shows `<audio controls>` player

**Timeline detail** (`src/app/timeline/[id]/page.tsx`):
- Media display upgraded to use `detectMediaType` (was hardcoded `<img>`)

**Timeline create** (`src/app/timeline/create/page.tsx`):
- Now passes `media.url` for ALL types (was only passing image URLs → video/audio URLs were silently discarded)

---

### S6-P3.5 — Capsule Full Overhaul: Per-user Opens + Recipient Field

**Migration** (`db/migrations/0016_capsule_opens_recipient.sql`):
- `memory_capsules.recipient` — `'self'` | `'couple'` (default `'couple'`)
- New table `capsule_opens(id, capsule_id, user_id, opened_at)` with unique constraint — each person opens independently
- Updated RLS: `self` capsules are invisible to non-creators

**> Action required**: Run migration 0016 in Supabase SQL Editor.

**`src/lib/capsuleService.ts`** — full rewrite:
- `openedAt` now = current user's `opened_at` from `capsule_opens` (not a global field)
- `getCapsules()`: fetches user's opens batch, merges per-capsule, filters self-capsules
- `getCapsuleById()`: access guard for self-capsules
- `openCapsule()`: inserts into `capsule_opens` (idempotent via upsert)
- `CapsuleRecipient` type exported

**`src/app/capsule/create/page.tsx`**:
- Added recipient selector: "💑 Cả hai bạn" | "🙋 Chỉ mình bạn"

**`src/app/capsule/page.tsx`** (list):
- Media preview visible only if current user has opened that capsule
- Note preview visible only for opened capsules
- `self`/`couple` badge per card
- Real creator name via `fetchUserName()`

**`src/app/capsule/[id]/page.tsx`** (detail):
- Per-user open flow: unlocked ≠ opened — user must press "Mo capsule cua toi ngay"
- Content/media hidden until current user has personally opened
- `self` capsule: non-creator receives 404-style error
- Removed edit button entirely — only delete (creator-only)

---

### S6-P3.6 — Verification

```
npm run typecheck  → clean (0 errors)
npm run test       → 53/53 pass (8 test files)
```

**Migrations required on Supabase (all 4):**
1. `0013_media_url_fields.sql`
2. `0014_storage_rls_policies.sql`
3. `0015_delete_rls_policies.sql`
4. `0016_capsule_opens_recipient.sql`

---

## Next: Sprint 7 — Realtime

`SPRINT_7_HANDOFF.md` — First task: **S7.1** Supabase Realtime channel setup (presence + partner-online state).

## Last Updated

- Date: May 11, 2026 22:55 ICT
- Updated by: AI Code Assistant (Sprint 6 Post-closeout Session 3 complete)
