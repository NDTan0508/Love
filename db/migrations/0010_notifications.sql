create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  type text not null default 'reminder',
  title text not null,
  body text not null,
  cta_path text,
  scheduled_for timestamptz not null default now(),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_couple_id_idx on notifications(couple_id);
create index if not exists notifications_scheduled_for_idx on notifications(scheduled_for desc);

alter table notifications enable row level security;

drop policy if exists "Couple members can read notifications" on notifications;
create policy "Couple members can read notifications"
on notifications for select
to authenticated
using (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = notifications.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can insert notifications" on notifications;
create policy "Couple members can insert notifications"
on notifications for insert
to authenticated
with check (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = notifications.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Recipients can mark notifications read" on notifications;
create policy "Recipients can mark notifications read"
on notifications for update
to authenticated
using (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = notifications.couple_id
      and cm.user_id = auth.uid()
  )
  and (notifications.user_id is null or notifications.user_id = auth.uid())
)
with check (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = notifications.couple_id
      and cm.user_id = auth.uid()
  )
  and (notifications.user_id is null or notifications.user_id = auth.uid())
);
