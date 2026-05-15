-- Migration 0037: remove Heart Tic-tac-toe from active app behavior.

update game_sessions
set
  status = 'cancelled',
  updated_at = now()
where game_type = 'heart_ttt'
  and status in ('waiting', 'active');

alter table game_sessions
  drop constraint if exists game_sessions_game_type_check;

alter table game_sessions
  add constraint game_sessions_game_type_check
  check (game_type in ('couple_quiz')) not valid;
