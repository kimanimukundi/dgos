-- Phase 8: Notifications Center
-- Notifications themselves are computed live from existing tables.
-- This table only tracks which synthetic notification keys a user has dismissed/read.

CREATE TABLE IF NOT EXISTS notification_reads (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER REFERENCES staff(id),
  notification_key VARCHAR(255) NOT NULL,
  -- e.g. 'memo:42', 'workflow_step:7:2', 'task:15', 'ticket:3'
  read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, notification_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_staff ON notification_reads(staff_id);
