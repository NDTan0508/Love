# Special Rewards Logic

File này liệt kê toàn bộ `special` / `power` reward hiện backend đang hỗ trợ, cách dùng trong UI, chức năng hiện tại, bảng dữ liệu bị tác động, và các điểm cần chú ý nếu muốn sửa logic.

## Tổng Quan Luồng

1. Reward mẫu nằm trong `reward_bank_items`.
2. Khi reward được phát cho user, app tạo bản ghi trong `reward_inventory_items`.
3. Tab `Economy -> Special Rewards` chỉ hiển thị `reward_inventory_items` có:
   - `status = 'unused'`
   - `reward_type in ('special', 'power')`
4. Khi user bấm `Use`, UI mở `RewardUseModal`.
5. UI gửi `POST /api/reward-economy/inventory/[id]/use` với `target`.
6. Backend xử lý trong `useRewardInventoryItem(...)`.
7. Sau khi xử lý, reward luôn bị set:
   - `status = 'used'`
   - `used_at = now()`
   - `reward_payload.usedTarget = target`

Code chính:
- UI: `src/app/missions/page.tsx`
- Service: `src/lib/missionsService.ts`
- Backend: `src/lib/rewardEconomyServer.ts`
- API route: `src/app/api/reward-economy/inventory/[id]/use/route.ts`

## Target Fields UI Đang Gửi

`target` là object gửi từ modal:

| Field | Dùng Cho |
| --- | --- |
| `missionId` | chọn mission của bản thân hoặc mission partner, tùy effect |
| `punishmentMissionId` | chọn punishment mission để skip |
| `partnerInventoryItemId` | chọn reward unused của partner |
| `selfInventoryItemId` | chọn reward unused của chính mình khi swap |
| `rewardInventoryItemId` | legacy alias, backend vẫn đọc |
| `customMissionText` | nhập 1 commission cho partner ngày mai |
| `customMissionTexts` | nhập nhiều commission cho partner ngày mai |

## Danh Sách Special Rewards Hiện Tại

### `skip_one_punishment`

Tên seed: `[TEST] Skip 1 punishment`

Cách dùng UI:
- User chọn 1 punishment đang `pending`.
- UI gửi `target.punishmentMissionId`.

Backend hiện tại:
- Kiểm tra mission thuộc chính user bằng `assertMissionTargetVisible(..., 'self')`.
- Set `daily_missions_v2.punishment_status = 'skipped'`.
- Set `punishment_resolved_at = now()`.

Bảng bị tác động:
- `daily_missions_v2`
- `reward_inventory_items`

Lỗi có thể gặp:
- `missing_target`
- `mission_not_found`
- `not_mission_owner`

Ghi chú:
- Chỉ skip punishment của chính user.
- Đây là effect mới nên nên dùng thay cho legacy `skip_punishment`.

### `change_one_mission`

Tên seed: `[TEST] Đổi 1 mission`

Cách dùng UI:
- User chọn 1 mission pending của chính mình.
- UI gửi `target.missionId`.

Backend hiện tại:
- Mission phải là `pending`.
- Lấy mission mới ngẫu nhiên từ `daily_mission_bank_items`, có thể đổi qua lại giữa `mess` và `action`.
- Loại các `mission_item_id`, `reward_item_id`, `punishment_item_id` đã dùng trong cùng ngày/couple trước khi chọn replacement.
- Chọn lại reward và punishment cùng loại với mission mới.
- Thay `mission_item_id`, `reward_item_id`, `punishment_item_id`, `mission_kind`, `title`, `reward`, `punishment`.
- Reset `xp_reward = 20`, `xp_multiplier = 1`, `reward_updated = false`, `punishment_updated = false`.

Bảng bị tác động:
- `daily_missions_v2`
- `reward_inventory_items`

Lỗi có thể gặp:
- `missing_target`
- `mission_not_pending`
- `no_mission_available`
- `no_reward_available`
- `no_punishment_available`

Ghi chú:
- Mission sau khi đổi được xem như mission mới, gồm cả reward/punishment và loại `mess`/`action`.
- Nếu không còn bank item phù hợp chưa dùng trong ngày, backend trả lỗi rõ ràng thay vì để Supabase lỗi unique constraint.

### `double_xp_one_mission`

Tên seed: `[TEST] Double XP 1 mission`

Cách dùng UI:
- User chọn 1 mission pending của chính mình.
- UI gửi `target.missionId`.

Backend hiện tại:
- Mission phải là `pending`.
- Nếu `xp_multiplier > 1` thì báo lỗi.
- Set `daily_missions_v2.xp_multiplier = 2`.

Bảng bị tác động:
- `daily_missions_v2`
- `reward_inventory_items`

Lỗi có thể gặp:
- `missing_target`
- `mission_not_pending`
- `mission_already_doubled`

Ghi chú:
- XP thật chỉ tăng khi mission được approve/complete theo flow mission.
- Card mission hiển thị XP theo `xp_reward * xp_multiplier`, ví dụ mission 20 XP sau khi double sẽ hiển thị `+40 XP`.

### `instant_20_xp`

Tên seed: `[TEST] +20 XP ngay lập tức`

Cách dùng UI:
- Không cần chọn target.

Backend hiện tại:
- Cộng ngay `20 XP` vào `daily_mission_couple_stats.xp`.

Bảng bị tác động:
- `daily_mission_couple_stats`
- `reward_inventory_items`

Ghi chú:
- XP là XP chung của couple mascot, không phải riêng từng user.

### `create_partner_commission_tomorrow`

Tên seed: `[TEST] Tạo commission cho người kia ngày mai`

Cách dùng UI:
- User nhập 1 dòng nội dung mission.
- UI gửi `target.customMissionText`.

Backend hiện tại:
- Tìm partner trong `couple_members`.
- Tạo 1 mission ngày mai cho partner:
  - `mission_kind = 'commission'`
  - `xp_reward = 20`
  - `generated_by_special_reward = true`
- Gửi notification cho partner.

Bảng bị tác động:
- `daily_missions_v2`
- `notifications`
- `reward_inventory_items`

Lỗi có thể gặp:
- `partner_not_found`
- `missing_target`
- `commission_already_set`

Ghi chú:
- Nếu ngày mai partner đã có đủ số commission tương ứng thì báo `commission_already_set`.


### `copy_partner_reward`

Tên seed: `[TEST] Copy 1 reward của partner`

Cách dùng UI:
- User chọn 1 reward unused của partner.
- UI gửi `target.partnerInventoryItemId`.

Backend hiện tại:
- Tìm reward partner:
  - cùng couple
  - `user_id != current user`
  - `status = 'unused'`
- Insert 1 bản copy vào `reward_inventory_items` của current user.
- Reward gốc của partner vẫn giữ nguyên.

Bảng bị tác động:
- `reward_inventory_items`

Lỗi có thể gặp:
- `missing_target`
- `reward_not_found`

Ghi chú:
- Copy cả `reward_effect`, `reward_payload`, `source_mission_id`.
- `acquired_from = 'manual'`.

### `swap_reward`

Tên seed: `[TEST] Swap reward với partner`

Cách dùng UI:
- User chọn 1 reward unused của partner.
- User chọn 1 reward unused của chính mình.
- UI gửi:
  - `target.partnerInventoryItemId`
  - `target.selfInventoryItemId`

Backend hiện tại:
- Kiểm tra reward của mình đang `unused`.
- Kiểm tra reward partner đang `unused`.
- Đổi `user_id` của 2 reward cho nhau.

Bảng bị tác động:
- `reward_inventory_items`

Lỗi có thể gặp:
- `missing_target`
- `reward_not_found`

Ghi chú:
- Đây là effect mới nên nên dùng thay cho legacy `swap_rewards`.

### `protect_streak_once`

Tên seed: `[TEST] Khôi phục streak`

Cách dùng UI:
- Không cần chọn target.
- Khi bấm `Use`, UI hiện xác nhận: có muốn khôi phục lại chuỗi X ngày không.
- X được tính từ chuỗi perfect gần nhất trước `daily_mission_couple_stats.last_missed_date`, cộng thêm các ngày perfect sau ngày mất chuỗi nếu có.

Backend hiện tại:
- Tìm `last_missed_date`.
- Tính lại chuỗi gần nhất bị mất từ `daily_missions_v2`.
- Set `daily_mission_couple_stats.streak_count` về số chuỗi khôi phục.
- Set `last_all_completed_date` để streak có thể tiếp tục tăng ở ngày kế tiếp.
- Clear `last_missed_date`.

Bảng bị tác động:
- `daily_mission_couple_stats`
- `reward_inventory_items`
- `daily_missions_v2` chỉ được đọc để tính lịch sử

Ghi chú:
- Effect key vẫn là `protect_streak_once` để inventory cũ tiếp tục dùng được.
- Nếu chưa có chuỗi nào vừa mất, backend trả `no_streak_to_restore` và reward không bị consume.

### `force_partner_redo_mission`

Tên seed: `[TEST] Bắt partner làm lại 1 mission`

Cách dùng UI:
- User chọn 1 mission completed của partner.
- UI gửi `target.missionId`.

Backend hiện tại:
- Mission phải thuộc partner.
- Mission phải `completed`.
- Tìm log XP trong `couple_rewards` theo label:
  - `daily-mission:{mission_date}:{mission.id}`
- Nếu có log XP:
  - trừ lại XP khỏi `daily_mission_couple_stats.xp`
  - xóa log trong `couple_rewards`
- Xóa reward inventory có `source_mission_id = mission.id`.
- Set mission về `pending`.
- Clear:
  - `requested_at`
  - `completed_at`
  - `approved_by`
  - `reward_claimed_at`
- Gửi notification cho partner.

Bảng bị tác động:
- `daily_missions_v2`
- `couple_rewards`
- `daily_mission_couple_stats`
- `reward_inventory_items`
- `notifications`

Lỗi có thể gặp:
- `missing_target`
- `partner_required`
- `mission_not_completed`

Ghi chú:
- Logic đã clear `reward_claimed_at` để mission có thể claim lại sau khi partner làm lại và được approve lại.

### `skip_all_punishments_today`

Tên seed: `[TEST] Skip tất cả punishment hôm nay`

Cách dùng UI:
- Không cần chọn target.

Backend hiện tại:
- Lấy ngày hiện tại theo timezone `Asia/Bangkok`.
- Với mission của chính user trong hôm nay:
  - `punishment_status = 'pending'`
- Set tất cả thành:
  - `punishment_status = 'skipped'`
  - `punishment_resolved_at = now()`

Bảng bị tác động:
- `daily_missions_v2`
- `reward_inventory_items`

Ghi chú:
- Chỉ skip punishment hôm nay, không xử lý punishment cũ ở Economy.

### `instant_100_xp`

Tên seed: `[TEST] +100 XP ngay lập tức`

Cách dùng UI:
- Không cần chọn target.

Backend hiện tại:
- Cộng ngay `100 XP` vào `daily_mission_couple_stats.xp`.

Bảng bị tác động:
- `daily_mission_couple_stats`
- `reward_inventory_items`

Ghi chú:
- XP là XP chung của couple mascot.

### `choose_all_partner_missions_tomorrow`

Tên seed: `[TEST] Chọn toàn bộ mission ngày mai cho partner`

Cách dùng UI:
- User nhập 3 dòng nội dung mission.
- UI gửi:
  - `target.customMissionText`
  - `target.customMissionTexts`

Backend hiện tại:
- Tìm partner.
- Tạo 3 mission ngày mai cho partner:
  - `mission_kind = 'commission'`
  - `xp_reward = 20`
  - `generated_by_special_reward = true`
- Gửi notification cho partner.

Bảng bị tác động:
- `daily_missions_v2`
- `notifications`
- `reward_inventory_items`

Lỗi có thể gặp:
- `partner_not_found`
- `missing_target`
- `commission_already_set`

Ghi chú:
- Backend chỉ lấy tối đa 3 dòng.
- Nếu nhập ít hơn 3 dòng thì báo `missing_target`.

### `double_xp_today`

Tên seed: `[TEST] Double XP cả ngày`

Cách dùng UI:
- Không cần chọn target.

Backend hiện tại:
- Lấy ngày hiện tại theo timezone `Asia/Bangkok`.
- Với mission của chính user trong hôm nay:
  - `status = 'pending'`
- Set `xp_multiplier = 2`.

Bảng bị tác động:
- `daily_missions_v2`
- `reward_inventory_items`

Ghi chú:
- Không tác động mission đã waiting/completed.
- Không kiểm tra mission đã double trước đó.

### `mission_day_off`

Tên seed: `[TEST] Miễn 1 ngày mission`

Cách dùng UI:
- Không cần chọn target.

Backend hiện tại:
- Lấy ngày hiện tại theo timezone `Asia/Bangkok`.
- Với mission của chính user trong hôm nay có status:
  - `pending`
  - `waiting_partner_approval`
- Set:
  - `status = 'completed'`
  - `xp_reward = 0`
  - `xp_multiplier = 1`
  - `completed_at = now()`
  - `approved_by = current user`
  - `reward_claimed_at = now()`
  - `generated_by_special_reward = true`

Bảng bị tác động:
- `daily_missions_v2`
- `reward_inventory_items`

Ghi chú:
- Mission được mark complete nhưng không cộng XP mission.
- `reward_claimed_at` được set ngay để day off không làm hiện nút claim reward.

## Legacy Effects Vẫn Được Backend Hỗ Trợ

Các effect dưới đây vẫn có trong type/backend để tương thích dữ liệu cũ. Nếu không cần nữa, có thể migrate dữ liệu và xóa dần.
UI tạo reward mới không còn đưa các effect legacy vào danh sách chọn.

### `skip_punishment`

Giống `skip_one_punishment`.

Target:
- `target.punishmentMissionId` hoặc `target.missionId`

Backend:
- Set punishment mission của chính user thành `skipped`.

### `change_mission`

Giống `change_one_mission`.

Target:
- `target.missionId`

Backend:
- Thay mission pending của chính user bằng mission cùng loại từ `daily_mission_bank_items`.

### `double_mission_xp`

Giống `double_xp_one_mission`.

Target:
- `target.missionId`

Backend:
- Set `xp_multiplier = 2` cho mission pending của chính user.

### `instant_xp`

Target:
- Không cần.

Backend:
- Cộng XP theo thứ tự ưu tiên:
  - `reward_payload.xp`
  - `reward_intensity * 10`
  - fallback `20`

### `block_troll`

Target:
- Không cần.

Backend:
- Tăng `daily_mission_couple_stats.troll_block_charges` lên 1.

Ghi chú:
- UI đã được chỉnh để không bắt chọn mission cho effect này.

### `choose_partner_mission`

Target UI hiện tại:
- UI cho chọn mission pending của chính user.

Backend hiện tại:
- Đang xử lý giống `change_mission`.
- Tức là không thật sự "choose partner mission".

Ghi chú:
- Đây là logic legacy chưa khớp tên effect.

### `swap_rewards`

Giống `swap_reward`.

Target:
- `target.partnerInventoryItemId`
- `target.selfInventoryItemId` hoặc `target.rewardInventoryItemId`

Backend:
- Đổi chủ sở hữu 2 reward unused.

### `protect_streak`

Legacy protect charge.

Target:
- Không cần.

Backend:
- Tăng `streak_protection_charges` lên 1.

## Điều Kiện Chung Khi Dùng Reward

Backend chỉ cho dùng reward nếu:

- Bản ghi tồn tại trong `reward_inventory_items`.
- `couple_id` đúng.
- `user_id` đúng current user.
- `status` chưa phải `used`.

Với reward không phải `special`, backend còn kiểm tra expire:

- Nếu `status = 'expired'` hoặc `expires_at < now()` thì set expired và báo `reward_expired`.
- Với `special`, hiện backend bỏ qua expire check.

## Những Điểm Có Thể Cần Sửa Logic

1. `reward_bank_items.effect` constraint
   - Đã fix bằng migration `0046_reward_bank_special_effect_constraint.sql`.
   - Seed vẫn tự vá constraint để có thể chạy độc lập trên DB cũ.

2. `choose_partner_mission`
   - Tên effect nói chọn mission partner, nhưng backend đang đổi mission của chính user.

3. `skip_all_punishments_today`
   - Chỉ xử lý punishment hôm nay, không xử lý punishment cũ đang nợ trong Economy.

4. Notification
   - Chỉ một số effect gửi notification:
     - normal claim
     - create commission
     - choose all partner missions tomorrow
     - force partner redo mission
   - Các effect khác chưa gửi notification.

5. Unsupported effect
   - Backend hiện throw `unsupported_reward_effect` nếu effect không match, thay vì âm thầm mark reward `used`.

## Real Supabase Test

Đã thêm test có guard tại `src/lib/rewardEconomyServer.real.test.ts`.

Chạy real integration test:

```bash
RUN_REAL_SPECIAL_REWARD_TESTS=1 npx vitest run src/lib/rewardEconomyServer.real.test.ts --reporter=verbose
```

Test này:
- Tạo couple/user/mission/inventory tạm trên Supabase thật.
- Chạy toàn bộ supported special/legacy effect.
- Kiểm tra các bảng bị tác động.
- Cleanup dữ liệu test sau khi chạy.

Normal `npm test` sẽ skip test này để không tự động đụng Supabase thật.

## Mapping Seed Test

| Seed Text | Effect |
| --- | --- |
| `[TEST] Skip 1 punishment` | `skip_one_punishment` |
| `[TEST] Đổi 1 mission` | `change_one_mission` |
| `[TEST] Double XP 1 mission` | `double_xp_one_mission` |
| `[TEST] +20 XP ngay lập tức` | `instant_20_xp` |
| `[TEST] Tạo commission cho người kia ngày mai` | `create_partner_commission_tomorrow` |
| `[TEST] Copy 1 reward của partner` | `copy_partner_reward` |
| `[TEST] Swap reward với partner` | `swap_reward` |
| `[TEST] Khôi phục streak` | `protect_streak_once` |
| `[TEST] Bắt partner làm lại 1 mission` | `force_partner_redo_mission` |
| `[TEST] Skip tất cả punishment hôm nay` | `skip_all_punishments_today` |
| `[TEST] +100 XP ngay lập tức` | `instant_100_xp` |
| `[TEST] Chọn toàn bộ mission ngày mai cho partner` | `choose_all_partner_missions_tomorrow` |
| `[TEST] Double XP cả ngày` | `double_xp_today` |
| `[TEST] Miễn 1 ngày mission` | `mission_day_off` |
| `[TEST-LEGACY] Skip punishment` | `skip_punishment` |
| `[TEST-LEGACY] Change mission` | `change_mission` |
| `[TEST-LEGACY] Double mission XP` | `double_mission_xp` |
| `[TEST-LEGACY] Instant XP theo intensity` | `instant_xp` |
| `[TEST-LEGACY] Block troll charge` | `block_troll` |
| `[TEST-LEGACY] Choose partner mission` | `choose_partner_mission` |
| `[TEST-LEGACY] Swap rewards` | `swap_rewards` |
| `[TEST-LEGACY] Protect streak` | `protect_streak` |
