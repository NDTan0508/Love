# UI Gaps Audit

Source: `UI/1.html`..`UI/12.html` and `UI/screenshot UI/1.png`..`12.png`.

## Already In Current Web App

- Home/Dashboard couple space.
- Timeline memories.
- Memory Capsule.
- Mood check-in and relationship health.
- Missions.
- Couple Blog.
- AI Love Insight, daily prompt, message helper, rituals, memory story.
- Privacy gate for AI.
- Bottom navigation: Home, Timeline, heart check-in, Gifts, Profile.
- PWA manifest/service worker production.

## Added From UI Mock In Sprint 10

- `/settings`: profile/settings hub with theme choice, reminder toggles, privacy link, stats/date/game links, and local backup export.
- `/gifts`: wishlist, coupons/rewards, completion state, localStorage persistence.
- `/date-ideas`: date idea cards with budget and emotional-context filters.
- `/games`: couple quiz MVP with scoring.
- `/stats`: relationship stats screen with days together, memories, mood, missions, and a soft trend chart.

## Still Missing Or Partial

- Timeline multi-reactions: mock has several reaction counters; current app mainly supports heart/comment.
- Settings persistence: `/settings` is local MVP; no database-backed profile/preferences yet.
- Full Supabase backup/export: current export only covers local settings.
- Notification preferences: `/settings` has local toggles, not connected to notification scheduling.
- Rewards/Coupons backend: `/gifts` has local reward cards, not connected to missions XP redemption.
- Manual copy cleanup remains for older Blog/Capsule/AI pages.

## Next Recommended Order

1. Add timeline multi-reactions.
2. Persist user settings and gift wishlist in Supabase.
3. Connect notification toggles to reminder logic.
4. Add real data export for memories, blogs, mood, missions, and capsules.
5. Continue file-by-file Vietnamese copy cleanup.
