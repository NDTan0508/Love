# Sprint 9 - Polish, PWA, Accessibility, Release Readiness

## Goal

Make Web Love feel more like an installable private couple app: mobile-ready, emotionally warm, accessible, and release-testable.

## Sprint Task Board

- `[DONE] S9.1` PWA installability: manifest, app icon, theme metadata, conservative service worker registration.
- `[DONE] S9.2` Metadata and first impression: update root metadata and home copy so the app feels like Web Love, not a dev link list.
- `[DONE] S9.3` Accessibility/mobile polish: improve labels, focus states, reduced-motion behavior, and touch-friendly routes touched by AI.
- `[DONE] S9.4` Docs and release checklist: update README, handoff, migration list, QA commands, and manual couple test flow.
- `[DONE] S9.5` Final QA: run migration/RLS/typecheck/test/build/e2e and document remaining live Supabase requirements.

## Source Decisions

- No heavy PWA dependency.
- Use a conservative service worker that caches only app-shell/static GET assets and never caches Supabase/OpenAI API responses.
- Keep AI privacy and safety gates from Sprint 8 for all new bonding features.
- Prefer proper Vietnamese copy in UI files. Do not use broad text replacement scripts; use manual patches per file.

## Next Exact Task

Sprint 9 is complete in code. Current UI redesign pass is partially complete. Next exact task is manual copy cleanup for Blog, Capsule, AI pages, and realtime notification copy, one file at a time.

## Completed Work

- Added `src/app/manifest.ts`, `public/icons/icon.svg`, `public/sw.js`, and `src/components/ServiceWorkerRegister.tsx`.
- Service worker registers only in production and avoids caching `/api/*` and Supabase requests.
- Updated root metadata, viewport theme color, metadata base, and home page emotional entry.
- Increased dashboard bottom padding for the larger quick-action panel.
- Dashboard auto-creates today's Daily Love Prompt when AI privacy is enabled and no prompt exists yet.
- Updated `README.md` with current AI/PWA routes, migrations, QA commands, and manual couple test flow.
- Started the UI redesign pass from the `UI/` mocks:
  - added mobile bottom navigation matching the mock structure;
  - updated global shell, cards, buttons, inputs, and state panels;
  - refreshed home, login, signup, dashboard, timeline, and media upload styling/copy;
  - updated `UI_GAPS.md` with features present in mocks but not yet implemented.

## QA Status

- `npm.cmd run qa` passed on May 14, 2026.
  - Migration check clean: 26 migrations, latest `0026_ai_bonding_features.sql`.
  - RLS audit clean: 24 core tables have RLS and policies.
  - Typecheck passed.
  - Vitest passed: 9 files, 64 tests.
  - Next production build passed, 37 routes.
- `npm.cmd run e2e:missed` passed on May 14, 2026.
- Production runtime smoke test passed on May 14, 2026:
  - `/`, `/dashboard`, `/ai/daily`, `/ai/message-helper`, `/ai/rituals`, `/ai/memory-story`, `/manifest.webmanifest`, `/sw.js` all returned HTTP 200.
- After the final dashboard auto-create adjustment, `npm.cmd run typecheck`, `npm.cmd run test`, and `npm.cmd run build` passed again.
- After the UI redesign pass, `npm.cmd run typecheck`, `npm.cmd run test`, and `npm.cmd run build` passed again.
- Runtime smoke test passed for `/`, `/login`, `/signup`, `/dashboard`, `/timeline`, `/mood`, `/missions`, `/privacy`, `/blog`, `/capsule`, and `/ai/insights`.

## Manual Test For User

1. Apply `db/migrations/0026_ai_bonding_features.sql` in Supabase SQL Editor.
2. Restart dev server.
3. Login as a paired user and enable AI in `/privacy`.
4. Test `/ai/daily`: generate prompt, write response, mark done.
5. Test `/ai/message-helper`: generate a message and save to blog/memory.
6. Test `/ai/rituals`: generate a ritual and create a mission from it.
7. Test `/ai/memory-story`: generate a story and save it to blog/capsule.
8. Return to `/dashboard`; confirm Daily Prompt and AI cards are readable and not crowded.
9. Disable AI in `/privacy`; confirm all AI routes block with privacy-required state.

## Last Updated

- Date: May 14, 2026
- Updated by: AI Code Assistant
