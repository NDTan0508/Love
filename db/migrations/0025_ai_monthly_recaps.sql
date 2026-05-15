-- Migration 0025: AI monthly recap storage
-- Stores one recap per user/couple/month. Reads and writes are scoped to the owning user.

create table if not exists ai_monthly_recaps (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  month text not null,
  source text not null default 'fallback' check (source in ('openai', 'fallback')),
  model text,
  input_summary jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, user_id, month)
);

create index if not exists ai_monthly_recaps_user_month_idx
  on ai_monthly_recaps(user_id, month desc);

create index if not exists ai_monthly_recaps_couple_month_idx
  on ai_monthly_recaps(couple_id, month desc);

alter table ai_monthly_recaps enable row level security;

drop policy if exists "Users can read own AI monthly recaps" on ai_monthly_recaps;
create policy "Users can read own AI monthly recaps"
on ai_monthly_recaps for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own AI monthly recaps" on ai_monthly_recaps;
create policy "Users can insert own AI monthly recaps"
on ai_monthly_recaps for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = ai_monthly_recaps.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own AI monthly recaps" on ai_monthly_recaps;
create policy "Users can update own AI monthly recaps"
on ai_monthly_recaps for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = ai_monthly_recaps.couple_id
      and cm.user_id = auth.uid()
  )
);
