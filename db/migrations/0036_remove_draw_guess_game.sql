-- Migration 0036: remove Drawing Guess game type from active app behavior.

update game_sessions
set
  status = 'cancelled',
  updated_at = now()
where game_type = 'draw_guess'
  and status in ('waiting', 'active');

alter table game_sessions
  drop constraint if exists game_sessions_game_type_check;

alter table game_sessions
  add constraint game_sessions_game_type_check
  check (game_type in ('couple_quiz', 'heart_ttt')) not valid;
