-- Unified reminder table. Mirrors reminder_feed (the live UNION across
-- source tables, see reminderSources.js) but is a real persisted table so
-- it can carry per-item state the source tables don't have (notify/mute/
-- snooze). title/due_date/family_member_id/priority/status are always
-- overwritten by the sync in reminderRepository.js — never hand-edited.
CREATE TABLE IF NOT EXISTS reminder (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  source               TEXT NOT NULL,        -- e.g. 'event','goal','renewal','appointment','todo_task','routine'
  source_id            INTEGER NOT NULL,
  title                TEXT NOT NULL,
  window_start         TEXT NOT NULL,        -- due_date minus lead days; drives when this starts appearing
  due_date             TEXT NOT NULL,
  family_member_id     INTEGER,
  priority             TEXT NOT NULL DEFAULT 'low',  -- low | medium | high
  status               TEXT,                 -- raw copy of source's status column, display-only
  completed_at         TEXT,                 -- NULL = active/live; set = history, filtered from live feed
  expires_at           TEXT,
  notify               INTEGER NOT NULL DEFAULT 0,   -- placeholder, not wired up yet
  notify_channel       TEXT,                          -- placeholder, not wired up yet
  mute                 INTEGER NOT NULL DEFAULT 0,   -- placeholder, not wired up yet
  snooze_until         TEXT,                          -- placeholder, not wired up yet
  created_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_reminder_due_date ON reminder(due_date);
CREATE INDEX IF NOT EXISTS idx_reminder_completed_at ON reminder(completed_at);
CREATE INDEX IF NOT EXISTS idx_reminder_source ON reminder(source, source_id);
