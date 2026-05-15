-- Sprint 11 QA hardening: real couple profile fields and server-owned game state.

alter table users
  add column if not exists birthday date,
  add column if not exists phone text,
  add column if not exists updated_at timestamptz default now();

alter table couples
  add column if not exists anniversary_date date,
  add column if not exists updated_at timestamptz default now();

drop policy if exists "Couple members can update couples" on couples;
create policy "Couple members can update couples"
on couples for update
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couples.id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couples.id
      and cm.user_id = auth.uid()
  )
);

-- Game state must be changed by validated API routes. Clients may create sessions
-- and join as players, but they should not update game_sessions directly.
drop policy if exists "Couple members can update game sessions" on game_sessions;
