-- Migration 0006: basic timeline comments for Sprint 3

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references timeline_events(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  author text,
  body text not null,
  created_at timestamptz default now()
);

alter table comments enable row level security;

drop policy if exists "Couple members can read comments" on comments;
create policy "Couple members can read comments"
on comments for select
to authenticated
using (
  exists (
    select 1
    from timeline_events
    join couple_members on couple_members.couple_id = timeline_events.couple_id
    where timeline_events.id = comments.event_id
      and couple_members.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can create own comments" on comments;
create policy "Couple members can create own comments"
on comments for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from timeline_events
    join couple_members on couple_members.couple_id = timeline_events.couple_id
    where timeline_events.id = comments.event_id
      and couple_members.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can delete own comments" on comments;
create policy "Couple members can delete own comments"
on comments for delete
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from timeline_events
    join couple_members on couple_members.couple_id = timeline_events.couple_id
    where timeline_events.id = comments.event_id
      and couple_members.user_id = auth.uid()
  )
);
