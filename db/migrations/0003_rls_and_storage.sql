-- Migration 0003: RLS and storage policies for Sprint 2

insert into storage.buckets (id, name, public)
values ('timeline-media', 'timeline-media', true)
on conflict (id) do update set public = excluded.public;

alter table users enable row level security;
alter table couples enable row level security;
alter table couple_members enable row level security;
alter table pair_invites enable row level security;
alter table timeline_events enable row level security;
alter table timeline_media enable row level security;

drop policy if exists "Users can read own row" on users;
create policy "Users can read own row"
on users for select
using (auth.uid() = id);

drop policy if exists "Users can insert own row" on users;
create policy "Users can insert own row"
on users for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own row" on users;
create policy "Users can update own row"
on users for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Authenticated users can create couples" on couples;
create policy "Authenticated users can create couples"
on couples for insert
to authenticated
with check (true);

drop policy if exists "Couple members can read couples" on couples;
create policy "Couple members can read couples"
on couples for select
to authenticated
using (
  exists (
    select 1
    from couple_members
    where couple_members.couple_id = couples.id
      and couple_members.user_id = auth.uid()
  )
);

drop policy if exists "Members can read couple membership" on couple_members;
create policy "Members can read couple membership"
on couple_members for select
to authenticated
using (
  exists (
    select 1
    from couple_members as current_members
    where current_members.couple_id = couple_members.couple_id
      and current_members.user_id = auth.uid()
  )
);

drop policy if exists "Users can add own couple membership" on couple_members;
create policy "Users can add own couple membership"
on couple_members for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can read invites" on pair_invites;
create policy "Authenticated users can read invites"
on pair_invites for select
to authenticated
using (true);

drop policy if exists "Authenticated users can create invites" on pair_invites;
create policy "Authenticated users can create invites"
on pair_invites for insert
to authenticated
with check (auth.uid() = created_by);

drop policy if exists "Authenticated users can update invites" on pair_invites;
create policy "Authenticated users can update invites"
on pair_invites for update
to authenticated
using (true)
with check (true);

drop policy if exists "Couple members can read timeline events" on timeline_events;
create policy "Couple members can read timeline events"
on timeline_events for select
to authenticated
using (
  exists (
    select 1
    from couple_members
    where couple_members.couple_id = timeline_events.couple_id
      and couple_members.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can create timeline events" on timeline_events;
create policy "Couple members can create timeline events"
on timeline_events for insert
to authenticated
with check (
  auth.uid() = author_id
  and exists (
    select 1
    from couple_members
    where couple_members.couple_id = timeline_events.couple_id
      and couple_members.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can update timeline events" on timeline_events;
create policy "Couple members can update timeline events"
on timeline_events for update
to authenticated
using (
  exists (
    select 1
    from couple_members
    where couple_members.couple_id = timeline_events.couple_id
      and couple_members.user_id = auth.uid()
  )
)
with check (
  auth.uid() = author_id
  and exists (
    select 1
    from couple_members
    where couple_members.couple_id = timeline_events.couple_id
      and couple_members.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can delete timeline events" on timeline_events;
create policy "Couple members can delete timeline events"
on timeline_events for delete
to authenticated
using (
  exists (
    select 1
    from couple_members
    where couple_members.couple_id = timeline_events.couple_id
      and couple_members.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read timeline media" on timeline_media;
create policy "Couple members can read timeline media"
on timeline_media for select
to authenticated
using (
  exists (
    select 1
    from timeline_events
    join couple_members on couple_members.couple_id = timeline_events.couple_id
    where timeline_events.id = timeline_media.event_id
      and couple_members.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can create timeline media" on timeline_media;
create policy "Couple members can create timeline media"
on timeline_media for insert
to authenticated
with check (
  exists (
    select 1
    from timeline_events
    join couple_members on couple_members.couple_id = timeline_events.couple_id
    where timeline_events.id = timeline_media.event_id
      and couple_members.user_id = auth.uid()
  )
);

drop policy if exists "Authenticated users can upload timeline media" on storage.objects;
create policy "Authenticated users can upload timeline media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'timeline-media'
  and owner = auth.uid()
);

drop policy if exists "Authenticated users can read timeline media" on storage.objects;
create policy "Authenticated users can read timeline media"
on storage.objects for select
to authenticated
using (bucket_id = 'timeline-media');