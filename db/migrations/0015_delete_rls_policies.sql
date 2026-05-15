-- Migration 0015: Add DELETE RLS policies for blogs + memory_capsules
-- Root cause of silent delete failure: no delete policy → Supabase returns 200 but deletes 0 rows

-- Blog delete: author can delete own post within couple space
drop policy if exists "Authors can delete own blogs" on blogs;
create policy "Authors can delete own blogs"
on blogs for delete
to authenticated
using (
  auth.uid() = author_id
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = blogs.couple_id
      and cm.user_id = auth.uid()
  )
);

-- Capsule delete: creator can delete own capsule within couple space
drop policy if exists "Creators can delete own capsules" on memory_capsules;
create policy "Creators can delete own capsules"
on memory_capsules for delete
to authenticated
using (
  auth.uid() = creator_id
  and exists (
    select 1 from couple_members cm
    where cm.couple_id = memory_capsules.couple_id
      and cm.user_id = auth.uid()
  )
);
