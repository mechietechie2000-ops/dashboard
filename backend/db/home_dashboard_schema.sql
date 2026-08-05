-- Home Dashboard schema.
-- Routine reuses the existing daily_routine table (see schema.sql).
-- Appointments reuses the `appointments` table (renamed from
-- doctor_appointment, see db/migrations/001_reminders_appointments.js for
-- existing installs) so it stays in sync with the Medical scene, which
-- already reads from it.
-- Extra-curriculum reuses/creates `activity`, kept in sync with the Sports scene.

/* CREATE TABLE IF NOT EXISTS family_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);
 */

 
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

-- Renamed from doctor_appointment -> appointments (see migration 001 for
-- existing installs). `category` lets non-doctor appointment types (Auto,
-- Other, etc.) share this table; existing rows default to 'Doctor'.
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
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
  family_member_id INTEGER REFERENCES family_members(id),
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
  family_member_id INTEGER REFERENCES family_members(id),
  category TEXT NOT NULL,          -- insurance | passport | license | subscription | parking | other
  subcategory TEXT,                -- e.g. auto/home/health(medical,dental,vision) | OCI/visa | costco/amazon/...
  title TEXT NOT NULL,             -- "Auto Insurance - Honda Civic"
  provider_name TEXT,
  start_date DATE,
  expiry_date DATE NOT NULL,
  amount REAL CHECK (amount IS NULL OR amount > 0),
  auto_renew INTEGER NOT NULL DEFAULT 0 CHECK (auto_renew IN (0, 1)),
  lead_time_days INTEGER NOT NULL DEFAULT 30,
  address TEXT,
  attributes TEXT,                 -- JSON blob for category-specific fields (license_plate, passport_number, etc.)
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'renewed', 'expired', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_renewals_expiry ON renewals(expiry_date);
CREATE INDEX IF NOT EXISTS idx_renewals_category ON renewals(category);

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

-- ---------------------------------------------------------------------
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
  uploaded_by            INTEGER NOT NULL REFERENCES users(id),
  uploaded_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_uploads_person_status ON uploads(person_id, status);
CREATE INDEX IF NOT EXISTS idx_uploads_uploaded_by ON uploads(uploaded_by);


-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,          -- Matches FullCalendar ID (e.g. string/uuid)
    title TEXT NOT NULL,          -- Event title
    start TEXT NOT NULL,          -- ISO 8601 String: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
    end TEXT,                     -- ISO 8601 String (Optional)
    all_day INTEGER DEFAULT 1,    -- 1 for true, 0 for false
    category TEXT DEFAULT 'general', -- e.g., 'holiday', 'birthday', 'work'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimized calendar queries across date ranges
CREATE INDEX IF NOT EXISTS idx_calendar_start ON calendar_events(start);
CREATE INDEX IF NOT EXISTS idx_calendar_end ON calendar_events(end);