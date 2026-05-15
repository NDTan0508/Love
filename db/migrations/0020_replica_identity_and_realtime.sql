-- Migration 0020: REPLICA IDENTITY FULL + enable realtime on reactions/comments
-- REPLICA IDENTITY FULL allows DELETE events to include full row data (title, etc)
-- Without this, DELETE events only include the primary key

alter table blogs replica identity full;
alter table timeline_events replica identity full;
alter table memory_capsules replica identity full;
alter table missions replica identity full;

-- Enable realtime on reactions and comments tables
do $$
declare
  tbl text;
  tables text[] := array['reactions', 'comments', 'mission_progress'];
begin
  foreach tbl in array tables loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table %I', tbl);
      raise notice 'Added % to supabase_realtime', tbl;
    else
      raise notice '% already in supabase_realtime', tbl;
    end if;
  end loop;
end $$;
