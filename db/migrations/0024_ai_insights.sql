-- Migration 0024: AI insights storage
-- Stores generated insights per user. Reads/writes are scoped to the owning user.

create table if not exists ai_insights (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  source text not null default 'fallback' check (source in ('openai', 'fallback')),
  model text,
  input_summary jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_insights_user_created_idx
  on ai_insights(user_id, created_at desc);

create index if not exists ai_insights_couple_created_idx
  on ai_insights(couple_id, created_at desc);

alter table ai_insights enable row level security;

drop policy if exists "Users can read own AI insights" on ai_insights;
create policy "Users can read own AI insights"
on ai_insights for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own AI insights" on ai_insights;
create policy "Users can insert own AI insights"
on ai_insights for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from couple_members cm
    where cm.couple_id = ai_insights.couple_id
      and cm.user_id = auth.uid()
  )
);
