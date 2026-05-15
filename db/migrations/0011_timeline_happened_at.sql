alter table timeline_events
  add column if not exists happened_at timestamptz;

update timeline_events
set happened_at = created_at
where happened_at is null;

alter table timeline_events
  alter column happened_at set default now(),
  alter column happened_at set not null;

create index if not exists timeline_events_happened_at_idx on timeline_events(happened_at desc);
