-- =====================================================================
-- AddTaskForm category tables (SQLite compatible)
-- =====================================================================
-- One table per AddTaskForm category, columns mirror the form fields
-- exactly (common fields + that category's fields).
--
-- Why new tables instead of reusing `events` / `appointments`:
--   - `events` and `appointments` (see home_dashboard_schema.sql) have
--     NOT NULL columns (patient_name, doctor_name, event_type CHECK list,
--     etc.) that don't match what AddTaskForm collects, and both tables
--     are already read by other scenes (Medical, Calendar). Altering
--     their constraints risks breaking those.
--   - Dedicated tables keep this additive/safe and let each category slot
--     straight into the existing generic /api/sections/:sectionKey CRUD
--     (see db/sectionConfig.js + db/sectionRepository.js + routes/sections.js)
--     with no new route code required.
--
-- Common columns present on every table below:
--   title (required), related_person, task_date, task_time, description,
--   reminder_value, reminder_unit, created_at, updated_at
-- (tasks_vacation omits task_date/task_time in favor of start_date/end_date,
-- matching the form which hides the plain time field for Vacation.)

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- Birthday
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks_birthday (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT NOT NULL,
    related_person      TEXT,
    task_date           TEXT,                              -- ISO-8601: YYYY-MM-DD
    task_time           TEXT,                              -- HH:MM
    description         TEXT,
    reminder_value       INTEGER CHECK (reminder_value IS NULL OR reminder_value > 0),
    reminder_unit        TEXT CHECK (reminder_unit IS NULL OR reminder_unit IN ('minutes', 'hours', 'days', 'weeks')),
    repeat_frequency     TEXT NOT NULL DEFAULT 'yearly' CHECK (repeat_frequency IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_birthday_date ON tasks_birthday(task_date);

-- ---------------------------------------------------------------------
-- Anniversary
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks_anniversary (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT NOT NULL,
    related_person      TEXT,
    task_date           TEXT,
    task_time           TEXT,
    description         TEXT,
    reminder_value       INTEGER CHECK (reminder_value IS NULL OR reminder_value > 0),
    reminder_unit        TEXT CHECK (reminder_unit IS NULL OR reminder_unit IN ('minutes', 'hours', 'days', 'weeks')),
    anniversary_type     TEXT NOT NULL DEFAULT 'Wedding' CHECK (anniversary_type IN ('Wedding', 'Work', 'Personal', 'Other')),
    repeat_frequency     TEXT NOT NULL DEFAULT 'yearly' CHECK (repeat_frequency IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_anniversary_date ON tasks_anniversary(task_date);

-- ---------------------------------------------------------------------
-- Appointment
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks_appointment (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT NOT NULL,
    related_person      TEXT,
    task_date           TEXT,
    task_time           TEXT,
    description         TEXT,
    reminder_value       INTEGER CHECK (reminder_value IS NULL OR reminder_value > 0),
    reminder_unit        TEXT CHECK (reminder_unit IS NULL OR reminder_unit IN ('minutes', 'hours', 'days', 'weeks')),
    provider            TEXT,
    location_or_url      TEXT,
    duration_minutes     INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_appointment_date ON tasks_appointment(task_date);

-- ---------------------------------------------------------------------
-- Home Maintenance
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks_home_maintenance (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT NOT NULL,
    related_person      TEXT,
    task_date           TEXT,
    task_time           TEXT,
    description         TEXT,
    reminder_value       INTEGER CHECK (reminder_value IS NULL OR reminder_value > 0),
    reminder_unit        TEXT CHECK (reminder_unit IS NULL OR reminder_unit IN ('minutes', 'hours', 'days', 'weeks')),
    area                TEXT NOT NULL DEFAULT 'General' CHECK (area IN ('HVAC', 'Plumbing', 'Electrical', 'Roof', 'Garden', 'General')),
    service_provider     TEXT,
    repeat_frequency     TEXT NOT NULL DEFAULT 'none' CHECK (repeat_frequency IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_home_maintenance_date ON tasks_home_maintenance(task_date);

-- ---------------------------------------------------------------------
-- Kids
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks_kids (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT NOT NULL,
    related_person      TEXT,
    task_date           TEXT,
    task_time           TEXT,
    description         TEXT,
    reminder_value       INTEGER CHECK (reminder_value IS NULL OR reminder_value > 0),
    reminder_unit        TEXT CHECK (reminder_unit IS NULL OR reminder_unit IN ('minutes', 'hours', 'days', 'weeks')),
    child_name           TEXT,
    kid_task_type        TEXT NOT NULL DEFAULT 'Other' CHECK (kid_task_type IN ('School', 'Activity', 'Health', 'Event', 'Paperwork', 'Other')),
    location             TEXT,
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_kids_date ON tasks_kids(task_date);

-- ---------------------------------------------------------------------
-- Banking
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks_banking (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT NOT NULL,
    related_person      TEXT,
    task_date           TEXT,
    task_time           TEXT,
    description         TEXT,
    reminder_value       INTEGER CHECK (reminder_value IS NULL OR reminder_value > 0),
    reminder_unit        TEXT CHECK (reminder_unit IS NULL OR reminder_unit IN ('minutes', 'hours', 'days', 'weeks')),
    institution          TEXT,
    account_nickname      TEXT,
    amount               NUMERIC,
    repeat_frequency     TEXT NOT NULL DEFAULT 'none' CHECK (repeat_frequency IN ('none', 'daily', 'weekly', 'monthly', 'yearly')),
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_banking_date ON tasks_banking(task_date);

-- ---------------------------------------------------------------------
-- Investment
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks_investment (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT NOT NULL,
    related_person      TEXT,
    task_date           TEXT,
    task_time           TEXT,
    description         TEXT,
    reminder_value       INTEGER CHECK (reminder_value IS NULL OR reminder_value > 0),
    reminder_unit        TEXT CHECK (reminder_unit IS NULL OR reminder_unit IN ('minutes', 'hours', 'days', 'weeks')),
    institution          TEXT,
    action               TEXT NOT NULL DEFAULT 'Review' CHECK (action IN ('Review', 'Research', 'Buy', 'Sell', 'Contribute', 'Rebalance')),
    amount               NUMERIC,
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_investment_date ON tasks_investment(task_date);

-- ---------------------------------------------------------------------
-- Learning
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks_learning (
    id                          INTEGER PRIMARY KEY AUTOINCREMENT,
    title                       TEXT NOT NULL,
    related_person              TEXT,
    task_date                   TEXT,
    task_time                   TEXT,
    description                 TEXT,
    reminder_value               INTEGER CHECK (reminder_value IS NULL OR reminder_value > 0),
    reminder_unit                TEXT CHECK (reminder_unit IS NULL OR reminder_unit IN ('minutes', 'hours', 'days', 'weeks')),
    course_or_subject            TEXT,
    resource_url                 TEXT,
    estimated_duration_minutes    INTEGER CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0),
    created_at                  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_learning_date ON tasks_learning(task_date);

-- ---------------------------------------------------------------------
-- Vacation
-- ---------------------------------------------------------------------
-- No task_time column: the form hides the plain time field for Vacation
-- in favor of start_date/end_date.
CREATE TABLE IF NOT EXISTS tasks_vacation (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    title               TEXT NOT NULL,
    related_person      TEXT,
    description         TEXT,
    reminder_value       INTEGER CHECK (reminder_value IS NULL OR reminder_value > 0),
    reminder_unit        TEXT CHECK (reminder_unit IS NULL OR reminder_unit IN ('minutes', 'hours', 'days', 'weeks')),
    destination          TEXT,
    start_date           TEXT NOT NULL,                     -- ISO-8601: YYYY-MM-DD
    end_date             TEXT NOT NULL,                     -- ISO-8601: YYYY-MM-DD
    created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_tasks_vacation_start ON tasks_vacation(start_date);
