// Single source of truth, on the backend, for "which table does this section
// go to". sectionKey -> table/column names are only ever taken from this
// lookup (never from request input), so building SQL with them is safe.
//
// To add a field to a section later: add the DB column, add it to that
// section's `columns` (and `requiredColumns` if mandatory) here, and add it
// to the matching entry in frontend/src/config/sectionFields.js. Nothing
// else needs to change.

module.exports = {
  routine: {
    tableName: "daily_routine",
    columns: ["task_name", "person", "frequency", "day_of_week", "task_time"],
    requiredColumns: ["task_name", "person", "frequency", "task_time"],
    where: "active = 1",
    orderBy: "task_time ASC",
  },
  reminders: {
    tableName: "reminders",
    columns: ["title", "note", "due_date"],
    requiredColumns: ["title", "due_date"],
    orderBy: "due_date ASC",
  },
  goals: {
    tableName: "goals",
    columns: ["title", "family_member_id", "target_date", "progress_note", "target_amount"],
    requiredColumns: ["title"],
    orderBy: "(target_date IS NULL) ASC, target_date ASC",
  },
  events: {
    tableName: "events",
    columns: ["title", "event_type", "event_date", "family_member_id"],
    requiredColumns: ["title", "event_type", "event_date"],
    orderBy: "event_date ASC",
  },
  appointments: {
    tableName: "doctor_appointment",
    columns: [
      "patient_name",
      "doctor_name",
      "appointment_date",
      "purpose",
      "amount_charged",
      "address",
      "contact_number",
      "doctor_special",
      "insurance",
    ],
    requiredColumns: ["patient_name", "doctor_name", "appointment_date"],
    orderBy: "appointment_date ASC",
  },
  renewals: {
    tableName: "renewals",
    columns: ["title", "category", "renewal_date"],
    requiredColumns: ["title", "renewal_date"],
    orderBy: "renewal_date ASC",
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
};
