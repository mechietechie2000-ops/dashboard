// Every table that should surface in Reminders gets one entry here. The
// query builder in remindersRepository.js loops this array to generate the
// UNION ALL queries — adding a future source means adding an entry here,
// not writing new SQL or touching the route/repository code.
//
// Fields:
//   type              - short label stored in reminder.source_type, e.g. "renewal"
//   table              - source table name
//   idCol              - primary key column, aliased to source_id. Every
//                         table in home_dashboard_schema.sql uses a plain
//                         `id` column, so this is 'id' for every source.
//   titleExpr          - SQL expression for the display title (can combine
//                         columns, e.g. appointments has no single title)
//   dueDateExpr        - the hard deadline column (SQL DATE/TEXT expression)
//   leadDaysExpr       - SQL expression for how many days before due_date
//                         this should start appearing (window_start). Use
//                         '0' for point-in-time items (events, goals,
//                         appointments, todo tasks, routines). Renewals use
//                         their own reminder_days_before column so each
//                         renewal can have a different lead time.
//   familyMemberExpr   - column name, or the literal 'NULL' if the table
//                         doesn't track a family member (e.g. appointments).
//   priorityExpr       - SQL expression normalized to 'low' | 'medium' |
//                         'high'. Sources with no priority column default
//                         to the literal 'low'.
//   statusExpr         - raw, unmodified copy of whatever the source table
//                         calls its status (display only — never used for
//                         filtering; completed_at IS NULL is the filter).
//   completedAtExpr    - SQL CASE expression: a timestamp/date when this
//                         row counts as done, else NULL. Per-source because
//                         "done" means something different in every table.
//   expiresAtExpr      - SQL expression for when this reminder stops being
//                         relevant even if never explicitly completed
//                         (mainly for point-in-time items whose due_date is
//                         itself the natural expiry). NULL where n/a.
//   requiredWhere      - SQL condition that must always hold for a row to
//                         be a candidate at all (e.g. dueDateExpr NOT NULL).
//                         Used by BOTH the live feed and the sync query.
//   activeWhere        - SQL condition on top of requiredWhere that hides
//                         rows the live feed shouldn't show (e.g. cancelled
//                         renewals). NOT applied to the sync query, so the
//                         sync can still see a row the moment it flips to
//                         completed/cancelled (to record completed_at)
//                         instead of it looking indistinguishable from a
//                         deleted row.
//   includeInLiveFeedByDefault - whether this source is on by default in
//                         the live feed. false means it's synced into the
//                         reminder table like everything else, but excluded
//                         from buildLiveFeedQuery() unless explicitly
//                         opted back in. Lets a source (goals) be toggled
//                         off later without a code change.
const REMINDER_SOURCES = [
  {
    type: 'event',
    table: 'events',
    idCol: 'id',
    // titleExpr: 'title',
    titleExpr: "COALESCE(title, person_name || ' ' || event_type)",
    dueDateExpr: 'event_date',
    leadDaysExpr: '0',
    familyMemberExpr: 'NULL',
    priorityExpr: "'low'",
    statusExpr: "CASE WHEN active = 1 THEN 'active' ELSE 'inactive' END",
    completedAtExpr: 'NULL', // events don't complete, they just recur/pass
    expiresAtExpr: 'NULL',
    requiredWhere: 'event_date IS NOT NULL',
    activeWhere: 'active = 1',
    includeInLiveFeedByDefault: true,
  },
  {
    type: 'goal',
    table: 'goals',
    idCol: 'id',
    titleExpr: 'title',
    dueDateExpr: 'target_date',
    leadDaysExpr: '0',
    familyMemberExpr: 'family_member_id',
    priorityExpr: "COALESCE(priority, 'low')",
    statusExpr: 'status',
    completedAtExpr: "CASE WHEN status = 'completed' THEN completed_on ELSE NULL END",
    expiresAtExpr: 'NULL',
    requiredWhere: 'target_date IS NOT NULL',
    activeWhere: "status NOT IN ('completed', 'abandoned')",
    // User said "build it in, but I may disable it later if it clutters
    // the card" — this is the single flag that turns it off later.
    includeInLiveFeedByDefault: true,
  },
  {
    type: 'renewal',
    table: 'renewals',
    idCol: 'id',
    titleExpr: 'title',
    dueDateExpr: 'expiry_date',
    leadDaysExpr: 'reminder_days_before', // per-row lead time, already on the table
    familyMemberExpr: 'family_member_id',
    priorityExpr: "'low'",
    statusExpr: 'status',
    completedAtExpr:
      "CASE WHEN status IN ('renewed', 'expired', 'cancelled') THEN updated_at ELSE NULL END",
    expiresAtExpr: 'NULL',
    requiredWhere: 'expiry_date IS NOT NULL',
    activeWhere: "status = 'active'",
    includeInLiveFeedByDefault: true,
  },
  {
    type: 'appointment',
    table: 'appointments',
    idCol: 'id',
    // No single title column on this table — compose one.
    titleExpr: "category || ' — ' || title",
    dueDateExpr: 'appointment_datetime',
    leadDaysExpr: '0',
    familyMemberExpr: 'family_member_id',
    priorityExpr: "'low'",
    statusExpr: 'status',
    completedAtExpr:
      "CASE WHEN status IN ('completed', 'cancelled') THEN updated_at ELSE NULL END",
    expiresAtExpr: 'NULL',
    requiredWhere: 'appointment_datetime IS NOT NULL',
    activeWhere: "status = 'scheduled'",
    includeInLiveFeedByDefault: true,
  },
  {
    type: 'todo_task',
    table: 'todo_task',
    idCol: 'id',
    titleExpr: 'title',
    dueDateExpr: 'target_date',
    leadDaysExpr: '0',
    familyMemberExpr: 'family_member_id',
    priorityExpr: "COALESCE(priority, 'low')",
    statusExpr: 'status',
    completedAtExpr: "CASE WHEN status = 'done' THEN completion_date ELSE NULL END",
    expiresAtExpr: 'NULL',
    requiredWhere: 'target_date IS NOT NULL',
    activeWhere: "status != 'done'",
    includeInLiveFeedByDefault: true,
  },
  {
    type: 'routine',
    table: 'daily_routine_temp',
    // id on daily_routine_temp now equals routine_id (see routineRepository.js
    // runDailyReset), so it's stable across days instead of churning.
    idCol: 'id',
    titleExpr: 'title',
    // Today's instance table has no date column of its own — it only ever
    // holds "today"'s tasks, so due_date is simply today.
    dueDateExpr: "date('now')",
    leadDaysExpr: '0',
    familyMemberExpr: 'family_member_id',
    priorityExpr: "'low'",
    statusExpr: 'status',
    // Routines don't set a completed_at column — "completion" is the row's
    // absence (markDone/markSkipped delete it). The sync's "row not found
    // -> remove the reminder" path handles that; this expr only matters for
    // the brief moment the sync sees the row before it's deleted, so it
    // should never actually read as completed while the row still exists.
    completedAtExpr: 'NULL',
    expiresAtExpr: 'NULL',
    requiredWhere: '1 = 1',
    activeWhere: "status = 'new'",
    includeInLiveFeedByDefault: true,
  },
];

module.exports = { REMINDER_SOURCES };
