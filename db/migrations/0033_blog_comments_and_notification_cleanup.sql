-- Migration 0033: add blog comments, remove reactions, and keep realtime notifications scoped

do $$
begin
  begin
    alter publication supabase_realtime drop table reactions;
  exception
    when undefined_object then null;
    when undefined_table then null;
  end;
end $$;

drop table if exists reactions cascade;

create table if not exists blog_comments (
  id uuid primary key default gen_random_uuid(),
  blog_id uuid not null references blogs(id) on delete cascade,
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  author text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists blog_comments_blog_created_idx
  on blog_comments(blog_id, created_at asc);

create index if not exists blog_comments_couple_created_idx
  on blog_comments(couple_id, created_at desc);

alter table blog_comments enable row level security;

drop policy if exists "Couple members can read blog comments" on blog_comments;
create policy "Couple members can read blog comments"
on blog_comments for select
to authenticated
using (
  exists (
    select 1
    from blogs b
    join couple_members cm on cm.couple_id = b.couple_id
    where b.id = blog_comments.blog_id
      and b.couple_id = blog_comments.couple_id
      and cm.user_id = auth.uid()
      and (b.visibility = 'couple' or b.author_id = auth.uid())
  )
);

drop policy if exists "Couple members can create own blog comments" on blog_comments;
create policy "Couple members can create own blog comments"
on blog_comments for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from blogs b
    join couple_members cm on cm.couple_id = b.couple_id
    where b.id = blog_comments.blog_id
      and b.couple_id = blog_comments.couple_id
      and cm.user_id = auth.uid()
      and (b.visibility = 'couple' or b.author_id = auth.uid())
  )
);

drop policy if exists "Users can delete own blog comments" on blog_comments;
create policy "Users can delete own blog comments"
on blog_comments for delete
to authenticated
using (
  user_id = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = blog_comments.couple_id
      and cm.user_id = auth.uid()
  )
);

alter table comments replica identity full;
alter table blog_comments replica identity full;
alter table wishlist_items replica identity full;
alter table game_sessions replica identity full;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'comments',
    'blog_comments',
    'wishlist_items',
    'game_sessions'
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
