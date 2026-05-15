-- Migration 0034: couple gallery photos

create table if not exists gallery_photos (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  uploaded_by uuid not null references users(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists gallery_photos_couple_created_idx
  on gallery_photos(couple_id, created_at desc);

alter table gallery_photos enable row level security;

drop policy if exists "Couple members can read gallery photos" on gallery_photos;
create policy "Couple members can read gallery photos"
on gallery_photos for select
using (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = gallery_photos.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can insert gallery photos" on gallery_photos;
create policy "Couple members can insert gallery photos"
on gallery_photos for insert
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = gallery_photos.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Uploaders can delete gallery photos" on gallery_photos;
create policy "Uploaders can delete gallery photos"
on gallery_photos for delete
using (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = gallery_photos.couple_id
      and cm.user_id = auth.uid()
  )
);

alter table gallery_photos replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table gallery_photos;
  end if;
exception
  when duplicate_object then null;
end $$;
