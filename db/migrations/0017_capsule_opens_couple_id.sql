-- Migration 0017: Add couple_id to capsule_opens for realtime filtering
-- Root cause: capsule_opens had no couple_id so Supabase Realtime filter failed
-- Also: old RLS prevented partners from seeing each other's opens → realtime event blocked

-- 1. Add couple_id to capsule_opens (derived from the capsule's couple)
alter table capsule_opens
  add column if not exists couple_id uuid references couples(id) on delete cascade;

-- 2. Backfill existing rows
update capsule_opens co
set couple_id = mc.couple_id
from memory_capsules mc
where mc.id = co.capsule_id
  and co.couple_id is null;

-- 3. Make couple_id NOT NULL after backfill
alter table capsule_opens
  alter column couple_id set not null;

-- 4. Index for realtime filter
create index if not exists capsule_opens_couple_idx on capsule_opens(couple_id, opened_at desc);

-- 5. Drop old RLS policies that blocked partner access
drop policy if exists "Users can see own capsule opens" on capsule_opens;
drop policy if exists "Users can mark capsule as opened" on capsule_opens;

-- 6. New RLS: couple members can see all opens within their couple (needed for realtime)
create policy "Couple members can read capsule opens"
on capsule_opens for select to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = capsule_opens.couple_id
      and cm.user_id = auth.uid()
  )
);

-- 7. Insert policy: user must be in the couple and inserting own record
create policy "Users can mark capsule as opened"
on capsule_opens for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = capsule_opens.couple_id
      and cm.user_id = auth.uid()
  )
);
