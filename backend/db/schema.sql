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
/*
INSERT INTO daily_routine (task_name, person, frequency, task_time)
VALUES ('Brush teeth', 'Kid1', 'daily', '08:00');

INSERT INTO daily_routine (task_name, person, frequency, task_time)
VALUES ('Homework', 'Kid1', 'daily', '16:00');

INSERT INTO daily_routine_temp(routine_id,task_name, person, task_time,status)
VALUES (1,'Brush teeth', 'Kid1', '08:00', 'new');

INSERT INTO daily_routine_temp(routine_id,task_name, person, task_time,status)
VALUES (1,'Homework', 'Kid1', '16:00', 'new');
*/

-- select * from daily_routine;

-- Gemini
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    first_name TEXT,
    last_name TEXT
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

-- =====================================================================
-- Home Dashboard schema
-- Postgres syntax (SERIAL / TIMESTAMP). For MySQL: swap SERIAL -> INT
-- AUTO_INCREMENT, TIMESTAMP defaults use CURRENT_TIMESTAMP the same way.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Shared reference table: family members are referenced from almost
-- every section below (whose routine, whose appointment, etc.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS family_members (
    id              SERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100),
    date_of_birth   DATE,
    relationship    VARCHAR(50),        -- 'self', 'spouse', 'child', etc.
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- 1. Routine
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routines (
    id                  SERIAL PRIMARY KEY,
    family_member_id    INT REFERENCES family_members(id) ON DELETE CASCADE,
    title               VARCHAR(150) NOT NULL,   -- "Morning routine"
    description         TEXT,                     -- "Wake up, brush teeth, breakfast"
    scheduled_time      TIME,                     -- 07:00
    days_of_week        VARCHAR(20),              -- CSV: 'Mon,Tue,Wed,Thu,Fri'
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_routines_active ON routines(is_active, scheduled_time);

-- ---------------------------------------------------------------------
-- 2. Reminders
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
    id                  SERIAL PRIMARY KEY,
    family_member_id    INT REFERENCES family_members(id) ON DELETE SET NULL,
    title               VARCHAR(150) NOT NULL,
    notes               TEXT,
    due_date            DATE,
    priority            VARCHAR(10) NOT NULL DEFAULT 'medium',  -- low | medium | high
    is_completed        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(is_completed, due_date);

-- ---------------------------------------------------------------------
-- 3. Goals
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
    id                  SERIAL PRIMARY KEY,
    family_member_id    INT REFERENCES family_members(id) ON DELETE SET NULL,
    title               VARCHAR(150) NOT NULL,
    description         TEXT,
    target_value        DECIMAL(12,2),           -- e.g. 5000.00
    current_value       DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit                VARCHAR(20),              -- '$', '%', 'lbs', 'books', etc.
    target_date         DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- in_progress | completed | abandoned
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status, target_date);

-- ---------------------------------------------------------------------
-- 4. Events (Birthdays, Anniversaries)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id                     SERIAL PRIMARY KEY,
    family_member_id       INT REFERENCES family_members(id) ON DELETE SET NULL,
    title                  VARCHAR(150) NOT NULL,     -- "Mom's Birthday"
    event_type             VARCHAR(30) NOT NULL,      -- birthday | anniversary | other
    event_date             DATE NOT NULL,
    is_recurring_yearly    BOOLEAN NOT NULL DEFAULT TRUE,
    notes                  TEXT,
    created_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

-- ---------------------------------------------------------------------
-- 5. Appointments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id                      SERIAL PRIMARY KEY,
    family_member_id        INT REFERENCES family_members(id) ON DELETE SET NULL,
    title                   VARCHAR(150) NOT NULL,    -- "Dentist - Dr. Smith"
    provider_name           VARCHAR(150),
    appointment_type        VARCHAR(50),               -- medical | dental | vet | other
    appointment_datetime    TIMESTAMP NOT NULL,
    location                VARCHAR(200),
    notes                   TEXT,
    status                  VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled | completed | cancelled
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(status, appointment_datetime);

-- ---------------------------------------------------------------------
-- 6. Renewals (insurance, passport, license, subscriptions, etc.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS renewals (
    id                      SERIAL PRIMARY KEY,
    family_member_id        INT REFERENCES family_members(id) ON DELETE SET NULL,
    title                   VARCHAR(150) NOT NULL,   -- "Auto Insurance"
    renewal_type            VARCHAR(50),              -- insurance | passport | license | subscription | other
    provider_name           VARCHAR(150),
    expiry_date             DATE NOT NULL,
    reminder_days_before    INT NOT NULL DEFAULT 30,
    notes                   TEXT,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_renewals_expiry ON renewals(expiry_date);

-- ---------------------------------------------------------------------
-- 7. Upcoming Payments / Bills
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
    id                      SERIAL PRIMARY KEY,
    title                   VARCHAR(150) NOT NULL,   -- "Electricity Bill"
    provider_name           VARCHAR(150),             -- "ConEd"
    amount                  DECIMAL(10,2) NOT NULL,
    due_date                DATE NOT NULL,
    is_recurring            BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_interval     VARCHAR(20),              -- monthly | quarterly | annual
    is_paid                 BOOLEAN NOT NULL DEFAULT FALSE,
    paid_date               DATE,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bills_due ON bills(is_paid, due_date);

-- ---------------------------------------------------------------------
-- 8. Extra Curriculum Registrations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extracurricular_registrations (
    id                      SERIAL PRIMARY KEY,
    family_member_id        INT REFERENCES family_members(id) ON DELETE CASCADE,
    activity_name           VARCHAR(150) NOT NULL,   -- "Swimming Lessons"
    provider_name           VARCHAR(150),
    registration_deadline   DATE,
    season_start_date       DATE,
    season_end_date         DATE,
    cost                    DECIMAL(10,2),
    status                  VARCHAR(20) NOT NULL DEFAULT 'open',  -- open | registered | closed
    notes                   TEXT,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_extracurricular_deadline ON extracurricular_registrations(status, registration_deadline);

-- ---------------------------------------------------------------------
-- 9. Library Return Day
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS library_checkouts (
    id                      SERIAL PRIMARY KEY,
    family_member_id        INT REFERENCES family_members(id) ON DELETE CASCADE,
    book_title              VARCHAR(200) NOT NULL,
    library_name            VARCHAR(150),
    checkout_date           DATE,
    due_date                DATE NOT NULL,
    returned_date           DATE,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_library_due ON library_checkouts(returned_date, due_date);
