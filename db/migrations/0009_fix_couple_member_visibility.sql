-- Migration 0009: restore safe same-couple visibility for user labels

create or replace function public.are_users_in_same_couple(user_a uuid, user_b uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from couple_members cm1
    join couple_members cm2
      on cm1.couple_id = cm2.couple_id
    where cm1.user_id = user_a
      and cm2.user_id = user_b
  );
$$;

revoke all on function public.are_users_in_same_couple(uuid, uuid) from public;
grant execute on function public.are_users_in_same_couple(uuid, uuid) to authenticated;

drop policy if exists "Members can read couple membership" on couple_members;
create policy "Members can read couple membership"
on couple_members for select
to authenticated
using (
  public.are_users_in_same_couple(auth.uid(), user_id)
);

drop policy if exists "Couple members can read related user rows" on users;
create policy "Couple members can read related user rows"
on users for select
to authenticated
using (
  auth.uid() = id
  or public.are_users_in_same_couple(auth.uid(), id)
);
