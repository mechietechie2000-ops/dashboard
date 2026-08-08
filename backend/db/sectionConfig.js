// Single source of truth, on the backend, for "which table does this section
// go to". sectionKey -> table/column names are only ever taken from this
// lookup (never from request input), so building SQL with them is safe.
//
// To add a field to a section later: add the DB column, add it to that
// section's `columns` (and `requiredColumns` if mandatory) here, and add it
// to the matching entry in frontend/src/config/sectionFields.js. Nothing
// else needs to change.

/*
    category            TEXT NOT NULL,  -- financial | health | education | home | personal | other
    title               TEXT NOT NULL,
    description         TEXT,
    goal_type           TEXT, -- short_term | long_term 
    target_value        NUMERIC,
    current_value       NUMERIC NOT NULL DEFAULT 0,
    unit                TEXT, -- $, %, lbs, miles, books, courses, etc.
    target_date         TEXT, -- ISO-8601: YYYY-MM-DD
    status              TEXT NOT NULL DEFAULT 'in_progress', -- in_progress | completed | abandoned | paused
    completed_on        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    priority            INTEGER NOT NULL DEFAULT 0,

*/
module.exports = {
  routine: {
    tableName: "daily_routine",
    columns: ["title", "family_member_id", "frequency", "day_of_week", "scheduled_time", "mute", "announce", "description"],
    requiredColumns: ["title", "family_member_id", "frequency", "scheduled_time"],
    where: "active = 1",
    orderBy: "scheduled_time ASC",
  },
  reminders: {
    tableName: "reminders",
    columns: ["title", "notes", "due_date", "priority", "is_completed", "family_member_id"],
    requiredColumns: ["title", "due_date"],
    orderBy: "due_date ASC",
  },
  goals: {
    tableName: "goals",
    columns: ["category", "title", "family_member_id", "description", "goal_type", "target_year", "target_quarter", "target_date", "target_value"],
    requiredColumns: ["title"],
    orderBy: "(target_date IS NULL) ASC, target_date ASC",
  },
  events: {
    tableName: "events",
    columns: ["person_name", "title", "event_type", "event_date", "is_recurring_yearly"],
    requiredColumns: ["person_name", "event_type", "event_date"],
    orderBy: "event_date ASC",
  },
  appointments: {
    tableName: "appointments",
    columns: [
      "category",
      "family_member_id",
      "doctor_name",
      "appointment_date",
      "purpose",
      "amount_charged",
      "address",
      "contact_number",
      "doctor_special",
      "insurance",
    ],
    requiredColumns: ["doctor_name", "appointment_date"],
    orderBy: "appointment_date ASC",
  },
  renewals: {
    tableName: "renewals",
    columns: [
      "family_member_id",
      "renewal_type",
      "category",
      "subcategory",
      "title",
      "provider_name",
      "start_date",
      "expiry_date",
      "amount",
      "auto_renew",
      "reminder_days_before",
      "notes",
      "status",
      "renewal_frequency",

    ],
    requiredColumns: ["category", "expiry_date"],
    jsonColumns: ["attributes"],
    // renewals only stores family_member_id (FK); join family_members so
    // listRecords can also return a display name for the frontend.
    select: "renewals.*, family_members.first_name AS family_member_name",
    joins: "LEFT JOIN family_members ON family_members.id = renewals.family_member_id",
    orderBy: "expiry_date ASC",
  },
  bills: {
    tableName: "bills",
    columns: ["title", "provider", "amount", "due_date"],
    requiredColumns: ["title", "amount", "due_date"],
    orderBy: "due_date ASC",
  },
  extracurricular: {
    tableName: "activity",
    columns: [
      "ACTIVITY_NAME",
      "ACTIVITY_FOR",
      "DAY_OF_WEEK",
      "TIME_SLOT",
      "START_DATE",
      "FACILITY_NAME",
      "MONTHLY_FEES",
      "REGISTRATION_FEES",
    ],
    requiredColumns: ["ACTIVITY_NAME", "ACTIVITY_FOR", "START_DATE"],
    orderBy: "START_DATE ASC",
  },
  library: {
    tableName: "library_loans",
    columns: ["book_title", "borrower", "due_date"],
    requiredColumns: ["book_title", "due_date"],
    orderBy: "due_date ASC",
  },

  // -------------------------------------------------------------------
  // AddTaskForm categories (see backend/db/task_categories_schema.sql).
  // sectionKey matches the `category` value AddTaskForm sends, so the
  // frontend can POST straight to /api/sections/:category with no extra
  // mapping layer needed here.
  // -------------------------------------------------------------------
  birthday: {
    tableName: "tasks_birthday",
    columns: [
      "title",
      "related_person",
      "task_date",
      "task_time",
      "description",
      "reminder_value",
      "reminder_unit",
      "repeat_frequency",
    ],
    requiredColumns: ["title"],
    orderBy: "(task_date IS NULL) ASC, task_date ASC",
  },
  anniversary: {
    tableName: "tasks_anniversary",
    columns: [
      "title",
      "related_person",
      "task_date",
      "task_time",
      "description",
      "reminder_value",
      "reminder_unit",
      "anniversary_type",
      "repeat_frequency",
    ],
    requiredColumns: ["title"],
    orderBy: "(task_date IS NULL) ASC, task_date ASC",
  },
  appointment: {
    tableName: "tasks_appointment",
    columns: [
      "title",
      "related_person",
      "task_date",
      "task_time",
      "description",
      "reminder_value",
      "reminder_unit",
      "provider",
      "location_or_url",
      "duration_minutes",
    ],
    requiredColumns: ["title"],
    orderBy: "(task_date IS NULL) ASC, task_date ASC",
  },
  homeMaintenance: {
    tableName: "tasks_home_maintenance",
    columns: [
      "title",
      "related_person",
      "task_date",
      "task_time",
      "description",
      "reminder_value",
      "reminder_unit",
      "area",
      "service_provider",
      "repeat_frequency",
    ],
    requiredColumns: ["title"],
    orderBy: "(task_date IS NULL) ASC, task_date ASC",
  },
  kids: {
    tableName: "tasks_kids",
    columns: [
      "title",
      "related_person",
      "task_date",
      "task_time",
      "description",
      "reminder_value",
      "reminder_unit",
      "child_name",
      "kid_task_type",
      "location",
    ],
    requiredColumns: ["title"],
    orderBy: "(task_date IS NULL) ASC, task_date ASC",
  },
  banking: {
    tableName: "tasks_banking",
    columns: [
      "title",
      "related_person",
      "task_date",
      "task_time",
      "description",
      "reminder_value",
      "reminder_unit",
      "institution",
      "account_nickname",
      "amount",
      "repeat_frequency",
    ],
    requiredColumns: ["title"],
    orderBy: "(task_date IS NULL) ASC, task_date ASC",
  },
  investment: {
    tableName: "tasks_investment",
    columns: [
      "title",
      "related_person",
      "task_date",
      "task_time",
      "description",
      "reminder_value",
      "reminder_unit",
      "institution",
      "action",
      "amount",
    ],
    requiredColumns: ["title"],
    orderBy: "(task_date IS NULL) ASC, task_date ASC",
  },
  learning: {
    tableName: "tasks_learning",
    columns: [
      "title",
      "related_person",
      "task_date",
      "task_time",
      "description",
      "reminder_value",
      "reminder_unit",
      "course_or_subject",
      "resource_url",
      "estimated_duration_minutes",
    ],
    requiredColumns: ["title"],
    orderBy: "(task_date IS NULL) ASC, task_date ASC",
  },
  vacation: {
    tableName: "tasks_vacation",
    columns: [
      "title",
      "related_person",
      "description",
      "reminder_value",
      "reminder_unit",
      "destination",
      "start_date",
      "end_date",
    ],
    requiredColumns: ["title", "start_date", "end_date"],
    orderBy: "start_date ASC",
  },
};
