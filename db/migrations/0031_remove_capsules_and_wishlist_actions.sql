-- Migration 0031: remove capsule feature and enable wishlist achievement actions

do $$
begin
  begin
    alter publication supabase_realtime drop table capsule_opens;
  exception
    when undefined_object then null;
    when undefined_table then null;
  end;

  begin
    alter publication supabase_realtime drop table memory_capsules;
  exception
    when undefined_object then null;
    when undefined_table then null;
  end;
end $$;

drop table if exists capsule_opens cascade;
drop table if exists memory_capsules cascade;

alter table activity_events
  drop constraint if exists activity_events_entity_type_check;

delete from activity_events
where entity_type = 'capsule';

alter table activity_events
  add constraint activity_events_entity_type_check
  check (entity_type in ('timeline', 'blog'));

drop policy if exists "Creators can update own wishlist items" on wishlist_items;
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
