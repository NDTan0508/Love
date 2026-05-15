-- Migration 0014: Storage RLS policies for couple-media bucket
-- Run this in Supabase SQL Editor after creating the 'couple-media' bucket

-- Allow authenticated users to upload their own media
insert into storage.buckets (id, name, public)
values ('couple-media', 'couple-media', true)
on conflict (id) do nothing;

-- Policy: authenticated users can upload to their own folder (userId/...)
create policy "Authenticated users can upload media"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'couple-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: anyone can read public media
create policy "Public can read couple-media"
on storage.objects for select
to public
using (bucket_id = 'couple-media');

-- Policy: users can delete their own uploads
create policy "Users can delete own media"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'couple-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
