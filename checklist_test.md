# Checklist Test WebLove

Ngày bắt đầu: 2026-05-15

Phạm vi:
- Test sâu toàn bộ hệ thống `/missions`.
- Test smoke toàn bộ website sau khi mission ổn.
- Ghi lại lỗi hệ thống, lỗi người dùng, lỗi logic.
- Sửa lỗi phát hiện được và test lại phần liên quan.

Quy ước status:
- `[Pending]` chưa làm.
- `[In Progress]` đang làm.
- `[Passed]` đã test và đạt.
- `[Fixed]` có lỗi, đã sửa và test lại đạt.
- `[Blocked]` bị chặn bởi thiếu dữ liệu/tool/credential.
- `[Improve]` không hẳn lỗi nhưng cần cải tiến logic/UX.

## 1. Mission System: Checklist Chi Tiết

### 1.1 Load, Auth, Data Context

- [In Progress] `/missions` load được khi có Supabase config thật.
- [Pending] AuthGuard chặn user chưa đăng nhập.
- [Pending] API `/api/daily-missions` reject request thiếu bearer token.
- [Pending] API `/api/daily-missions` reject token sai.
- [Pending] User không thuộc couple không đọc được mission.
- [Pending] Bundle trả đủ `currentUserId`, `members`, `myMissions`, `partnerMissions`.
- [Pending] Bundle trả đủ `rewardBank`, `punishmentBank`, `rewardInventory`, `partnerRewardInventory`.
- [Pending] Bundle trả đủ active punishment từ mission cũ.
- [Pending] Loading state hiển thị đúng.
- [Pending] Error state có nút `Thử lại`.
- [Pending] Polling 8 giây không mở popup reward sai.

### 1.2 Today Tab

- [Pending] Tab `Hôm nay` chuyển tab đúng.
- [Pending] Hiển thị đúng 3 mission của current user.
- [Pending] Hiển thị đúng mission partner chờ xét duyệt.
- [Pending] Không lộ reward text trước khi claim.
- [Pending] Không lộ punishment text trước khi mission fail/reset.
- [Pending] Status `Đang làm` hiển thị đúng.
- [Pending] Status `Chờ xác nhận` hiển thị đúng.
- [Pending] Status `Đã hoàn thành` hiển thị đúng.
- [Pending] Status `Thất bại` hiển thị đúng.
- [Pending] Card action mission có nút `Hôm nay không gặp, đổi sang mess`.
- [Pending] Card mess mission không có nút đổi sang mess.
- [Pending] Nút `Hoàn thành` gửi mission sang `waiting_partner_approval`.
- [Pending] Nút `Hoàn thành` disabled khi đang busy.
- [Pending] Nút `Hoàn thành` disabled khi mission completed.
- [Pending] Partner bấm `Xác nhận` approve mission.
- [Pending] Partner bấm `Từ chối` trả mission về pending.
- [Pending] Approve cộng XP đúng một lần.
- [Pending] Approve không tự tạo normal reward inventory.
- [Pending] Owner thấy `Claim reward` sau khi partner approve.
- [Pending] Partner không thấy nút claim reward của owner.
- [Pending] Claim reward tạo inventory `unused`.
- [Pending] Claim reward set `reward_claimed_at`.
- [Pending] Claim reward idempotent, không tạo trùng inventory.
- [Pending] Claim reward mở popup reveal.
- [Pending] Popup reveal tự đóng sau 5 giây.
- [Pending] Popup reveal đóng được khi bấm nền ngoài.
- [Pending] Popup reveal không mở lại khi reward đổi `unused -> used`.
- [Pending] Perfect day summary đúng khi đủ 6/6.
- [Pending] Summary thiếu 1 mission đúng.
- [Pending] Summary default đúng.

### 1.3 Mission Generation / Daily Reset

- [Pending] Mỗi user mỗi ngày có 3 mission.
- [Pending] Mỗi user có 1 mess, 1 action, 1 random.
- [Pending] Không dùng trùng mission bank item trong ngày nếu còn item khác.
- [Pending] Không bị lặp reward/punishment quá sớm khi bank đủ lớn.
- [Pending] Bank nhỏ hiển thị cảnh báo.
- [Pending] Qua ngày mới mission hôm nay không còn ở Today.
- [Pending] Mission completed nhưng chưa claim được auto claim reward.
- [Pending] Mission pending qua reset thành failed.
- [Pending] Failed mission set `applied_punishment_at`.
- [Pending] Failed mission set `punishment_status = pending`.
- [Pending] Waiting approval qua ngày mới được auto approve.
- [Pending] Streak tăng khi 6/6 completed.
- [Pending] Streak reset khi miss và không có protection.
- [Pending] Streak protection charge được dùng khi miss.
- [Pending] Daily bonus +30 XP chỉ cộng một lần.
- [Pending] History chỉ hiển thị ngày trước hôm nay.
- [Pending] History không hiển thị mission hôm nay.

### 1.4 Mission Bank Tab

- [Pending] Chuyển tab `Mission bank`.
- [Pending] Segment `Mission` hoạt động.
- [Pending] Segment `Reward` hoạt động.
- [Pending] Segment `Punishment` hoạt động.
- [Pending] Segment `Mess` hoạt động.
- [Pending] Segment `Action` hoạt động.
- [Pending] Thêm nhiều dòng mission bank.
- [Pending] Thêm nhiều dòng reward bank daily mission.
- [Pending] Thêm nhiều dòng punishment bank daily mission.
- [Pending] Empty input báo lỗi hợp lý.
- [Pending] Unsafe content bị chặn.
- [Pending] Edit item lưu đúng text mới.
- [Pending] Edit item không bị mất text khi chưa nhập.
- [Pending] Delete item xóa đúng.
- [Pending] Không xóa nhầm item khác.

### 1.5 Economy Inventory

- [Pending] Chuyển tab `Economy`.
- [Pending] Segment `Normal Rewards` hiển thị normal unused inventory.
- [Pending] Segment `Special Rewards` hiển thị special/power unused inventory.
- [Pending] Used reward biến mất khỏi inventory.
- [Pending] Reward card không hiển thị expire.
- [Pending] Normal reward nút `Claim` mở popup xác nhận đơn giản.
- [Pending] Normal reward claim set status `used`.
- [Pending] Normal reward claim gửi notification partner.
- [Pending] Claim normal reward không mở popup reveal thứ 2.
- [Pending] Special reward nút `Use` mở modal đúng target cần chọn.
- [Fixed] Tất cả special rewards server-side hoạt động trên Supabase thật.
- [Fixed] `block_troll` không còn bắt chọn mission trong UI.
- [Fixed] Unsupported effect không âm thầm mark reward used.

### 1.6 Special Rewards

- [Fixed] `skip_one_punishment` skip 1 punishment của chính user.
- [Fixed] `change_one_mission` đổi 1 mission pending và không vi phạm unique constraint.
- [Fixed] `double_xp_one_mission` set multiplier 2 đúng.
- [Fixed] `instant_20_xp` cộng 20 XP.
- [Fixed] `create_partner_commission_tomorrow` tạo 1 commission ngày mai cho partner.
- [Fixed] `copy_partner_reward` copy reward unused của partner.
- [Fixed] `swap_reward` đổi reward giữa 2 user.
- [Fixed] `protect_streak_once` tăng streak protection charge.
- [Fixed] `force_partner_redo_mission` reset mission partner và clear `reward_claimed_at`.
- [Fixed] `skip_all_punishments_today` skip punishment hôm nay.
- [Fixed] `instant_100_xp` cộng 100 XP.
- [Fixed] `choose_all_partner_missions_tomorrow` tạo 3 commission ngày mai.
- [Fixed] `double_xp_today` double XP các pending mission hôm nay của user.
- [Fixed] `mission_day_off` complete mission với 0 XP và không hiện claim reward.
- [Fixed] Legacy `skip_punishment` hoạt động.
- [Fixed] Legacy `change_mission` hoạt động.
- [Fixed] Legacy `double_mission_xp` hoạt động.
- [Fixed] Legacy `instant_xp` hoạt động.
- [Fixed] Legacy `block_troll` hoạt động.
- [Fixed] Legacy `choose_partner_mission` hiện đang đổi mission của chính user.
- [Fixed] Legacy `swap_rewards` hoạt động.
- [Fixed] Legacy `protect_streak` hoạt động.

### 1.7 Economy Reward/Punishment Banks

- [Pending] Hidden Banks mode có thể quản trị reward bank nếu bật.
- [Pending] Add reward bank normal.
- [Pending] Add reward bank special.
- [Pending] Add reward bank power với effect.
- [Pending] Edit reward bank.
- [Pending] Delete reward bank.
- [Pending] Add punishment bank.
- [Pending] Edit punishment bank.
- [Pending] Delete punishment bank.
- [Pending] Safe flag lưu đúng.
- [Pending] Intensity bounds 1..5.
- [Pending] Weight bounds hợp lý.

### 1.8 Punishment Review

- [Pending] Economy hiển thị punishment nợ từ ngày cũ.
- [Pending] Owner thấy nút `Đã làm hình phạt` khi punishment pending.
- [Pending] Owner submit punishment chuyển sang `waiting_partner_approval`.
- [Pending] Partner approve chuyển sang `completed`.
- [Pending] Partner reject chuyển về `pending`.
- [Pending] Reject giữ punishment trong Economy.
- [Pending] Completed/skipped punishment biến mất khỏi active list.
- [Pending] User không submit punishment của partner.
- [Pending] User không review punishment của chính mình.

### 1.9 Change Request Flow

- [Pending] Mở modal đổi reward cho cả 3 mission.
- [Pending] Mở modal đổi punishment cho cả 3 mission.
- [Pending] Submit change request.
- [Pending] Partner thấy card yêu cầu đổi.
- [Pending] Partner approve reward changes.
- [Pending] Partner approve punishment changes.
- [Pending] Partner reject changes.
- [Pending] Change request không áp dụng khi reject.
- [Pending] Không cho requester tự review request của mình.

### 1.10 Streak Popup / Streak Rewards

- [Pending] Bấm card streak mở popup.
- [Pending] Nút đóng popup streak hoạt động.
- [Pending] Milestone locked disabled.
- [Pending] Milestone unlocked claim được.
- [Pending] Claim streak reward cộng XP đúng.
- [Pending] Claim streak reward không claim trùng.
- [Pending] Claimed milestone hiển thị đúng.

### 1.11 History

- [Pending] Tab `Lịch sử` chuyển đúng.
- [Pending] History group theo ngày.
- [Pending] History hiển thị progress từng user.
- [Pending] History hiển thị status mission.
- [Pending] History hiển thị punishment của ngày cũ.
- [Pending] History không hiển thị hôm nay.

### 1.12 Notifications

- [Pending] Normal reward claim gửi notification partner.
- [Pending] Create commission reward gửi notification partner.
- [Pending] Choose all partner missions reward gửi notification partner.
- [Pending] Force redo mission reward gửi notification partner.
- [Improve] Các special reward khác hiện chưa gửi notification; cân nhắc thêm notification nhất quán.

### 1.13 UI/Text/Encoding/Mobile

- [Fixed] Sửa mojibake tiếng Việt trong `/missions`.
- [Pending] Không còn chuỗi mojibake trong mission UI.
- [Pending] Text không tràn button mobile.
- [Pending] Bottom nav không che action chính.
- [Pending] Reward modal mobile không tràn màn hình.
- [Pending] Mission cards không overlap.
- [Pending] Empty states rõ ràng.
- [Pending] Toast/message ngắn gọn.

## 2. Whole Website Smoke Checklist

### 2.1 Global

- [Pending] `npm run typecheck`.
- [Pending] `npm test`.
- [Pending] `npm run build`.
- [Pending] `npm run check:migrations`.
- [Pending] `npm run check:rls`.
- [Pending] No console/build errors.
- [Pending] Manifest route build được.
- [Pending] Root `/` redirect/render đúng.
- [Pending] Authenticated layout không crash.
- [Pending] Bottom navigation link đúng.

### 2.2 Auth/Admin

- [Pending] `/login` render.
- [Pending] Login form submit path.
- [Pending] `/signup` render.
- [Pending] Signup request path.
- [Pending] `/pair` render.
- [Pending] `/admin/pending` render.
- [Pending] Admin pending APIs require admin.
- [Pending] Approve/decline signup APIs hoạt động.

### 2.3 Dashboard/Home

- [Pending] `/dashboard` render.
- [Pending] Dashboard data load/fallback không crash.
- [Pending] `/more` render/redirect hợp lý.

### 2.4 Timeline

- [Pending] `/timeline` render.
- [Pending] `/timeline/create` render.
- [Pending] `/timeline/[id]` render với dữ liệu hợp lệ.
- [Pending] Create timeline event.
- [Pending] Upload/media path.
- [Pending] Reaction/comment flows.

### 2.5 Blog

- [Pending] `/blog` render.
- [Pending] `/blog/create` render.
- [Pending] `/blog/[id]` render với dữ liệu hợp lệ.
- [Pending] Create blog.
- [Pending] Blog comment flow.
- [Pending] Blog delete/update flow nếu có.

### 2.6 Us/Profile/Gallery

- [Pending] `/us` render.
- [Pending] `/us/photos` render.
- [Pending] Gallery upload.
- [Pending] Gallery delete/update nếu có.

### 2.7 Games

- [Pending] `/games` render.
- [Pending] `/games/history` render.
- [Pending] Create game session.
- [Pending] Join/resume current session.
- [Pending] Move API.
- [Pending] Restart API.
- [Pending] Couple quiz question generation API.

### 2.8 Gifts/Wishlist/Date Ideas/Settings

- [Pending] `/gifts` render.
- [Pending] `/wishlist` render.
- [Pending] Wishlist add/update/delete/reserve.
- [Pending] `/date-ideas` render.
- [Pending] Distance API.
- [Pending] `/settings` render.
- [Pending] Settings save flows.

## 3. Improvements Backlog

- [Improve] `choose_partner_mission` legacy effect tên không khớp logic hiện tại, đang đổi mission của chính user.
- [Improve] `skip_all_punishments_today` chỉ skip punishment hôm nay, chưa xử lý punishment cũ đang nợ.
- [Improve] Special rewards nên có notification nhất quán hơn.
- [Improve] Thêm Playwright để click thật từng button trên UI thay vì chỉ build/server integration.
- [Improve] Cân nhắc bật UI quản trị Reward/Punishment banks hoặc tách admin-only thay vì `hidden`.

## 4. Test Runs

- [Passed] 2026-05-15: Real Supabase special reward test `RUN_REAL_SPECIAL_REWARD_TESTS=1 npx vitest run src/lib/rewardEconomyServer.real.test.ts --reporter=verbose`.
- [Passed] 2026-05-15: `npm run typecheck`.
- [Passed] 2026-05-15: `npm test`.
- [Passed] 2026-05-15: `npm run build`.
- [Passed] 2026-05-15: `npm run check:migrations`.
- [Passed] 2026-05-15: `npm run check:rls`.
- [Fixed] 2026-05-15: Updated `src/lib/dailyMissionServer.real.test.ts` to match mission privacy hardening: generated partner pending missions are verified in DB but are not exposed in `partnerMissions` until submitted.
- [Passed] 2026-05-15: Real Supabase mission system test `RUN_REAL_MISSION_SYSTEM_TESTS=1 npx vitest run src/lib/dailyMissionServer.real.test.ts --reporter=verbose`.
- [Passed] 2026-05-15: Real Supabase special reward test `RUN_REAL_SPECIAL_REWARD_TESTS=1 npx vitest run src/lib/rewardEconomyServer.real.test.ts --reporter=verbose`.
- [Passed] 2026-05-15: Production HTTP smoke for `/`, `/login`, `/signup`, `/pair`, `/admin/pending`, `/dashboard`, `/more`, `/timeline`, `/timeline/create`, `/blog`, `/blog/create`, `/us`, `/us/photos`, `/games`, `/games/history`, `/gifts`, `/wishlist`, `/date-ideas`, `/settings`, `/missions`, and `/manifest.webmanifest`.
- [Passed] 2026-05-15: `/api/daily-missions` returns 401 for missing bearer token and wrong bearer token.
- [Passed] 2026-05-15: Authenticated `/api/daily-missions` smoke with temporary real Supabase auth users/couple/bank: bundle loads, partner pending missions stay private, submitted mission appears for partner approval, reject flow works, unpaired user receives `missing_couple`, cleanup completed.
- [Blocked] 2026-05-15: Click-level UI automation for `/missions` is still not available because Playwright is not installed/configured in this repo; covered only by production route smoke plus server/API integration tests.
