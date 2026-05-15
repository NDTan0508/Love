# Sprint 8 - AI Insights Safe Rollout

## Goal

Add AI insights only after the app has enough real signals and a privacy gate. AI must be warm, safe, non-judgmental, and optional.

## Sprint Task Board

- `[DONE] S8.1` AI insight data contract and first safe vertical slice: schema, privacy-gated API, fallback generation, and minimal UI.
- `[DONE] S8.2` OpenAI Responses integration hardening: structured output validation, retry/fallback behavior, and test coverage.
- `[DONE] S8.3` Monthly recap data pipeline: aggregate mood/timeline/blog/mission signals into a stored monthly recap.
- `[DONE] S8.4` AI safety and opt-out QA: enforce privacy gate, non-toxic copy, no diagnosis/therapy claims, no partner blame.
- `[DONE] S8.5` Dashboard integration: surface latest insight softly without crowding core actions.
- `[DONE] S8.6` Sprint 8 QA closeout: run local QA, manual two-user flow, and document live migration/API-key requirements.

## Source Decisions

- Use OpenAI Responses API for generation.
- Use structured JSON output for predictable UI rendering.
- Default model: `gpt-5.4-mini` unless `OPENAI_MODEL` is set, chosen for lower latency/cost relative to flagship models.
- Never call OpenAI unless the current user has opted in at `/privacy`.
- If `OPENAI_API_KEY` is missing, return a safe local fallback insight so the user flow remains testable.

Official docs consulted:
- OpenAI Models page: current latest models are available through Responses API and smaller variants are recommended for latency/cost.
- OpenAI Structured Outputs guide: structured JSON output is the right fit for predictable UI.

## Completed in S8.1

- Added `db/migrations/0024_ai_insights.sql` and updated `db/schema.sql` for `ai_insights`.
- Updated `scripts/audit-rls.mjs` so `ai_insights` is part of the required RLS audit.
- Added `.env.example` entries for `OPENAI_API_KEY` and `OPENAI_MODEL`.
- Added privacy-gated API route `src/app/api/ai/insights/route.ts`.
- Added client API helper `src/lib/aiInsightsService.ts`.
- Added first UI at `src/app/ai/insights/page.tsx`.
- Fixed missed notification noise: blog create no longer writes an `update` activity event. Blog edit/delete remain the durable missed notification actions.

## Completed in S8.2

- Fixed `/api/ai/insights` auth by validating the browser bearer token with `supabase.auth.getUser(token)` on the server.
- Moved OpenAI generation, output validation, fallback generation, and safety checks into `src/lib/aiGenerationService.ts`.
- Added unit tests for missing key fallback, invalid JSON fallback, unsafe output fallback, valid OpenAI output, invalid field rejection, and monthly recap fallback.
- Added AI insights to the dashboard quick actions.
- Improved auth error copy so users see a login-again message instead of raw `Unauthorized`.

## Completed in S8.3

- Added `db/migrations/0025_ai_monthly_recaps.sql` for `ai_monthly_recaps`.
- Updated `db/schema.sql` and `scripts/audit-rls.mjs` so monthly recaps are part of schema and RLS audit.
- Added `GET /api/ai/monthly-recap?month=YYYY-MM` and `POST /api/ai/monthly-recap?month=YYYY-MM`.
- Monthly recap uses the same privacy gate and user bearer token as AI insights.
- Added client helpers `getMonthlyRecap()` and `generateMonthlyRecap()`.
- Added monthly recap UI into `/ai/insights`.

## Completed in S8.4

- AI generation now validates required fields, allowed `tone`, allowed `riskLevel`, text length, and unsafe terms before saving OpenAI output.
- OpenAI errors, timeouts, invalid JSON, unsafe output, missing key, and invalid shape all return deterministic local fallback.
- AI and monthly recap remain blocked when `/privacy` AI opt-in is disabled.
- UI copy states AI is non-judgmental, non-diagnostic, and not a replacement for psychological counseling.

## Completed in S8.5

- Dashboard AI card now reads latest insight state:
  - privacy off -> links to `/privacy` and says `Bat AI insights`;
  - no insight -> links to `/ai/insights` and says `Tao goi y dau tien`;
  - existing insight -> shows headline, action, and update time.
- Dashboard header and quick actions include AI insights.
- Removed mojibake/emoji-broken copy around dashboard couple header, memory rows, capsule, and blog quick action labels.

## Completed in S8.6

- Updated `.env.example` with fallback behavior note for missing `OPENAI_API_KEY`.
- Completed QA closeout and live missed notification smoke test.

## Post-Sprint 8 Emotional AI Upgrade

- Added `db/migrations/0026_ai_bonding_features.sql` for daily prompts, prompt responses, saved rituals, and saved memory stories.
- Extended `src/lib/aiGenerationService.ts` with safe structured output generation for:
  - Daily Love Prompt
  - AI Message Helper
  - Couple Ritual Generator
  - Memory Storyteller
- Added privacy-gated API routes:
  - `GET/POST /api/ai/daily-prompt`
  - `POST /api/ai/message-helper`
  - `GET/POST /api/ai/rituals`
  - `GET/POST /api/ai/memory-story`
- Added user routes:
  - `/ai/daily`
  - `/ai/message-helper`
  - `/ai/rituals`
  - `/ai/memory-story`
- Dashboard now surfaces Daily Love Prompt as a daily bonding action and auto-creates today's prompt when AI privacy is enabled.
- Message Helper can prefill blog or timeline creation.
- Memory Storyteller can prefill blog or capsule creation.
- Added tests for new AI fallback/safety outputs.

## QA Status

- `npm.cmd run qa` passed on May 14, 2026.
  - Migration check clean: 25 migrations, latest `0025_ai_monthly_recaps.sql`.
  - RLS audit clean: 20 core tables have RLS and policies.
  - Typecheck passed.
  - Vitest passed: 9 files, 59 tests.
  - Next production build passed, including `/api/ai/monthly-recap`.
- `npm.cmd run e2e:missed` passed on May 14, 2026 against live Supabase.
- After the emotional AI upgrade, latest QA also passed with 26 migrations, 24 RLS-audited tables, and 64 Vitest tests.
- After the final dashboard auto-create adjustment, `npm.cmd run typecheck`, `npm.cmd run test`, and `npm.cmd run build` passed again.
- Live Supabase needs migrations `0024_ai_insights.sql`, `0025_ai_monthly_recaps.sql`, and `0026_ai_bonding_features.sql` applied before all AI rows can persist.

## Manual Test for User

1. Apply `db/migrations/0024_ai_insights.sql`, `db/migrations/0025_ai_monthly_recaps.sql`, and `db/migrations/0026_ai_bonding_features.sql` in Supabase SQL Editor.
2. Optional: set `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-5.4-mini` in `.env.local`; without a key, fallback insight should still work.
3. Login as a real couple user.
4. Go to `/privacy` and enable AI insights.
5. Go to `/ai/insights` and generate an insight.
6. In `/ai/insights`, generate monthly recap and confirm it renders the recap sections.
7. Go to `/dashboard` and confirm today's Daily Love Prompt appears and the AI card shows the latest insight headline/action.
8. Disable AI insights at `/privacy`, then reload `/ai/insights`; it should block both insight and recap with the privacy-required state.
9. Edit and delete a partner-visible blog/timeline item from user A, login as user B, and confirm the bell shows missed edit/delete notifications.

## Next Exact Task

Sprint 9 is complete in code. Next exact task is live manual couple QA after applying migration `0026_ai_bonding_features.sql`.

## Last Updated

- Date: May 14, 2026
- Updated by: AI Code Assistant
