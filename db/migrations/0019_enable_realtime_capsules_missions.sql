-- Migration 0019: Enable Realtime on memory_capsules and missions
-- Required for partner notifications when creating new capsules/missions

do $$
declare
  tbl text;
  tables text[] := array['memory_capsules', 'missions'];
begin
  foreach tbl in array tables loop
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
