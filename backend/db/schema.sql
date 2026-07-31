-- Routine module schema (SQLite). MySQL version to follow when you migrate --
-- DB_ENGINE=mysql is selected.

CREATE TABLE IF NOT EXISTS daily_routine (
  routine_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  task_name      TEXT NOT NULL,
  person         TEXT NOT NULL,
  frequency      TEXT NOT NULL CHECK(frequency IN ('daily','weekly')),
  day_of_week    TEXT,             -- comma list e.g. 'MON,WED,FRI', NULL for daily
  task_time      TEXT NOT NULL,    -- 'HH:MM' 24h
  mute           INTEGER DEFAULT 0,
  announce       INTEGER DEFAULT 0,
  active         INTEGER DEFAULT 1 -- soft-delete flag
);

CREATE TABLE IF NOT EXISTS daily_routine_temp (
  temp_id        INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id     INTEGER NOT NULL,
  task_name      TEXT NOT NULL,
  person         TEXT NOT NULL,
  task_time      TEXT NOT NULL,
  status         TEXT DEFAULT 'new' CHECK(status IN ('new','done','skipped')),
  mute           INTEGER DEFAULT 0,
  snoozed_until  TEXT,             -- ISO timestamp, NULL if not snoozed
  announce       INTEGER DEFAULT 0,
  FOREIGN KEY(routine_id) REFERENCES daily_routine(routine_id)
);

CREATE TABLE IF NOT EXISTS daily_routine_log (
  log_id         INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id     INTEGER NOT NULL,
  task_name      TEXT NOT NULL,
  person         TEXT NOT NULL,
  log_date       TEXT NOT NULL,    -- 'YYYY-MM-DD'
  status         TEXT NOT NULL,    -- 'done' | 'skipped' | 'no_action'
  reason         TEXT,             -- lazy/tired/office work/guest/outdoor/no reason/NO ACTION TAKEN
  FOREIGN KEY(routine_id) REFERENCES daily_routine(routine_id)
);

-- Tiny key/value table so the daily reset is idempotent no matter how many
-- times/mechanisms try to trigger it (launchd, node-cron backup, manual call)
CREATE TABLE IF NOT EXISTS app_state (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Dummy Data 
INSERT INTO daily_routine (task_name, person, frequency, task_time)
VALUES ('Brush teeth', 'Kid1', 'daily', '08:00');

INSERT INTO daily_routine (task_name, person, frequency, task_time)
VALUES ('Homework', 'Kid1', 'daily', '16:00');

INSERT INTO daily_routine_temp(routine_id,task_name, person, task_time,status)
VALUES (1,'Brush teeth', 'Kid1', '08:00', 'new');

INSERT INTO daily_routine_temp(routine_id,task_name, person, task_time,status)
VALUES (1,'Homework', 'Kid1', '16:00', 'new');


select * from daily_routine;

-- Gemini
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    first_name TEXT,
    last_name TEXT,    
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

