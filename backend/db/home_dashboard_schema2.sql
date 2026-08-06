-- Review and merge with all possible columns in home_dashboard_schema.sql and home_dashboard_schema2.sql


-- Enforce Foreign Keys (Run this in your app connection)
PRAGMA foreign_keys = ON;

-- =====================================================================
-- Home Dashboard Schema (SQLite Compatible)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Shared reference table: family members
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
-- 1. Routine
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS routines (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    family_member_id    INTEGER REFERENCES family_members(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,                 -- "Morning routine"
    description         TEXT,                          -- "Wake up, brush teeth, breakfast"
    scheduled_time      TEXT,                          -- ISO-8601: HH:MM:SS
    days_of_week        TEXT,                          -- CSV: 'Mon,Tue,Wed,Thu,Fri'
    is_active           INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_routines_active ON routines(is_active, scheduled_time);

-- ---------------------------------------------------------------------
-- 2. Reminders
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reminders (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    family_member_id    INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
    title               TEXT NOT NULL,
    notes               TEXT,
    due_date            TEXT,                          -- ISO-8601: YYYY-MM-DD
    priority            TEXT NOT NULL DEFAULT 'medium',-- low | medium | high
    is_completed        INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(is_completed, due_date);

-- ---------------------------------------------------------------------
-- 3. Goals
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    family_member_id    INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
    title               TEXT NOT NULL,
    description         TEXT,
    target_value        NUMERIC,                       -- SQLite numeric type
    current_value       NUMERIC NOT NULL DEFAULT 0,
    unit                TEXT,                          -- '$', '%', 'lbs', 'books', etc.
    target_date         TEXT,                          -- ISO-8601: YYYY-MM-DD
    status              TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | completed | abandoned
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status, target_date);

-- ---------------------------------------------------------------------
-- 4. Events (Birthdays, Anniversaries)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    family_member_id       INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
    title                  TEXT NOT NULL,              -- "Mom's Birthday"
    event_type             TEXT NOT NULL,              -- birthday | anniversary | other
    event_date             TEXT NOT NULL,              -- ISO-8601: YYYY-MM-DD
    is_recurring_yearly    INTEGER NOT NULL DEFAULT 1 CHECK (is_recurring_yearly IN (0, 1)),
    notes                  TEXT,
    created_at             TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(event_date);

-- ---------------------------------------------------------------------
-- 5. Appointments
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    family_member_id        INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
    title                   TEXT NOT NULL,             -- "Dentist - Dr. Smith"
    provider_name           TEXT,
    appointment_type        TEXT,                      -- medical | dental | vet | other
    appointment_datetime    TEXT NOT NULL,             -- ISO-8601: YYYY-MM-DD HH:MM:SS
    location                TEXT,
    notes                   TEXT,
    status                  TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | completed | cancelled
    created_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_appointments_datetime ON appointments(status, appointment_datetime);

-- ---------------------------------------------------------------------
-- 6. Renewals (insurance, passport, license, subscriptions, etc.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS renewals (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    family_member_id        INTEGER REFERENCES family_members(id) ON DELETE SET NULL,
    title                   TEXT NOT NULL,             -- "Auto Insurance"
    renewal_type            TEXT,                      -- insurance | passport | license | subscription | other
    provider_name           TEXT,
    expiry_date             TEXT NOT NULL,             -- ISO-8601: YYYY-MM-DD
    reminder_days_before    INTEGER NOT NULL DEFAULT 30,
    notes                   TEXT,
    created_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_renewals_expiry ON renewals(expiry_date);

-- ---------------------------------------------------------------------
-- 7. Upcoming Payments / Bills
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    title                   TEXT NOT NULL,             -- "Electricity Bill"
    provider_name           TEXT,                      -- "ConEd"
    amount                  NUMERIC NOT NULL,
    due_date                TEXT NOT NULL,             -- ISO-8601: YYYY-MM-DD
    is_recurring            INTEGER NOT NULL DEFAULT 0 CHECK (is_recurring IN (0, 1)),
    recurrence_interval     TEXT,                      -- monthly | quarterly | annual
    is_paid                 INTEGER NOT NULL DEFAULT 0 CHECK (is_paid IN (0, 1)),
    paid_date               TEXT,                      -- ISO-8601: YYYY-MM-DD
    created_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bills_due ON bills(is_paid, due_date);

-- ---------------------------------------------------------------------
-- 8. Extra Curriculum Registrations
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extracurricular_registrations (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    family_member_id        INTEGER REFERENCES family_members(id) ON DELETE CASCADE,
    activity_name           TEXT NOT NULL,             -- "Swimming Lessons"
    provider_name           TEXT,
    registration_deadline   TEXT,                      -- ISO-8601: YYYY-MM-DD
    season_start_date       TEXT,                      -- ISO-8601: YYYY-MM-DD
    season_end_date         TEXT,                      -- ISO-8601: YYYY-MM-DD
    cost                    NUMERIC,
    status                  TEXT NOT NULL DEFAULT 'open', -- open | registered | closed
    notes                   TEXT,
    created_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_extracurricular_deadline ON extracurricular_registrations(status, registration_deadline);

-- ---------------------------------------------------------------------
-- 9. Library Return Day
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS library_checkouts (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    family_member_id        INTEGER REFERENCES family_members(id) ON DELETE CASCADE,
    book_title              TEXT NOT NULL,
    library_name            TEXT,
    checkout_date           TEXT,                      -- ISO-8601: YYYY-MM-DD
    due_date                TEXT NOT NULL,             -- ISO-8601: YYYY-MM-DD
    returned_date           TEXT,                      -- ISO-8601: YYYY-MM-DD
    created_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_library_due ON library_checkouts(returned_date, due_date);