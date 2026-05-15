-- Migration 0026: AI bonding features
-- Daily prompts, user responses, saved rituals, and saved memory stories.

create table if not exists ai_daily_prompts (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  prompt_date date not null,
  source text not null default 'fallback' check (source in ('openai', 'fallback')),
  model text,
  input_summary jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (couple_id, prompt_date)
);

create table if not exists ai_daily_prompt_responses (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references ai_daily_prompts(id) on delete cascade,
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  response text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prompt_id, user_id)
);

create table if not exists ai_rituals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  source text not null default 'fallback' check (source in ('openai', 'fallback')),
  model text,
  input_summary jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_memory_stories (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  period text not null default 'recent',
  source text not null default 'fallback' check (source in ('openai', 'fallback')),
  model text,
  input_summary jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ai_daily_prompts_couple_date_idx
  on ai_daily_prompts(couple_id, prompt_date desc);

create index if not exists ai_daily_prompt_responses_prompt_idx
  on ai_daily_prompt_responses(prompt_id);

create index if not exists ai_rituals_couple_created_idx
  on ai_rituals(couple_id, created_at desc);

create index if not exists ai_memory_stories_couple_created_idx
  on ai_memory_stories(couple_id, created_at desc);

alter table ai_daily_prompts enable row level security;
alter table ai_daily_prompt_responses enable row level security;
alter table ai_rituals enable row level security;
alter table ai_memory_stories enable row level security;

drop policy if exists "Couple members can read AI daily prompts" on ai_daily_prompts;
create policy "Couple members can read AI daily prompts"
on ai_daily_prompts for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = ai_daily_prompts.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can insert AI daily prompts" on ai_daily_prompts;
create policy "Couple members can insert AI daily prompts"
on ai_daily_prompts for insert
to authenticated
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = ai_daily_prompts.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can update AI daily prompts" on ai_daily_prompts;
create policy "Couple members can update AI daily prompts"
on ai_daily_prompts for update
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = ai_daily_prompts.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = ai_daily_prompts.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read AI prompt responses" on ai_daily_prompt_responses;
create policy "Couple members can read AI prompt responses"
on ai_daily_prompt_responses for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = ai_daily_prompt_responses.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own AI prompt response" on ai_daily_prompt_responses;
create policy "Users can insert own AI prompt response"
on ai_daily_prompt_responses for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = ai_daily_prompt_responses.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own AI prompt response" on ai_daily_prompt_responses;
create policy "Users can update own AI prompt response"
on ai_daily_prompt_responses for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = ai_daily_prompt_responses.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read AI rituals" on ai_rituals;
create policy "Couple members can read AI rituals"
on ai_rituals for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = ai_rituals.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert AI rituals" on ai_rituals;
create policy "Users can insert AI rituals"
on ai_rituals for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = ai_rituals.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read AI memory stories" on ai_memory_stories;
create policy "Couple members can read AI memory stories"
on ai_memory_stories for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = ai_memory_stories.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert AI memory stories" on ai_memory_stories;
create policy "Users can insert AI memory stories"
on ai_memory_stories for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = ai_memory_stories.couple_id
      and cm.user_id = auth.uid()
  )
);
