-- Migration 0022: notification inbox dismissal support
-- The floating bell can now hide DB-backed notifications per recipient.

alter table notifications
  add column if not exists dismissed_at timestamptz;

create index if not exists notifications_user_dismissed_scheduled_idx
  on notifications(user_id, dismissed_at, scheduled_for desc);
