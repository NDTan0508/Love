-- Migration 0038: top-tier Couple Quiz question bank, anti-repeat history, and local history deletion.

create table if not exists couple_quiz_custom_questions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists couple_quiz_played_questions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  text text not null,
  normalized_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists couple_quiz_history (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  session_id uuid not null references game_sessions(id) on delete cascade,
  questions jsonb not null default '[]'::jsonb,
  self_answers jsonb not null default '{}'::jsonb,
  partner_guesses jsonb not null default '{}'::jsonb,
  players jsonb not null default '[]'::jsonb,
  played_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (session_id)
);

create table if not exists couple_quiz_history_deletions (
  history_id uuid not null references couple_quiz_history(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  primary key (history_id, user_id)
);

create index if not exists couple_quiz_custom_questions_couple_created_idx
  on couple_quiz_custom_questions(couple_id, created_at desc);

create index if not exists couple_quiz_played_questions_couple_created_idx
  on couple_quiz_played_questions(couple_id, created_at desc);

create index if not exists couple_quiz_played_questions_couple_normalized_idx
  on couple_quiz_played_questions(couple_id, normalized_text);

create index if not exists couple_quiz_history_couple_played_idx
  on couple_quiz_history(couple_id, played_at desc);

alter table couple_quiz_custom_questions enable row level security;
alter table couple_quiz_played_questions enable row level security;
alter table couple_quiz_history enable row level security;
alter table couple_quiz_history_deletions enable row level security;

drop policy if exists "Couple members can read custom quiz questions" on couple_quiz_custom_questions;
create policy "Couple members can read custom quiz questions"
on couple_quiz_custom_questions for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couple_quiz_custom_questions.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can insert custom quiz questions" on couple_quiz_custom_questions;
create policy "Couple members can insert custom quiz questions"
on couple_quiz_custom_questions for insert
to authenticated
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couple_quiz_custom_questions.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can update custom quiz questions" on couple_quiz_custom_questions;
create policy "Couple members can update custom quiz questions"
on couple_quiz_custom_questions for update
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couple_quiz_custom_questions.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couple_quiz_custom_questions.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can delete custom quiz questions" on couple_quiz_custom_questions;
create policy "Couple members can delete custom quiz questions"
on couple_quiz_custom_questions for delete
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couple_quiz_custom_questions.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read played quiz questions" on couple_quiz_played_questions;
create policy "Couple members can read played quiz questions"
on couple_quiz_played_questions for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couple_quiz_played_questions.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read quiz history" on couple_quiz_history;
create policy "Couple members can read quiz history"
on couple_quiz_history for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couple_quiz_history.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users can read own quiz history deletions" on couple_quiz_history_deletions;
create policy "Users can read own quiz history deletions"
on couple_quiz_history_deletions for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own quiz history deletions" on couple_quiz_history_deletions;
create policy "Users can insert own quiz history deletions"
on couple_quiz_history_deletions for insert
to authenticated
with check (user_id = auth.uid());
