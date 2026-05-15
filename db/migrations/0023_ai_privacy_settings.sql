-- Migration 0023: AI privacy gate before Sprint 8
-- AI insights are disabled by default until each user explicitly opts in.

create table if not exists ai_privacy_settings (
  user_id uuid primary key references users(id) on delete cascade,
  couple_id uuid not null references couples(id) on delete cascade,
  ai_insights_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists ai_privacy_settings_couple_idx
  on ai_privacy_settings(couple_id);

alter table ai_privacy_settings enable row level security;

drop policy if exists "Users can read own AI privacy settings" on ai_privacy_settings;
create policy "Users can read own AI privacy settings"
on ai_privacy_settings for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own AI privacy settings" on ai_privacy_settings;
create policy "Users can insert own AI privacy settings"
on ai_privacy_settings for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = ai_privacy_settings.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own AI privacy settings" on ai_privacy_settings;
create policy "Users can update own AI privacy settings"
on ai_privacy_settings for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = ai_privacy_settings.couple_id
      and cm.user_id = auth.uid()
  )
);
