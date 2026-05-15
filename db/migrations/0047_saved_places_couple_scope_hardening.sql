-- Migration 0047: harden saved places so every place remains scoped to one couple.

create table if not exists saved_places (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  created_by uuid not null references users(id) on delete cascade,
  name text not null,
  category text not null check (category in ('food', 'drink')),
  rating integer not null default 3 check (rating between 1 and 5),
  latitude double precision,
  longitude double precision,
  google_maps_url text,
  opening_hours text not null default 'Chưa rõ',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saved_places_destination_check check (
    google_maps_url is not null
    or (latitude is not null and longitude is not null)
  )
);

create index if not exists saved_places_couple_created_idx
  on saved_places(couple_id, created_at desc);

create index if not exists saved_places_couple_category_idx
  on saved_places(couple_id, category);

create index if not exists saved_places_couple_id_id_idx
  on saved_places(couple_id, id);

alter table saved_places enable row level security;
alter table saved_places force row level security;

drop policy if exists "Couple members can read saved places" on saved_places;
create policy "Couple members can read saved places"
on saved_places for select
to authenticated
using (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = saved_places.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can insert saved places" on saved_places;
create policy "Couple members can insert saved places"
on saved_places for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = saved_places.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can update saved places" on saved_places;
create policy "Couple members can update saved places"
on saved_places for update
to authenticated
using (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = saved_places.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = saved_places.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can delete saved places" on saved_places;
create policy "Couple members can delete saved places"
on saved_places for delete
to authenticated
using (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = saved_places.couple_id
      and cm.user_id = auth.uid()
  )
);

alter table saved_places replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table saved_places;
  end if;
exception
  when duplicate_object then null;
end $$;
