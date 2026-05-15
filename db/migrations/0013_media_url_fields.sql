-- Migration: add media_url to blogs and memory_capsules
-- Sprint 6 post-closeout — media upload feature

alter table blogs
  add column if not exists media_url text;

alter table memory_capsules
  add column if not exists media_url text;
