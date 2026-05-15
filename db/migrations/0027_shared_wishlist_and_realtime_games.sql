-- Migration 0027: shared wishlist, rewards, and realtime games

create table if not exists wishlist_items (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  created_by uuid not null references users(id) on delete cascade,
  desired_by uuid references users(id) on delete set null,
  title text not null,
  note text,
  category text not null default 'gift' check (category in ('gift', 'date', 'care', 'coupon')),
  status text not null default 'open' check (status in ('open', 'done', 'archived')),
  xp_cost integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists wishlist_reservations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references wishlist_items(id) on delete cascade,
  couple_id uuid not null references couples(id) on delete cascade,
  reserved_by uuid not null references users(id) on delete cascade,
  note text,
  status text not null default 'reserved' check (status in ('reserved', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, reserved_by)
);

create table if not exists couple_rewards (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  source_type text not null default 'game' check (source_type in ('game', 'mission', 'wishlist')),
  source_id uuid,
  xp_amount integer not null default 0,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists game_sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  game_type text not null check (game_type in ('couple_quiz', 'draw_guess', 'heart_ttt')),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'completed', 'cancelled')),
  created_by uuid not null references users(id) on delete cascade,
  current_turn_user_id uuid references users(id) on delete set null,
  winner_user_id uuid references users(id) on delete set null,
  round integer not null default 1,
  state jsonb not null default '{}'::jsonb,
  score jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists game_players (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  nickname text,
  score integer not null default 0,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (session_id, user_id)
);

create table if not exists game_moves (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references game_sessions(id) on delete cascade,
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  move_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wishlist_items_couple_created_idx
  on wishlist_items(couple_id, created_at desc);

create index if not exists wishlist_reservations_item_idx
  on wishlist_reservations(item_id, created_at desc);

create index if not exists couple_rewards_couple_created_idx
  on couple_rewards(couple_id, created_at desc);

create index if not exists game_sessions_couple_updated_idx
  on game_sessions(couple_id, updated_at desc);

create index if not exists game_players_session_idx
  on game_players(session_id);

create index if not exists game_moves_session_created_idx
  on game_moves(session_id, created_at);

alter table wishlist_items enable row level security;
alter table wishlist_reservations enable row level security;
alter table couple_rewards enable row level security;
alter table game_sessions enable row level security;
alter table game_players enable row level security;
alter table game_moves enable row level security;

drop policy if exists "Couple members can read wishlist items" on wishlist_items;
create policy "Couple members can read wishlist items"
on wishlist_items for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = wishlist_items.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can insert wishlist items" on wishlist_items;
create policy "Couple members can insert wishlist items"
on wishlist_items for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = wishlist_items.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can update wishlist items" on wishlist_items;
create policy "Couple members can update wishlist items"
on wishlist_items for update
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = wishlist_items.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = wishlist_items.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Creators can delete wishlist items" on wishlist_items;
create policy "Creators can delete wishlist items"
on wishlist_items for delete
to authenticated
using (created_by = auth.uid());

drop policy if exists "Users read own wishlist reservations only" on wishlist_reservations;
create policy "Users read own wishlist reservations only"
on wishlist_reservations for select
to authenticated
using (
  reserved_by = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = wishlist_reservations.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can insert wishlist reservations" on wishlist_reservations;
create policy "Couple members can insert wishlist reservations"
on wishlist_reservations for insert
to authenticated
with check (
  reserved_by = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = wishlist_reservations.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users update own wishlist reservations" on wishlist_reservations;
create policy "Users update own wishlist reservations"
on wishlist_reservations for update
to authenticated
using (reserved_by = auth.uid())
with check (reserved_by = auth.uid());

drop policy if exists "Users delete own wishlist reservations" on wishlist_reservations;
create policy "Users delete own wishlist reservations"
on wishlist_reservations for delete
to authenticated
using (reserved_by = auth.uid());

drop policy if exists "Couple members can read rewards" on couple_rewards;
create policy "Couple members can read rewards"
on couple_rewards for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = couple_rewards.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own rewards" on couple_rewards;
create policy "Users can insert own rewards"
on couple_rewards for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = couple_rewards.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read game sessions" on game_sessions;
create policy "Couple members can read game sessions"
on game_sessions for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = game_sessions.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can insert game sessions" on game_sessions;
create policy "Couple members can insert game sessions"
on game_sessions for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = game_sessions.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can update game sessions" on game_sessions;
create policy "Couple members can update game sessions"
on game_sessions for update
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = game_sessions.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = game_sessions.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Couple members can read game players" on game_players;
create policy "Couple members can read game players"
on game_players for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = game_players.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert self as game player" on game_players;
create policy "Users can insert self as game player"
on game_players for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = game_players.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users can update own game player row" on game_players;
create policy "Users can update own game player row"
on game_players for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Couple members can read game moves" on game_moves;
create policy "Couple members can read game moves"
on game_moves for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = game_moves.couple_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert own game moves" on game_moves;
create policy "Users can insert own game moves"
on game_moves for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = game_moves.couple_id
      and cm.user_id = auth.uid()
  )
);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'wishlist_items',
    'wishlist_reservations',
    'couple_rewards',
    'game_sessions',
    'game_players',
    'game_moves'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', tbl);
    exception
      when duplicate_object then null;
      when undefined_object then null;
    end;
  end loop;
end $$;
