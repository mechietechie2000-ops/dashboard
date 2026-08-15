-- ---------------------------------------------------------------------
-- reminder: a persisted mirror of the live UNION across the 5 source
-- tables (see reminderSources.js), kept in sync on every source-row
-- write (see sectionRepository.js / routineRepository.js), plus a daily
-- syncAllReminders() backup job.
--
-- Source of truth stays in the source tables — title/due_date/
-- family_member_id/priority/status here are always overwritten by the
-- sync, never hand-edited. What this table adds that no source table has:
-- notify/notify_channel/mute/snooze_until (placeholders, no behavior
-- wired up yet) and completed_at (history: completed rows stay here,
-- just filtered out of the live view by completed_at IS NULL).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminder (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type       TEXT NOT NULL,          -- 'event' | 'goal' | 'renewal' | 'appointment' | 'todo_task' | 'routine'
  source_id         INTEGER NOT NULL,       -- id on the source table
  title             TEXT NOT NULL,
  window_start      TEXT,                   -- due_date - lead_days; when this should start appearing
  due_date          TEXT NOT NULL,
  family_member_id  INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
  priority          TEXT NOT NULL DEFAULT 'low',  -- normalized low | medium | high
  status            TEXT,                   -- raw copy of the source's own status column, display only
  completed_at      TEXT,                   -- NULL = still live. Set = history, hidden from the live feed.
  expires_at        TEXT,                   -- reserved for future use, not currently populated
  notify            INTEGER NOT NULL DEFAULT 0 CHECK (notify IN (0, 1)),
  notify_channel     TEXT,                   -- e.g. 'push' | 'email' | 'sms' | 'voice', future
  mute              INTEGER NOT NULL DEFAULT 0 CHECK (mute IN (0, 1)),
  snooze_until      TEXT,
  created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_reminder_completed_due ON reminder(completed_at, due_date);
CREATE INDEX IF NOT EXISTS idx_reminder_source ON reminder(source_type, source_id);
