-- Migration 0029: AI is always enabled
-- The app no longer exposes an AI privacy opt-in toggle. Keep the legacy table
-- permissive so older rows cannot block AI routes if referenced by old clients.

alter table ai_privacy_settings
  alter column ai_insights_enabled set default true;

update ai_privacy_settings
set ai_insights_enabled = true,
    updated_at = now()
where ai_insights_enabled = false;
