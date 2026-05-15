-- Migration 0005: basic timeline reactions for Sprint 3

create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references timeline_events(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  reaction_type text not null default 'heart',
  created_at timestamptz default now(),
  unique (event_id, user_id, reaction_type)
);

alter table reactions enable row level security;

drop policy if exists "Couple members can read reactions" on reactions;
create policy "Couple members can read reactions"
on reactions for select
to authenticated
using (
  exists (
    select 1
    from timeline_events
    join couple_members on couple_members.couple_id = timeline_events.couple_id
    where timeline_events.id = reactions.event_id
      and couple_members.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can create own reactions" on reactions;
create policy "Couple members can create own reactions"
on reactions for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from timeline_events
    join couple_members on couple_members.couple_id = timeline_events.couple_id
    where timeline_events.id = reactions.event_id
      and couple_members.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can delete own reactions" on reactions;
create policy "Couple members can delete own reactions"
on reactions for delete
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from timeline_events
    join couple_members on couple_members.couple_id = timeline_events.couple_id
    where timeline_events.id = reactions.event_id
      and couple_members.user_id = auth.uid()
  )
);
