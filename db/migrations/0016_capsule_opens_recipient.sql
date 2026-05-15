-- Migration 0016: Per-user capsule open tracking + recipient field
-- Supports: self-only capsules, per-user open (A opens ≠ B opens)

-- 1. Add recipient to memory_capsules
alter table memory_capsules
  add column if not exists recipient text not null default 'couple'
  check (recipient in ('self', 'couple'));

-- 2. Per-user open tracking (replaces global opened_at)
create table if not exists capsule_opens (
  id          uuid primary key default gen_random_uuid(),
  capsule_id  uuid not null references memory_capsules(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  opened_at   timestamptz not null default now(),
  unique (capsule_id, user_id)
);

-- RLS for capsule_opens
alter table capsule_opens enable row level security;

drop policy if exists "Users can see own capsule opens" on capsule_opens;
create policy "Users can see own capsule opens"
on capsule_opens for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can mark capsule as opened" on capsule_opens;
create policy "Users can mark capsule as opened"
on capsule_opens for insert to authenticated
with check (user_id = auth.uid());

-- 3. Update capsule select RLS: self-capsules only visible to creator
drop policy if exists "Couple members can read capsules" on memory_capsules;
create policy "Couple members can read capsules"
on memory_capsules for select to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = memory_capsules.couple_id
      and cm.user_id = auth.uid()
  )
  -- self capsules: only creator can read
  and (
    recipient = 'couple'
    or creator_id = auth.uid()
  )
);
