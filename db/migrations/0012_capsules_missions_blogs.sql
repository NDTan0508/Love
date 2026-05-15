create table if not exists memory_capsules (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  creator_id uuid not null references users(id) on delete cascade,
  title text not null,
  note text,
  unlock_at timestamptz not null,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  created_by uuid not null references users(id) on delete cascade,
  title text not null,
  description text,
  xp_reward integer not null default 10 check (xp_reward >= 0),
  badge_key text,
  is_active boolean not null default true,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table if not exists mission_progress (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions(id) on delete cascade,
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  progress_value integer not null default 0 check (progress_value >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mission_id, user_id)
);

create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  badge_key text not null,
  title text not null,
  description text,
  earned_at timestamptz not null default now(),
  source_mission_id uuid references missions(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (couple_id, user_id, badge_key)
);

create table if not exists blogs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  title text not null,
  body text not null,
  visibility text not null default 'couple' check (visibility in ('couple', 'private')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_capsules_couple_unlock_idx on memory_capsules(couple_id, unlock_at desc);
create index if not exists missions_couple_active_idx on missions(couple_id, is_active, created_at desc);
create index if not exists mission_progress_user_status_idx on mission_progress(user_id, status, updated_at desc);
create index if not exists badges_couple_user_idx on badges(couple_id, user_id, earned_at desc);
create index if not exists blogs_couple_created_idx on blogs(couple_id, created_at desc);

alter table memory_capsules enable row level security;
alter table missions enable row level security;
alter table mission_progress enable row level security;
alter table badges enable row level security;
alter table blogs enable row level security;

drop policy if exists "Couple members can read capsules" on memory_capsules;
create policy "Couple members can read capsules"
on memory_capsules for select
to authenticated
using (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = memory_capsules.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can create own capsules" on memory_capsules;
create policy "Couple members can create own capsules"
on memory_capsules for insert
to authenticated
with check (
  auth.uid() = creator_id
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = memory_capsules.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Capsule creators can update own capsules" on memory_capsules;
create policy "Capsule creators can update own capsules"
on memory_capsules for update
to authenticated
using (
  auth.uid() = creator_id
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = memory_capsules.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  auth.uid() = creator_id
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = memory_capsules.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read missions" on missions;
create policy "Couple members can read missions"
on missions for select
to authenticated
using (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = missions.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can create missions" on missions;
create policy "Couple members can create missions"
on missions for insert
to authenticated
with check (
  auth.uid() = created_by
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = missions.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Mission creators can update missions" on missions;
create policy "Mission creators can update missions"
on missions for update
to authenticated
using (
  auth.uid() = created_by
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = missions.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  auth.uid() = created_by
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = missions.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read mission progress" on mission_progress;
create policy "Couple members can read mission progress"
on mission_progress for select
to authenticated
using (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = mission_progress.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can create own mission progress" on mission_progress;
create policy "Couple members can create own mission progress"
on mission_progress for insert
to authenticated
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = mission_progress.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own mission progress" on mission_progress;
create policy "Users can update own mission progress"
on mission_progress for update
to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = mission_progress.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = mission_progress.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read badges" on badges;
create policy "Couple members can read badges"
on badges for select
to authenticated
using (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = badges.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can insert badges" on badges;
create policy "Couple members can insert badges"
on badges for insert
to authenticated
with check (
  exists (
    select 1
    from couple_members cm
    where cm.couple_id = badges.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read blogs" on blogs;
create policy "Couple members can read blogs"
on blogs for select
to authenticated
using (
  (
    visibility = 'couple'
    and exists (
      select 1
      from couple_members cm
      where cm.couple_id = blogs.couple_id
        and cm.user_id = auth.uid()
    )
  )
  or (visibility = 'private' and auth.uid() = author_id)
);

drop policy if exists "Couple members can create blogs" on blogs;
create policy "Couple members can create blogs"
on blogs for insert
to authenticated
with check (
  auth.uid() = author_id
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = blogs.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Authors can update own blogs" on blogs;
create policy "Authors can update own blogs"
on blogs for update
to authenticated
using (
  auth.uid() = author_id
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = blogs.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  auth.uid() = author_id
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = blogs.couple_id
      and cm.user_id = auth.uid()
  )
);
