-- Migration 0021: durable activity events for missed update/delete notifications
-- Deleted rows cannot be queried from their source table after reconnect, so
-- partner-facing edits/deletes are recorded here for catch-up notifications.

create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  actor_id uuid not null references users(id) on delete cascade,
  entity_type text not null check (entity_type in ('timeline', 'blog', 'capsule')),
  action_type text not null check (action_type in ('update', 'delete')),
  entity_id uuid,
  entity_title text,
  created_at timestamptz not null default now()
);

create index if not exists activity_events_couple_created_idx
  on activity_events(couple_id, created_at desc);

create index if not exists activity_events_actor_action_idx
  on activity_events(actor_id, entity_type, action_type, created_at desc);

alter table activity_events enable row level security;

drop policy if exists "Couple members can read activity events" on activity_events;
create policy "Couple members can read activity events"
on activity_events for select
to authenticated
using (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = activity_events.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can insert own activity events" on activity_events;
create policy "Couple members can insert own activity events"
on activity_events for insert
to authenticated
with check (
  actor_id = auth.uid()
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = activity_events.couple_id
      and cm.user_id = auth.uid()
  )
);

alter table timeline_events
  add column if not exists updated_at timestamptz not null default now();

update timeline_events
set updated_at = created_at
where updated_at is null;
