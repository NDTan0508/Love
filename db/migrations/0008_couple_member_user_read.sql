-- Migration 0008: allow couple members to read each other's basic user profile

drop policy if exists "Couple members can read related user rows" on users;
create policy "Couple members can read related user rows"
on users for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from couple_members as target_member
    join couple_members as current_member
      on current_member.couple_id = target_member.couple_id
    where target_member.user_id = users.id
      and current_member.user_id = auth.uid()
  )
);
