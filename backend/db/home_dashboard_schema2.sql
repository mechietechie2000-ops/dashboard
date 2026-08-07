-- Review and merge with all possible columns in home_dashboard_schema.sql and home_dashboard_schema2.sql


-- Enforce Foreign Keys (Run this in your app connection)
PRAGMA foreign_keys = ON;

-- =====================================================================
-- Home Dashboard Schema (SQLite Compatible)
-- =====================================================================



-- Routine reuses the existing daily_routine table (see schema.sql).
-- Appointments reuses the `appointments` table (renamed from
-- doctor_appointment, see db/migrations/001_reminders_appointments.js for
-- existing installs) so it stays in sync with the Medical scene, which
-- already reads from it.
-- Extra-curriculum reuses/creates `activity`, kept in sync with the Sports scene.


-- Renamed from doctor_appointment -> appointments (see migration 001 for
-- existing installs). `category` lets non-doctor appointment types (Auto,
-- Other, etc.) share this table; existing rows default to 'Doctor'.


CREATE TABLE IF NOT EXISTS activity (
  ACTIVITY_CODE INTEGER PRIMARY KEY AUTOINCREMENT,
  ACTIVITY_NAME TEXT NOT NULL,
  ACTIVITY_FOR TEXT NOT NULL,
  LEVEL TEXT,
  DAY_OF_WEEK TEXT,
  TIME_SLOT TEXT,
  DURATION TEXT,
  FREQUENCY TEXT,
  START_DATE DATE NOT NULL,
  END_DATE DATE,
  SPECIAL_EVENT_DATE DATE,
  FACILITY_NAME TEXT,
  ADDRESS TEXT,
  PHONE_NUMBER TEXT,
  MONTHLY_FEES REAL CHECK (MONTHLY_FEES IS NULL OR MONTHLY_FEES > 0),
  REGISTRATION_FEES REAL CHECK (REGISTRATION_FEES IS NULL OR REGISTRATION_FEES > 0),
  OTHER_EXPENSES REAL,
  GEAR_LIST TEXT
);



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

CREATE TABLE IF NOT EXISTS appointments (
  appointment_id INTEGER PRIMARY KEY,
  category STRING NOT NULL DEFAULT 'Doctor',
  patient_name STRING NOT NULL,
  doctor_name STRING NOT NULL,
  appointment_date DATE NOT NULL,
  purpose TEXT,
  amount_charged INT,
  address string,
  contact_number INT,
  doctor_special STRING,
  insurance STRING
);


-- ---------------------------------------------------------------------
-- 7. Upcoming Payments / Bills
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bills (
  bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  provider TEXT,
  amount REAL NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL
);

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


CREATE TABLE IF NOT EXISTS library_loans (
  loan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_title TEXT NOT NULL,
  borrower TEXT,
  due_date DATE NOT NULL
);