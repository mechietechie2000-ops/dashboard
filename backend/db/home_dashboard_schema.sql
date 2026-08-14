-- Home Dashboard schema.
-- ************************************************************************
-- Completed: family_members, app_state, users, push_notification, uploads, calendar_events, goal_steps (no action needed)

-- Completed but need updated forms (+/-/edits on dashboard) : goals, renewals, daily_routine, events 
-- problems; appointments, doctor_appointment (form needs update)
-- Leave these tables untouched: bills/library_xxx, / activity ,  sports, meals, 
-- ************************************************************************

-- Ques: if I use famil_member_id, how I'll show the member name on the frontend?

-- Enforce Foreign Keys (Run this in your app connection)
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- 1. Shared reference table: family members
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family_members (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name      TEXT NOT NULL,
    last_name       TEXT,
    date_of_birth   TEXT,                              -- ISO-8601: YYYY-MM-DD
    relationship    TEXT,                              -- 'self', 'spouse', 'child', etc.
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 2. Goals
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    family_member_id    INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
    category            TEXT NOT NULL,  -- financial | health | education | home | personal | other
    title               TEXT NOT NULL,
    description         TEXT,
    goal_type           TEXT, -- short_term | long_term 
    target_year			    INTEGER,
    target_quarter		  TEXT,
    target_value        NUMERIC,
    current_value       NUMERIC NOT NULL DEFAULT 0,
    unit                TEXT, -- $, %, lbs, miles, books, courses, etc.
    target_date         TEXT, -- ISO-8601: YYYY-MM-DD
    status              TEXT NOT NULL DEFAULT 'todo', -- in_progress | completed | abandoned | paused
    completed_on        TEXT,
    priority            TEXT NOT NULL DEFAULT 'low',
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    start_date          TEXT
);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status, target_date);

-- ---------------------------------------------------------------------
-- 3. Goal_steps Child table of Goals
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goal_steps (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id             INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    description         TEXT,
    sequence            INTEGER NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'pending',  -- pending | in_progress | completed | skipped
    due_date            TEXT,
    completed_on        TEXT,
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_goal_steps_goal ON goal_steps(goal_id, sequence);
CREATE INDEX IF NOT EXISTS idx_goal_steps_status ON goal_steps(status, due_date);

-- ---------------------------------------------------------------------
-- 4. Renewals (insurance, passport, license, subscriptions, etc.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS renewals (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  family_member_id        INTEGER REFERENCES family_members(id),
  renewal_type            TEXT,                 -- subscription | insurance | document | registration | inspection | maintenance | membership | other
  category                TEXT NOT NULL,        -- Vehicle | personal | professional
  subcategory             TEXT,                 -- Visa -H1, I797, passport, driving license
  title                   TEXT NOT NULL,        -- "Auto Insurance - Honda Civic"
  provider_id             TEXT,                 -- will be used later, when providers table is created and provide name may be replaced by provider_id in the table  
  provider_name           TEXT,                 -- can you add dropdown for provider_name instead of typing in the textbox?
  start_date              DATE,
  expiry_date             DATE NOT NULL,
  amount                  REAL CHECK (amount IS NULL OR amount > 0),
  auto_renew              INTEGER NOT NULL DEFAULT 0 CHECK (auto_renew IN (0, 1)),
  reminder_days_before    INTEGER NOT NULL DEFAULT 30,
  notes                   TEXT,
  status                  TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'renewed', 'expired', 'cancelled')),
  created_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  renewal_frequency       INTEGER           --monthly | quarterly | 6_months | yearly | 2_years | 5_years | 10_years | one_time | custom
);

CREATE INDEX IF NOT EXISTS idx_renewals_expiry ON renewals(expiry_date);
CREATE INDEX IF NOT EXISTS idx_renewals_category ON renewals(category);

-- ---------------------------------------------------------------------
-- Tiny key/value table so the daily reset is idempotent no matter how many
-- times/mechanisms try to trigger it (launchd, node-cron backup, manual call)
-- ---------------------------------------------------------------------
-- 5. app_state
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS app_state (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- ---------------------------------------------------------------------
-- 6. users 
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    first_name    TEXT,
    last_name     TEXT,
    is_admin      TEXT NOT NULL DEFAULT 'N'
);

-- ---------------------------------------------------------------------
-- 7. push_subscriptions
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 8. push_subscriptions
-- Document uploads (DigiLocker feature)
-- stored_filename/relative_path are server-generated; never derived from
-- the client-supplied original filename. original_filename is kept as
-- metadata only, for display purposes.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS uploads (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  original_filename   TEXT NOT NULL,
  stored_filename      TEXT NOT NULL UNIQUE,
  relative_path        TEXT NOT NULL,               -- relative to backend/uploads, never absolute
  mime_type             TEXT NOT NULL,
  size_bytes            INTEGER NOT NULL CHECK (size_bytes > 0),
  category              TEXT NOT NULL,
  subcategory           TEXT,
  person_id             INTEGER REFERENCES family_members(id),
  scope                 TEXT NOT NULL DEFAULT 'individual' CHECK (scope IN ('individual', 'joint')),
  issue_date            TEXT,                       -- ISO-8601: YYYY-MM-DD, NULL = N/A
  expiry_date           TEXT,                       -- ISO-8601: YYYY-MM-DD, NULL = N/A
  status                TEXT NOT NULL DEFAULT 'current' CHECK (status IN ('current', 'archived')),
  uploaded_by           INTEGER NOT NULL REFERENCES users(id),
  uploaded_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_uploads_person_status ON uploads(person_id, status);
CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_by ON uploads(uploaded_by);


-- ---------------------------------------------------------------------
-- 9. calendar_events
-- ---------------------------------------------------------------------

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id          TEXT PRIMARY KEY,          -- Matches FullCalendar ID (e.g. string/uuid)
    title       TEXT NOT NULL,          -- Event title
    start       TEXT NOT NULL,          -- ISO 8601 String: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    end         TEXT,                     -- ISO 8601 String (Optional)
    all_day     INTEGER DEFAULT 1,    -- 1 for true, 0 for false
    category    TEXT DEFAULT 'general', -- e.g., 'holiday', 'birthday', 'work'
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimized calendar queries across date ranges
CREATE INDEX IF NOT EXISTS idx_calendar_start ON calendar_events(start);
CREATE INDEX IF NOT EXISTS idx_calendar_end ON calendar_events(end);

-- ---------------------------------------------------------------------
-- 10. daily_routine
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_routine (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  family_member_id    INTEGER REFERENCES family_members(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,   -- "Morning routine"
  frequency           TEXT NOT NULL CHECK(frequency IN ('daily','weekly')),
  day_of_week         TEXT,             -- comma list e.g. 'MON,WED,FRI', NULL for daily
  scheduled_time      TEXT NOT NULL,    -- 'HH:MM' 24h
  mute                INTEGER DEFAULT 0,
  announce            INTEGER DEFAULT 0,
  active              INTEGER DEFAULT 1, -- soft-delete flag
  description         TEXT            -- "Wake up, brush teeth, breakfast"
);
CREATE INDEX IF NOT EXISTS idx_routines_active ON daily_routine(active, scheduled_time);


-- ---------------------------------------------------------------------
-- 11. daily_routine_temp
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_routine_temp (
  id                INTEGER PRIMARY KEY,
  routine_id        INTEGER NOT NULL,
  title             TEXT NOT NULL,
  family_member_id  INTEGER,
  scheduled_time    TEXT NOT NULL,
  status            TEXT DEFAULT 'new' CHECK(status IN ('new','done','skipped')),
  mute              INTEGER DEFAULT 0,
  snoozed_until     TEXT,             -- ISO timestamp, NULL if not snoozed
  announce          INTEGER DEFAULT 0,
  FOREIGN KEY(routine_id) REFERENCES daily_routine(id)
);

-- ---------------------------------------------------------------------
-- 12. daily_routine_log
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_routine_log (
  log_id         INTEGER PRIMARY KEY AUTOINCREMENT,
  routine_id     INTEGER NOT NULL,
  title          TEXT NOT NULL,
  person         TEXT NOT NULL,
  family_member_id INTEGER REFERENCES family_members(id),   -- ADD THIS
  log_date       TEXT NOT NULL,
  status         TEXT NOT NULL,
  reason         TEXT,
  FOREIGN KEY(routine_id) REFERENCES daily_routine(id)
);

-- ---------------------------------------------------------------------
-- 13. Events (Birthdays, Anniversaries)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    person_name            TEXT NOT NULL,
    title                  TEXT,              -- "Mom's Birthday"
    event_type             TEXT NOT NULL CHECK (event_type IN ('birthday', 'anniversary', 'other')),
    event_date             TEXT NOT NULL,              -- ISO-8601: YYYY-MM-DD
    is_recurring_yearly    INTEGER NOT NULL DEFAULT 1 CHECK (is_recurring_yearly IN (0, 1)),
    notes                  TEXT,
    active                 INTEGER NOT NULL DEFAULT 1,     -- soft-delete flag
    created_at             TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);



-- ---------------------------------------------------------------------
-- 14. Appointments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    family_member_id        INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
    category                TEXT NOT NULL,      -- 'doctor', 'auto', 'personal', 'other', 'exam'
    title                   TEXT NOT NULL,             -- "Dentist - Dr. Smith"
    provider_name           TEXT, -- e.g., 'Walmart', 'Dr. Smith', 'Kia Service'
    appointment_datetime    TEXT NOT NULL,             -- ISO-8601: YYYY-MM-DD HH:MM:SS
    notes                   TEXT, -- location, contact number etc
    status                  TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | completed | cancelled
    reminder_days_before    INTEGER DEFAULT 7 CHECK (reminder_days_before >= 0),
    reminder_sent           INTEGER DEFAULT 0 CHECK (reminder_sent IN (0, 1)), -- Boolean flag (0=False, 1=True)
    amount                  REAL DEFAULT 0.00 CHECK (amount >= 0),
    created_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(status, appointment_datetime);

-- Indexes for fast querying (by upcoming date, category, and person)
-- CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(appointment_datetime);
-- CREATE INDEX IF NOT EXISTS idx_appointments_category ON appointments(category);
-- CREATE INDEX IF NOT EXISTS idx_appointments_person ON appointments(family_member_id);

-- ---------------------------------------------------------------------
-- 15. Todo Task
-- Column names follow the lower_snake_case convention used by every other
-- table in this file (daily_routine, appointments, renewals, etc.) rather
-- than the CamelCase/ALL_CAPS spellings from the requirements doc
-- (Title -> title, Target_Date -> target_date, StartDate -> start_date,
-- Desc -> description, to match the rest of the schema instead of
-- introducing a one-off style).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS todo_task (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    family_member_id    INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
    title               TEXT NOT NULL,
    priority            TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    description         TEXT,
    category            TEXT,                       -- personal | home | financial | health | kids | auto | other
    status              TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'blocked', 'done')),
    target_date         TEXT,                       -- ISO-8601: YYYY-MM-DD
    blocker             TEXT,
    notes               TEXT,
    start_date          TEXT,                       -- ISO-8601: YYYY-MM-DD
    completion_date     TEXT,                       -- ISO-8601: YYYY-MM-DD
    entry_date          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_todo_task_status_target ON todo_task(status, target_date);
CREATE INDEX IF NOT EXISTS idx_todo_task_family_member ON todo_task(family_member_id);

-- ---------------------------------------------------------------------
-- 16. Todo Task History
-- Append-only log of status changes on todo_task, kept for report
-- generation (e.g. "how long did this sit in Blocked"). Populated
-- automatically by the trigger below so the generic sectionRepository
-- (which only knows how to do plain INSERT/UPDATE/DELETE) never has to
-- know this table exists.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS todo_task_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id       INTEGER NOT NULL REFERENCES todo_task(id) ON DELETE CASCADE,
    old_status    TEXT,
    new_status    TEXT NOT NULL,
    changed_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_todo_task_history_todo ON todo_task_history(todo_id, changed_at);

CREATE TRIGGER IF NOT EXISTS trg_todo_task_status_history
AFTER UPDATE OF status ON todo_task
WHEN OLD.status IS NOT NEW.status
BEGIN
    INSERT INTO todo_task_history (todo_id, old_status, new_status)
    VALUES (OLD.id, OLD.status, NEW.status);
END;

-- SQLite has recursive_triggers OFF by default, so this can't re-fire
-- itself or trg_todo_task_status_history above.
CREATE TRIGGER IF NOT EXISTS trg_todo_task_updated_at
AFTER UPDATE ON todo_task
WHEN OLD.updated_at IS NEW.updated_at
BEGIN
    UPDATE todo_task SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
