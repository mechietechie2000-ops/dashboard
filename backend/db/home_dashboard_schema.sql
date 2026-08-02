-- Home Dashboard schema.
-- Routine reuses the existing daily_routine table (see schema.sql).
-- Appointments reuses doctor_appointment (see sqlscripts/cr_tbl_doctor_appointment.sql)
-- so it stays in sync with the Medical scene, which already reads from it.
-- Extra-curriculum reuses/creates `activity`, kept in sync with the Sports scene.

CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS family_members (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name      TEXT NOT NULL,
    last_name       TEXT,
    date_of_birth   TEXT,                              -- ISO-8601: YYYY-MM-DD
    relationship    TEXT,                              -- 'self', 'spouse', 'child', etc.
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

/* INSERT OR IGNORE INTO family_members (name) VALUES ('Mom'), ('Dad'), ('Kid1'), ('Emma'); */

CREATE TABLE IF NOT EXISTS doctor_appointment (
  appointment_id INTEGER PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS reminders (
  reminder_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  note TEXT,
  due_date DATE NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS goals (
  goal_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  family_member_id INTEGER REFERENCES family_members(id),
  target_date DATE,
  progress_note TEXT,
  target_amount REAL CHECK (target_amount IS NULL OR target_amount > 0)
);

CREATE TABLE IF NOT EXISTS events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('birthday', 'anniversary', 'other')),
  event_date DATE NOT NULL,
  family_member_id INTEGER REFERENCES family_members(id)
);

CREATE TABLE IF NOT EXISTS renewals (
  renewal_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT,
  renewal_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS bills (
  bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  provider TEXT,
  amount REAL NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS library_loans (
  loan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_title TEXT NOT NULL,
  borrower TEXT,
  due_date DATE NOT NULL
);
