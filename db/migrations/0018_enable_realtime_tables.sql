-- Migration 0018: Enable Supabase Realtime on required tables
-- Without this, Postgres Changes subscriptions receive NO events at all
-- even if the subscription code is correct.

-- Add tables to the supabase_realtime publication
-- (safe to run multiple times — IF NOT already member handles duplicates)

do $$
declare
  tbl text;
  tables text[] := array['moods', 'timeline_events', 'blogs', 'capsule_opens'];
begin
  foreach tbl in array tables loop
    -- Check if table is already in the publication
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table %I', tbl);
      raise notice 'Added % to supabase_realtime publication', tbl;
    else
      raise notice '% already in supabase_realtime publication', tbl;
    end if;
  end loop;
end $$;
