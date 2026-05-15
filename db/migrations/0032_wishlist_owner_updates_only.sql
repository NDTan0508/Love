-- Migration 0032: only wishlist creators can update their own items

drop policy if exists "Couple members can update wishlist items" on wishlist_items;
drop policy if exists "Creators can update own wishlist items" on wishlist_items;
create policy "Creators can update own wishlist items"
on wishlist_items for update
to authenticated
using (
  created_by = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = wishlist_items.couple_id
      and cm.user_id = auth.uid()
  )
)
with check (
  created_by = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = wishlist_items.couple_id
      and cm.user_id = auth.uid()
  )
);
