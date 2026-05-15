# Web Love - Developer README

Web Love is an emotional-first couple web app: a private shared space for two people to save memories, check in with feelings, play together, create small rituals, and return to each other through daily actions.

## Quick Start

```bash
npm install
npm.cmd run dev
```

Visit `http://localhost:3000`.

## Environment Setup

Create `.env.local` from `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_EMAIL_ALLOWLIST=your-admin-email@example.com
NEXT_PUBLIC_APP_NAME=Web Love
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-5.4-mini
```

`OPENAI_API_KEY` is optional for local testing. If it is empty, AI features use safe deterministic fallback copy.

## Current Status

Sprint 11 upgrades are implemented in code:

- Vietnamese copy cleanup for the main shell, dashboard, mood, privacy, settings, gifts, games, date ideas, stats, and new hubs.
- Main navigation is now `Home`, `Memories`, center `Mood`, `Us`, `More`.
- Wishlist/Gifts uses Supabase shared data with private surprise reservations.
- Games V1 includes Couple Quiz with shared session state and XP rewards.
- Love Coach appears contextually on dashboard, gifts, games, mood, and memories.

## Core Routes

| Feature | Route |
|---|---|
| Dashboard | `/dashboard` |
| Memories hub | `/memories` |
| Timeline memories | `/timeline`, `/timeline/create`, `/timeline/:id` |
| Mood check-in | `/mood` |
| Us hub | `/us` |
| Wishlist/Gifts | `/gifts` |
| Realtime Games | `/games` |
| Missions | `/missions` |
| Blog | `/blog`, `/blog/create`, `/blog/:id` |
| Memory Capsule | `/capsule`, `/capsule/create`, `/capsule/:id` |
| More hub | `/more` |
| Privacy gate | `/privacy` |
| AI hub | `/ai/insights` |
| Daily Love Prompt | `/ai/daily` |
| AI Message Helper | `/ai/message-helper` |
| Couple Rituals | `/ai/rituals` |
| Memory Storyteller | `/ai/memory-story` |

## Latest Supabase Migrations

Apply all migrations in order. Recent required migrations:

| # | File | Purpose |
|---|---|---|
| 0023 | `0023_ai_privacy_settings.sql` | User opt-in gate for AI |
| 0024 | `0024_ai_insights.sql` | Stored AI insights |
| 0025 | `0025_ai_monthly_recaps.sql` | Stored monthly recaps |
| 0026 | `0026_ai_bonding_features.sql` | Daily prompts, responses, rituals, memory stories |
| 0027 | `0027_shared_wishlist_and_realtime_games.sql` | Shared wishlist, rewards, and game sessions |

## Quality Commands

```bash
npm.cmd run check:migrations
npm.cmd run check:rls
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
npm.cmd run qa
npm.cmd run e2e:missed
```

`npm.cmd run e2e:missed` connects to live Supabase and requires real env vars.

## Manual Couple Test Flow

1. Apply migrations through `0027`.
2. Login with two paired users in two browsers/profiles.
3. Confirm bottom nav shows `Home`, `Memories`, `Mood`, `Us`, `More`.
4. User A opens `/gifts`, adds a wishlist item.
5. User B sees the item, selects `Giữ bất ngờ`; User A should not see B's private reservation.
6. User A opens `/games`, creates `Quiz hiểu nhau`; User B opens `/games` and joins the same room.
7. Play Couple Quiz. Test refresh/rejoin during a room.
8. Confirm completed games add XP/reward visible in `/gifts`.
9. Open `/privacy`, enable AI, then confirm `/dashboard` and `/ai/daily` show Love Coach content.
10. Disable AI and confirm AI pages are blocked correctly.
11. Run the missed notification flow: user A edits/deletes content while user B is offline, then user B logs in and checks the bell.

## Release Notes

- PWA manifest is available at `/manifest.webmanifest`.
- Service worker registration runs only in production and avoids caching API/Supabase requests.
- The app shell remains mobile-first at `max-w-[430px]`.
- AI features are privacy-gated and have fallback behavior when OpenAI is unavailable.
