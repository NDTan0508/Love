-- Migration 0030: personal wishlist wishes
-- Wishlist items now support an optional image and owner-controlled visibility.

alter table wishlist_items
  add column if not exists image_url text,
  add column if not exists visibility text not null default 'public';

alter table wishlist_items
  drop constraint if exists wishlist_items_visibility_check;

alter table wishlist_items
  add constraint wishlist_items_visibility_check
  check (visibility in ('public', 'secret'));

create index if not exists wishlist_items_owner_created_idx
  on wishlist_items(created_by, created_at desc);

drop policy if exists "Couple members can read wishlist items" on wishlist_items;
create policy "Owners and partners can read visible wishlist items"
on wishlist_items for select
to authenticated
using (
  exists (
    select 1 from couple_members cm
    where cm.couple_id = wishlist_items.couple_id
      and cm.user_id = auth.uid()
  )
  and (
    wishlist_items.created_by = auth.uid()
    or wishlist_items.visibility = 'public'
  )
);

drop policy if exists "Couple members can update wishlist items" on wishlist_items;
create policy "Creators can update own wishlist items"
on wishlist_items for update
to authenticated
using (created_by = auth.uid())
with check (
  created_by = auth.uid()
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = wishlist_items.couple_id
      and cm.user_id = auth.uid()
  )
);
