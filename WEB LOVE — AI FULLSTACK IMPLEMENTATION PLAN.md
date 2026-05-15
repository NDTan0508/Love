# WEB LOVE — AI FULLSTACK IMPLEMENTATION PLAN

Tài liệu này là nguồn sự thật duy nhất cho mọi AI/code agent tham gia triển khai Web Love.

Mục tiêu:
- Giúp AI khác đọc vào là hiểu ngay dự án đang ở đâu, cần làm gì tiếp theo, và phải tuân thủ quy tắc nào.
- Duy trì đồng bộ công việc khi đổi AI, hết token, hoặc chuyển sang agent khác.
- Ưu tiên build đúng hệ thống, đúng UI, đúng cảm xúc sản phẩm, không làm lệch hướng từ tài liệu gốc.

---

## 1) North Star

Web Love là emotional-first web app cho cặp đôi, không phải app CRUD thông thường.

Trục sản phẩm cốt lõi:
- Memory: lưu giữ ký ức.
- Emotion: chăm sóc cảm xúc.
- Bonding: tăng tương tác và gắn kết.

Mục tiêu triển khai:
- Mobile-first, PWA-friendly.
- Có login thật, pair account thật, dữ liệu thật, realtime thật, upload ảnh thật.
- UI phải giữ cảm giác “đây là thế giới riêng của hai người”.

---

## 1.1 Six Guiding Principles (Bắt buộc)

Mọi quyết định kỹ thuật và thiết kế phải tuân theo 6 nguyên tắc sau (đã thảo luận):

1. Vertical slice first — Bắt đầu bằng một "vertical slice" chạy end-to-end (auth → data → UI) trước khi mở rộng.
2. Design system first — Chốt color, typography, spacing, motion từ `UI/` trước khi code nhiều page.
3. Core flow priority — Ưu tiên core flow: `auth` → `pair account` → `dashboard` → `timeline` → `mood`.
4. Data & permissions before polish — Thiết kế schema, privacy và RLS trước khi hoàn thiện hiển thị.
5. Robust states — Mỗi màn hình phải có `loading`, `empty`, `error`, `success` (offline nếu cần).
6. AI last — AI features chỉ thêm khi có dữ liệu nền đủ cho insight (mood, timeline, interactions).

---

## 2) Thứ tự bắt buộc phải đọc trước khi code

Mọi AI/code agent phải đọc theo đúng thứ tự này trước khi viết code hoặc refactor lớn:

1. `WEB LOVE — ROADMAP XÂY DỰNG WEB APP COUPLE THỰC TẾ.md`
   - Để hiểu định hướng triển khai thực tế, thứ tự build, stack khuyến nghị, và ưu tiên MVP.

2. `WEB LOVE — AI VIBE CODING MASTER GUIDE.md`
   - Để tuân thủ quy tắc code, style UI/UX, responsive rules, state rules, AI tone, performance, security, naming, and development workflow.

3. `WEB LOVE — MASTER PRODUCT & SYSTEM BLUEPRINT.md`
   - Để hiểu product vision, architecture tổng quan, database, API, flow onboarding, IA, KPI, NFR và business model.

4. `WEB LOVE — MASTER PRODUCT & SYSTEM BLUEPRINT (ULTIMATE PRODUCTION EDITION).md`
   - Để hiểu spec production-level cho từng feature, backend/realtime/frontend spec, design system, AI pipeline, retention loop, monetization, and expansion.

5. Folder `UI/`
   - Để đối chiếu design hiện tại, mood giao diện, spacing, typography, card style, mobile proportions, và các màn hình mẫu đã có.

Nếu còn thời gian, đọc thêm `UI/1.html` đến `UI/12.html` để trích style cues và component patterns.
> NOTE: 12 file HTML trong folder `UI/` là các giao diện tĩnh được tạo bởi AI từ 12 screenshot. Chúng chỉ là tham khảo design (layout, màu sắc, spacing, typography, motion cues). Những file này không đầy đủ về mặt tương tác (JS), validation, form behavior, state handling, hoặc các trường hợp biên (empty/error). Khi thực hiện FE, bắt buộc phải bổ sung mọi interaction, accessibility, validation, và các phần logic thiếu trong các file tĩnh này để khớp hoàn toàn với spec và flow thực tế.

---

## 3) Vai trò của từng AI khi làm việc

Mỗi AI có thể nhận một hoặc nhiều role, nhưng phải ghi rõ đang đóng vai nào trong log hoặc kế hoạch triển khai.

### 3.1 Product Planner

Nhiệm vụ:
- Chia roadmap thành phase nhỏ.
- Xác định thứ tự feature theo giá trị sản phẩm.
- Giữ scope đúng MVP, không nhảy sang feature chưa cần.

Output mong đợi:
- Danh sách phase.
- Milestone.
- Definition of Done cho từng feature.

### 3.2 System Architect

Nhiệm vụ:
- Chọn cấu trúc app, data flow, boundary giữa frontend/backend/realtime/AI.
- Tổ chức module, services, data model, permission model, event model.
- Giữ kiến trúc scalable nhưng không over-engineer MVP.

Output mong đợi:
- Kiến trúc tổng thể.
- Sơ đồ module.
- Quyết định kỹ thuật kèm lý do.

### 3.3 Frontend Implementer

Nhiệm vụ:
- Xây UI đúng thiết kế từ folder `UI/`.
- Tuân thủ mobile-first, pastel, glassmorphism, rounded cards, soft motion.
- Tách reusable components, design tokens, empty/loading/error states.

Output mong đợi:
- Component tree.
- Pages/routes.
- Responsive behavior.
- Motion and interaction polish.

### 3.4 Backend Implementer

Nhiệm vụ:
- Thiết kế schema, auth, CRUD, validation, upload, permission, API contracts.
- Giữ data model rõ ràng cho couple context, timeline, mood, capsule, mission, blog, stats.

Output mong đợi:
- Schema/migrations.
- API endpoints.
- Service layer.
- Security and RLS logic.

### 3.5 Realtime Engineer

Nhiệm vụ:
- Xử lý sync partner state, typing/reaction updates, presence, realtime events, mini game sync.
- Chỉ dùng realtime khi feature thật sự cần.

Output mong đợi:
- Event map.
- Channel/subscription rules.
- Conflict handling.

### 3.6 AI Feature Engineer

Nhiệm vụ:
- Xây AI insight, recap, emotional recommendation, monthly summary, support coach.
- AI phải calm, warm, emotionally safe, non-toxic, contextual.

Output mong đợi:
- Prompt/spec.
- Input/output contract.
- Safety constraints.
- Fallback behavior.

### 3.7 QA / Validator

Nhiệm vụ:
- Kiểm tra build, lint, runtime errors, UI regressions, empty states, responsive breakpoints.
- Xác nhận feature match spec, không chỉ “chạy được”.

Output mong đợi:
- Checklist validation.
- Bugs discovered.
- Risk list.

### 3.8 Documentation Steward

Nhiệm vụ:
- Cập nhật file plan này sau mỗi phase hoặc mỗi thay đổi kiến trúc lớn.
- Ghi rõ trạng thái hiện tại, quyết định đã chốt, và việc còn dang dở.

### 3.9 Sprint Tracker

Nhiá»‡m vá»¥:
- TrÆ°á»›c khi lÃ m sprint nÃ o, pháº£i viáº¿t Ä‘áº§y Ä‘á»§ task board cá»§a sprint Ä‘Ã³ trong file handoff cá»§a sprint.
- Má»—i task pháº£i cÃ³ mÃ£ theo thá»© tá»±, vÃ­ dá»¥: `S1.1`, `S1.2`, `P2.1`, `P2.2`, `S5.1`, `S5.2`.
- Má»—i task pháº£i cÃ³ tráº¡ng thÃ¡i rÃµ: `DONE`, `IN PROGRESS`, `PENDING`, hoáº·c `BLOCKED`.
- `Next Exact Task` pháº£i luÃ´n trÃ¹ng vá»›i task Ä‘áº§u tiÃªn theo thá»© tá»± Ä‘ang `IN PROGRESS` hoáº·c `PENDING`.
- Sau khi xong má»™t task, pháº£i cáº­p nháº­t handoff ngay trÆ°á»›c khi chuyá»ƒn sang task tiáº¿p theo.

Output mong Ä‘á»£i:
- Sprint task board Ä‘áº§y Ä‘á»§.
- Tráº¡ng thÃ¡i tá»«ng task luÃ´n Ä‘Æ°á»£c cáº­p nháº­t.
- `Next Exact Task` luÃ´n rÃµ vÃ  cÃ³ thá»ƒ lÃ m ngay.

---

## 4) Nguyên tắc triển khai chung

1. Bắt đầu từ MVP thật, không xây hết feature cùng lúc.
2. UI phải đúng emotional tone trước khi tối ưu logic phức tạp.
3. Mỗi feature phải có loading, empty, error, success, offline nếu có thể.
4. Không hardcode luồng cục bộ nếu đã có blueprint dữ liệu và API.
5. Không làm UI generic, không biến sản phẩm thành dashboard khô cứng.
6. Không thêm công nghệ ngoài stack đã được chốt trừ khi có lý do rõ ràng.
7. Ưu tiên accessibility, performance, responsive, security, then polish.
8. Mọi thay đổi lớn phải cập nhật lại file này để AI sau đọc được trạng thái.

---

## 5) Stack chuẩn cần bám theo

Frontend:
- Next.js
- TypeScript
- TailwindCSS
- shadcn/ui
- Framer Motion
- Zustand
- React Query

Backend / Platform:
- Supabase Auth
- PostgreSQL
- Supabase Storage
- Supabase Realtime
- Optional Socket.IO cho realtime nâng cao

Deployment / Media:
- Vercel
- Cloudinary nếu cần tối ưu media pipeline hoặc đa nguồn ảnh

---

## 6) Target product scope theo phase

### Phase 1 — MVP Core

Mục tiêu:
- Dùng được thật trên điện thoại.
- Có đăng nhập, pair account, dashboard, timeline, mood, stats.

Deliverables:
- Auth.
- Pair account.
- Couple space / shared context.
- Home dashboard.
- Timeline memories.
- Relationship stats.
- Mood tracking.
- Notifications nền tảng.
- Upload ảnh cơ bản nếu timeline hỗ trợ media.

Acceptance:
- Hai người có thể đăng nhập và vào cùng couple space.
- Dữ liệu lưu thật vào database.
- UI mobile-first và đúng aesthetic.

---

## Sprint 0 & Sprint 1 — Kế hoạch triển khai chi tiết

Sprint 0 (setup & prep) — mục tiêu: chuẩn bị mọi thứ để bắt đầu một vertical-slice ổn định.
- Duration: 3 working days (hoặc 1 tuần nhẹ với review).
- Deliverables: repo scaffold, dev env, design tokens, gap list từ `UI/`, minimal infra config.

Sprint 0 checklist:
- `S0.1` Repo scaffold: tạo monorepo/next app skeleton, `README.md`, `package.json` — Acceptance: `npm run dev` khởi động app shell.
- `S0.2` Dev environment: configure `.env.example`, local env vars, và `docker-compose` (nếu cần). — Acceptance: docs có hướng dẫn chạy dev.
- `S0.3` CI & linting: setup GitHub Actions (lint, typecheck, tests) basic workflow. — Acceptance: pipeline chạy trên PR mẫu.
- `S0.4` Design tokens: extract color/typography/spacing from `UI/` và tạo `tokens` (Tailwind config). — Acceptance: global styles áp dụng trên một storybook mẫu hoặc page demo.
- `S0.5` Identify UI gaps: audit `UI/1.html`..`UI/12.html`, tạo danh sách interactions missing và component map. — Acceptance: `UI_GAPS.md` có checklist.
- `S0.6` Frontend scaffold: folder structure `app/`, `components/`, `lib/`, tailwind + shadcn setup. — Acceptance: example component `Card` và global layout.
- `S0.7` Backend scaffold: initialize Supabase project config, DB schema draft, migrations, and minimal auth setup docs. — Acceptance: schema draft in `db/` and migration file.

Notes: một số Sprint 0 items đã hoàn thành hoặc một phần (ví dụ: environment Python để xử lý PDF, và file `WEB LOVE — AI FULLSTACK IMPLEMENTATION PLAN.md` đã được lưu). Cập nhật trạng thái chi tiết trong todo list.

Sprint 1 (vertical slice core) — mục tiêu: hoàn thành một vertical-slice end-to-end gồm auth → pair → dashboard → timeline.
- Duration: 2 weeks (10 working days) — break down thành ngày nếu cần.
- Deliverables: auth (email magic link hoặc OAuth), pair account creation/accept flow, couple dashboard with timeline, upload media to Supabase Storage, basic design system components.

Sprint 1 checklist (priority order):
- `S1.1` Auth: implement Supabase Auth integration (sign up/in, magic link), session handling, protected routes. — Acceptance: user can login and see protected dashboard.
- `S1.2` Pair account flow: create/join couple space, invitation via code/link, acceptance flow. — Acceptance: two accounts linked to same `couple_id` and can access shared data.
- `S1.3` Design system components: implement `Button`, `Input`, `Card`, `Toast`, `Modal`, tokens usage. — Acceptance: components documented in simple Storybook or pages.
- `S1.4` Dashboard: minimal dashboard showing recent memories and mood summary. — Acceptance: logged-in user sees dashboard populated with seeded data.
- `S1.5` Timeline: CRUD memories, basic media upload to Supabase Storage, display timeline list. — Acceptance: create memory with image and it appears in timeline for both partners.
- `S1.6` State handling & UX: loading, empty, error states across pages; optimistic updates for timeline. — Acceptance: test scenarios covered in QA checklist.
- `S1.7` Tests & QA: add basic integration tests (auth flow, create memory), lint & typecheck. — Acceptance: tests pass locally/CI.
- `S1.8` Documentation & handoff: update `README.md`, architecture notes, and `WEB LOVE — AI FULLSTACK IMPLEMENTATION PLAN.md` with Sprint1 status. — Acceptance: handoff doc updated and reviewed.

Sprint sequencing recommendation:
- Day 1–2: `S1.1` Auth + session; `S1.3` design tokens & core components.
- Day 3–5: `S1.2` Pair account flow + DB adjustments.
- Day 6–8: `S1.4` Dashboard + `S1.5` Timeline CRUD and upload.
- Day 9–10: polishing `S1.6` states, `S1.7` tests, and `S1.8` docs/handoff.

Acceptance criteria for Sprint 1 (summary):
- End-to-end vertical slice working on local/dev environment.
- Two users can sign in, form a pair, and exchange a memory with media that persists and is visible to both.
- Basic design system components in place and used across pages.


### Phase 2 — Retention Features

Mục tiêu:
- Tăng thói quen quay lại app.

Deliverables:
- Memory capsule.
- Missions.
- Blog/journal.
- Wishlist / gifts.
- Reminder notifications.

Acceptance:
- Có loop sử dụng hằng ngày/tuần.
- Có reward mechanic nhẹ nhàng.

### Phase 3 — Realtime + AI

Mục tiêu:
- Làm sản phẩm sống hơn, có cảm giác đồng bộ và có trí tuệ cảm xúc.

Deliverables:
- Realtime presence / sync.
- Reactions / typing / partner online state.
- AI insights.
- Monthly recap.
- Emotional recommendations.
- Realtime mini game nếu còn scope.

Acceptance:
- Realtime không gây lỗi và có fallback.
- AI không lạnh, không robotic, không toxic.

### Phase 4 — Premium Polish / Expansion

Mục tiêu:
- Nâng trải nghiệm và mở đường cho monetization.

Deliverables:
- Premium themes.
- Advanced analytics.
- AI recap video nếu cần.
- Couple pet / Spotify / date ideas / auto video only khi core đã vững.

---

## 7) Lộ trình triển khai từ đầu đến cuối

### Bước 0 — Khởi tạo workspace và quyết định kiến trúc

Việc cần làm:
- Xác định app hiện tại đang là HTML mockup hay đã là app framework.
- Chọn cấu trúc source chuẩn: `src/app`, `src/components`, `src/features`, `src/lib`, `src/hooks`, `src/services`, `src/store`, `src/types`.
- Chuẩn hóa naming, route map, and data ownership.

Output:
- Architecture notes.
- Route map.
- File/folder convention.

### Bước 1 — Trích design system từ folder UI

Việc cần làm:
- Đọc toàn bộ HTML screens trong `UI/`.
- Trích ra palette, typography, radius, spacing, shadow, card style, nav style, and motion cues.
- So sánh các screen để hiểu component patterns lặp lại.

Output:
- Design token draft.
- Shared components list.
- Screen inventory.

### Bước 2 — Setup app shell

Việc cần làm:
- Tạo app shell mobile-first.
- Theme provider / global styles.
- Layout khung cho dashboard, auth, timeline, stats, mood, profile.
- Bottom navigation nếu product route dùng kiểu app mobile.

Output:
- Basic route scaffolding.
- Shared layout.
- Navigation baseline.

### Bước 3 — Implement auth and pair flow

Việc cần làm:
- Signup/login/logout.
- Couple pairing / invite flow.
- User profile and couple context.
- Protected routes.

Output:
- Auth working end-to-end.
- Couple space accessible only by paired users.

### Bước 4 — Build dashboard first

Việc cần làm:
- Hero / greeting / couple status.
- Relationship stats card.
- Mood summary.
- Recent memories preview.
- CTA to add memory / mood / mission.

Output:
- Home screen usable on mobile.
- Emotional tone đúng với UI concept.

### Bước 5 — Build timeline memories

Việc cần làm:
- Create memory event.
- List memories.
- View detail.
- Add media.
- Add comment/reaction.

Output:
- Timeline thật, CRUD thật.
- Empty state / loading / error / success.

### Bước 6 — Build mood tracking and relationship health

Việc cần làm:
- Submit mood.
- View mood history.
- Aggregate health state.
- Mini cards, trend, daily check-in.

Output:
- Daily habit loop.
- Stats synced from mood data.

### Bước 7 — Build stats and recap layer

Việc cần làm:
- Relationship stats page.
- Weekly/monthly summaries.
- Streaks, counts, milestones.

Output:
- Visual metrics có cảm xúc, không khô.

### Bước 8 — Add notifications foundation

Việc cần làm:
- Anniversary reminders.
- Unread activity reminders.
- Re-engagement prompts.

Output:
- Notification table/service behavior.

### Bước 9 — Add media upload pipeline

Việc cần làm:
- Upload image/video constraints.
- Optimize images.
- Store metadata and secure access.

Output:
- Media attached to memories/capsules.

### Bước 10 — Add capsule, missions, blog

Việc cần làm:
- Memory capsule flow.
- Mission system with XP/badges.
- Couple blog/journal.

Output:
- Retention layer đủ mạnh để giữ user quay lại.

### Bước 11 — Add realtime behaviors

Việc cần làm:
- Presence.
- Reaction sync.
- Typing sync.
- Live updates where needed.

Output:
- Feel of shared space.

### Bước 12 — Add AI insight and recap

Việc cần làm:
- Collect signals from mood, memories, reactions, missions.
- Generate emotional insights.
- Monthly recap.
- Supportive recommendations.

Output:
- AI layer useful và an toàn.

### Bước 13 — Polish UX and motion

Việc cần làm:
- Animation, transition, microinteraction.
- Empty state storytelling.
- Reduced motion support.
- Mobile touch optimization.

Output:
- Product có cảm giác sống, mềm, ấm.

### Bước 14 — PWA / installable app behavior

Việc cần làm:
- Manifest.
- icons.
- splash.
- fullscreen install flow.

Output:
- Cài như app mobile.

### Bước 15 — Security, performance, QA, release prep

Việc cần làm:
- JWT / route protection / RLS.
- Performance budget.
- Accessibility.
- SEO and metadata.
- Final smoke test.

Output:
- Release-ready build.

---

## 8) Sprint checklist (2-week sprints)

Ghi chú: mỗi sprint là 2 tuần; team nhỏ (AI agents) có thể hoàn thành các mục nhỏ hơn trong sprint.

Sprint 0 — Project setup & Design tokens
- Tasks:
   - Initialize Next.js + TypeScript repo, Tailwind, shadcn/ui.
   - Extract palette/typography/spacing from `UI/` and create `design-tokens.ts`.
   - Create `src/` structure and base layout.
- Acceptance:
   - `npm run dev` khởi động, layout shell hiển thị, tokens importable.

Sprint 1 — Auth + Pairing (Vertical slice)
- Tasks:
   - Implement Supabase auth signup/login (email magic link or email+password).
   - Implement `POST /auth/pair` flow and couple creation.
   - Persist user and couple in DB; protect routes.
   - Build basic onboarding screens (theme choose, anniversary input).
- Acceptance:
   - Two users can sign up and form a couple space; dashboard loads couple context.

Sprint 2 — Dashboard shell + Recent timeline preview
- Tasks:
   - Build Home dashboard UI (greeting, days counter, top stats).
   - Add recent memories preview with placeholder data.
   - Implement bottom navigation.
- Acceptance:
   - Dashboard visually matches UI tokens; responsive at 430px.

Sprint 3 — Timeline CRUD + Media upload
- Tasks:
   - Timeline list, create event, view detail.
   - Media upload to Supabase Storage (or Cloudinary fallback).
   - Comments and reactions basic.
- Acceptance:
   - Create and view timeline events with image attachments.

Sprint 4 — Mood tracking + Relationship stats
- Tasks:
   - Submit mood, view mood history, aggregate relationship health.
   - Add weekly trend chart (simple SVG/mini-chart).
- Acceptance:
   - Daily mood submissions recorded and reflected in stats.

Sprint 5 — Notifications + Media polish
- Tasks:
   - Implement notification scheduling and basic push (local/dev).
   - Image optimization pipeline; thumbnails.
   - Add empty/loading/error states across screens.
- Acceptance:
   - Reminders firing in dev and UI shows notification list.

Sprint 6 — Capsule + Missions + Blog MVP
- Tasks:
   - Memory capsule create/list/open flow.
   - Missions system with XP/badges and progress.
   - Simple blog/journal CRUD.
- Acceptance:
   - Users can create capsule and mission progress tracked.

Sprint 7 — Realtime basics
- Tasks:
   - Presence, typing, reaction sync via Supabase Realtime or Socket.IO.
   - Fallback to polling when realtime unavailable.
- Acceptance:
   - Partner presence displays and reaction sync occurs within ~1s locally.

Sprint 8 — AI insights (safe rollout)
- Tasks:
   - Build backend job to collect signals and call OpenAI for insights.
   - Create `GET /ai/insights` and monthly recap generation (async job + storage).
   - Add safety prompts and non-toxic filters.
- Acceptance:
   - Insights generated in readable tone and have opt-out setting.

Sprint 9 — Polish, PWA, accessibility, release
- Tasks:
   - Add manifest, icons, splash, service worker caching.
   - Accessibility audit and performance tuning.
   - Final QA and release checklist.
- Acceptance:
   - Installable PWA; performance budgets met; known bugs triaged.

---

## 9) Quick Sprint role assignment template

-- Product Planner: define sprint goals and DoD.
- System Architect: lock infra and API contract for sprint.
- Frontend Implementer: implement UI and interactions.
- Backend Implementer: implement APIs and DB migrations.
- Realtime Engineer: add realtime where required.
- AI Feature Engineer: prepare prompts/data and run safe tests (only from Sprint 8).
- QA: validate DoD.
- Sprint Tracker: create the full sprint task board in handoff first, then keep task statuses + `Next Exact Task` in sync.

---

## 10) Handoff note (tóm tắt ngắn để AI tiếp theo tiếp tục)

Khi kết thúc một sprint, cập nhật ngay vào phần **Handoff protocol** trong file gốc: ghi trạng thái, file đã edit, môi trường dev/supabase keys (nếu an toàn), và task tiếp theo rõ ràng.


## 8) UI implementation rules

AI code UI phải bám theo các quy tắc sau:

- Mobile-first.
- Max width khoảng 430px cho core screens nếu layout là app-style.
- Màu pastel pink / lavender / cream, không chuyển sang UI generic.
- Card bo tròn, glassmorphism, shadow nhẹ.
- Typography mềm, ấm, dễ đọc.
- Motion dùng để tăng cảm xúc, không dùng quá đà.
- Mỗi màn hình phải có loading/empty/error state.
- Các phần quan trọng phải thân thiện với ngón tay cái và có bottom navigation nếu phù hợp.

---

## 9) Backend and data rules

Nguyên tắc dữ liệu:
- Couple là context trung tâm.
- User chỉ là participant trong couple space.
- Mọi entity phải biết nó thuộc user nào và couple nào khi cần.
- Privacy level phải rõ: public, couple-only, private.

Nhóm dữ liệu cốt lõi:
- users
- couples
- couple_members
- timeline_events
- timeline_media
- comments
- reactions
- moods
- memory_capsules
- missions
- mission_progress
- badges
- blogs
- wishlist_items
- game_sessions

API tối thiểu cần có:
- auth signup/login/pair
- timeline CRUD
- mood CRUD/history
- capsule create/list/open
- mission daily/complete
- AI insights/recap

---

## 10) AI behavior rules

AI phải:
- hỗ trợ, chữa lành, và đồng hành.
- tránh giọng robotic, phán xét, toxic positivity.
- phản hồi theo ngữ cảnh lịch sử quan hệ.
- ưu tiên emotionally safe suggestions.
- có fallback nếu thiếu dữ liệu.

AI không được:
- làm người dùng thấy bị dạy đời.
- tạo nội dung lạnh, vô cảm.
- bịa tính năng không có dữ liệu hỗ trợ.

---

## 11) Validation checklist cho từng feature

Trước khi đánh dấu xong một feature, phải có:
- Code chạy được.
- UI mobile đúng.
- Loading state.
- Empty state.
- Error state.
- Dữ liệu thật hoặc mock đúng contract.
- Không phá layout hiện tại.
- Không lệch tone sản phẩm.
- Nếu có realtime, phải có fallback.
- Nếu có AI, phải có safety and graceful fallback.

---

## 12) Handoff protocol khi đổi AI hoặc hết token

Khi dừng giữa chừng, AI hiện tại phải cập nhật file này với các mục sau:

- Current phase.
- What is already done.
- What is in progress.
- Next exact task.
- Files touched.
- Decisions locked.
- Open questions.
- Risks.

Format gợi ý:
- Status: done / in progress / blocked.
- Next action: một việc nhỏ, rõ ràng, có thể làm ngay.

Mục tiêu là AI kế tiếp chỉ cần đọc file này là tiếp tục được ngay, không phải đoán lại context.

---

### 12.1 Quy tắc mới cho sprint handoff (Bắt buộc)

Từ nay, mọi file handoff theo sprint phải tuân theo format này:

- Phải có mục `Sprint Task Board`.
- Phải liệt kê đầy đủ tất cả task cần làm của cả sprint trước khi làm tiếp.
- Mỗi task phải có mã theo thứ tự rõ ràng, ví dụ: `S1.1`..`S1.7`, `P2.1`..`P2.5`, `S5.1`..`S5.7`.
- Mỗi task phải có trạng thái rõ ràng: `DONE`, `IN PROGRESS`, `PENDING`, `BLOCKED`, `DEFERRED`, hoặc `REMOVED FROM SCOPE`.
- `Next Exact Task` không được ghi chung chung. Nó phải chỉ đúng task đầu tiên theo thứ tự đang ở trạng thái `IN PROGRESS` hoặc `PENDING`.
- AI phải thực hiện task theo đúng thứ tự trong `Sprint Task Board`, không được tự ý nhảy sang task sau nếu task trước chưa xong, trừ khi task trước bị `BLOCKED`, `DEFERRED`, hoặc `REMOVED FROM SCOPE`.
- Sau khi hoàn thành một task, phải cập nhật ngay trạng thái của task đó trong handoff trước khi chuyển sang task tiếp theo.
- Nếu một task không làm tiếp, phải đổi trạng thái của task đó thành `BLOCKED`, `DEFERRED`, hoặc `REMOVED FROM SCOPE` và ghi rõ lý do.
- Khi bắt đầu session mới, AI phải đọc `Sprint Task Board` trước, xác định task đang làm dở hoặc task kế tiếp, rồi mới tiếp tục code.

Mục tiêu là để bất kỳ AI nào đọc file handoff cũng biết:
- toàn bộ sprint còn những task nào,
- task nào đã xong,
- task nào đang làm,
- và chính xác việc nhỏ nhất phải làm tiếp theo là gì.


## 13) Current intended build order

Nếu bắt đầu code ngay từ đầu, thứ tự nên là:

1. Read docs + inspect `UI/`.
2. Extract design system.
3. Setup app shell.
4. Auth and pair flow.
5. Dashboard.
6. Timeline.
7. Mood tracking.
8. Relationship stats.
9. Media upload.
10. Notifications.
11. Capsule.
12. Missions.
13. Blog.
14. Realtime.
15. AI insights and monthly recap.
16. Polish, PWA, performance, accessibility.
17. QA and release.

---

## 15) Current implementation status - 2026-05-14

Status: Sprint 8 complete, Emotional AI Upgrade complete, Sprint 9 complete in code.

Completed:
- AI insights and monthly recap are privacy-gated, validated, safety-filtered, and have deterministic fallback when OpenAI is unavailable or unsafe.
- Emotional AI bonding layer is implemented:
  - Daily Love Prompt at `/ai/daily`, auto-created from dashboard when AI privacy is enabled.
  - AI Message Helper at `/ai/message-helper`.
  - Couple Ritual Generator at `/ai/rituals`.
  - Memory Storyteller at `/ai/memory-story`.
- Dashboard now includes latest AI insight and daily prompt without crowding core couple actions.
- Blog, timeline, and capsule create pages accept local prefill from AI helper/story flows.
- Database latest migration is `0026_ai_bonding_features.sql`.
- RLS audit includes all AI bonding tables.
- Sprint 9 production polish is implemented:
  - PWA manifest.
  - App icon.
  - Conservative production service worker.
  - metadata/OpenGraph cleanup.
  - homepage cleanup.
  - README and release checklist updates.

Latest QA:
- `npm.cmd run qa` passed.
- `npm.cmd run e2e:missed` passed.
- Production smoke test passed for `/`, `/dashboard`, `/ai/daily`, `/ai/message-helper`, `/ai/rituals`, `/ai/memory-story`, `/manifest.webmanifest`, and `/sw.js`.

Next exact task:
- Apply migrations through `0026_ai_bonding_features.sql` in the target Supabase project, then run manual couple QA with two real users:
  1. Enable AI privacy.
  2. Open dashboard and confirm today's Daily Love Prompt appears.
  3. Complete/respond to the prompt.
  4. Generate AI insight and monthly recap.
  5. Use message helper and save a draft to blog or memory.
  6. Generate a ritual and create a mission from it.
  7. Generate a memory story and save it to blog or capsule.
  8. Disable AI privacy and confirm every AI route blocks correctly.
  9. Log in again and confirm missed edit/delete bell notifications still work.

Risks:
- Real Supabase must have migrations `0024`, `0025`, and `0026` applied before AI privacy, monthly recap, and bonding tables work end to end.
- `OPENAI_API_KEY` is optional; without it the app intentionally uses fallback output.

---

## 14) Final reminder for every AI

Web Love không phải app để “làm cho xong”.

Nó phải cho cảm giác:
- ấm.
- riêng tư.
- có ký ức.
- có nhịp sống chung.
- có cảm xúc thật.

Nếu có lựa chọn giữa nhanh hơn và đúng hơn, ưu tiên đúng hơn, nhưng vẫn giữ MVP gọn.
