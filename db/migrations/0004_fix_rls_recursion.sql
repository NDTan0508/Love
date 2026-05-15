-- Migration 0004: fix recursive RLS policy on couple_members
-- The previous policy queried couple_members from inside its own policy,
-- which caused infinite recursion when timeline/couple policies checked membership.

drop policy if exists "Members can read couple membership" on couple_members;
create policy "Members can read couple membership"
on couple_members for select
to authenticated
using (
  auth.uid() = user_id
);
