-- Migration 0007: mood tracking foundation for daily check-ins

create table if not exists moods (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  value integer not null check (value between 1 and 10),
  mood_date date not null default current_date,
  created_at timestamptz default now(),
  unique (couple_id, user_id, mood_date)
);

alter table moods enable row level security;

drop policy if exists "Couple members can read moods" on moods;
create policy "Couple members can read moods"
on moods for select
to authenticated
using (
  exists (
    select 1
    from couple_members
    where couple_members.couple_id = moods.couple_id
      and couple_members.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can create own moods" on moods;
create policy "Couple members can create own moods"
on moods for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from couple_members
    where couple_members.couple_id = moods.couple_id
      and couple_members.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can update own moods" on moods;
create policy "Couple members can update own moods"
on moods for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from couple_members
    where couple_members.couple_id = moods.couple_id
      and couple_members.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from couple_members
    where couple_members.couple_id = moods.couple_id
      and couple_members.user_id = auth.uid()
  )
);
