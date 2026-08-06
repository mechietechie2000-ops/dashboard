// Every table that should surface in Reminders gets one entry here. The
// query builder in remindersRepository.js loops this array to generate a
// UNION ALL — adding a future source (a 5th/6th table) means adding an
// entry here, not writing new SQL or touching the route/repository code.
//
// Fields:
//   type              - short label shown to the client, e.g. "renewal"
//   table              - source table name
//   idCol              - primary key column, aliased to source_id
//   titleExpr          - SQL expression for the display title (can combine
//                         columns, e.g. appointments has no single title)
//   dueDateExpr        - the hard deadline column (SQL DATE/TEXT expression)
//   leadDaysExpr       - SQL expression for how many days before due_date
//                         this should start appearing. Use '0' for
//                         point-in-time items (events, goals, appointments).
//                         Renewals use their own lead_time_days column so
//                         each renewal can have a different lead time.
//   familyMemberExpr   - column name, or the literal 'NULL' if the table
//                         doesn't track a family member (e.g. appointments).
//   where              - optional extra SQL condition (e.g. only active rows)
const REMINDER_SOURCES = [
  {
    type: "event",
    table: "events",
    idCol: "event_id",
    titleExpr: "title",
    dueDateExpr: "event_date",
    leadDaysExpr: "0",
    familyMemberExpr: "family_member_id",
    where: null,
  },
  {
    type: "goal",
    table: "goals",
    idCol: "goal_id",
    titleExpr: "title",
    dueDateExpr: "target_date",
    leadDaysExpr: "0",
    familyMemberExpr: "family_member_id",
    where: "target_date IS NOT NULL",
  },
  {
    type: "renewal",
    table: "renewals",
    idCol: "renewal_id",
    titleExpr: "title",
    dueDateExpr: "expiry_date",
    leadDaysExpr: "lead_time_days", // per-row lead time, already on the table
    familyMemberExpr: "family_member_id",
    where: "status = 'active'",
  },
  {
    type: "appointment",
    table: "appointments",
    idCol: "appointment_id",
    // No single title column on this table — compose one.
    titleExpr: "doctor_name || ' — ' || COALESCE(purpose, category)",
    dueDateExpr: "appointment_date",
    leadDaysExpr: "0",
    familyMemberExpr: "NULL", // appointments has no family_member_id column
    where: null,
  },
];

module.exports = { REMINDER_SOURCES };
