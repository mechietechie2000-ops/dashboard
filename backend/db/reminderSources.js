// Every table that should surface in Reminders gets one entry here. Two
// query builders in remindersRepository.js loop this array:
//   - buildLiveFeedQuery(): the "upcoming reminders" view — applies
//     requiredWhere AND activeWhere, so finished/invalid items don't
//     clutter it.
//   - buildSyncQuery(): used by reminderRepository.js's sync job — applies
//     ONLY requiredWhere. It must still be able to see a row the moment it
//     becomes "completed" so it can record completed_at in the `reminder`
//     table; if it used activeWhere too, a just-completed row would vanish
//     from the query entirely and the sync would have no way to tell
//     "this became completed" apart from "this row was deleted".
//
// Fields:
//   type                - short label shown to the client, e.g. "renewal"
//   table               - source table name
//   idCol               - primary key column, aliased to source_id
//   titleExpr           - SQL expression for the display title
//   dueDateExpr         - the hard deadline column (SQL DATE/TEXT expression)
//   leadDaysExpr        - SQL expression for days before due_date this
//                         should start appearing in the live feed. '0' for
//                         point-in-time items.
//   familyMemberExpr    - column name, or the literal 'NULL' if the table
//                         doesn't track a family_members FK.
//   priorityExpr        - SQL expression, must resolve to 'low'/'medium'/'high'.
//                         Use "'low'" (quoted literal) for tables with no
//                         priority column.
//   statusExpr          - raw copy of the source's own status column, or
//                         the literal 'NULL' if it has no status concept.
//   completedAtExpr     - SQL expression: a timestamp when this row counts
//                         as done, else NULL. Drives whether it's cleared
//                         off the reminder card.
//   expiresAtExpr       - SQL expression: display cutoff after which this
//                         stops showing even if never completed (events,
//                         appointments). literal 'NULL' if it should stay
//                         until manually completed.
//   requiredWhere       - condition that must hold for the row to be
//                         syncable at all (e.g. NOT NULL due_date, since
//                         reminder.due_date is NOT NULL) — applied to BOTH
//                         the live feed and the sync query.
//   activeWhere         - condition to hide finished/inactive rows —
//                         applied ONLY to the live feed query, never to sync.
const REMINDER_SOURCES = [
  {
    type: "event",
    table: "events",
    idCol: "id",
    // person_name is NOT NULL and reliable; the free-text `title` column
    // is optional and often already contains the person's name (e.g.
    // "Mom's Birthday"), so building off it risks duplication like
    // "Mom's Mom's Birthday". event_type is a controlled, always-populated
    // vocabulary (birthday/anniversary/other) — use that instead.
    titleExpr: "person_name || '''s ' || event_type",
    dueDateExpr: "event_date",
    leadDaysExpr: "0",
    familyMemberExpr: "NULL",
    priorityExpr: "'low'",
    statusExpr: "NULL", // events have no workflow status
    completedAtExpr: "NULL", // events are never "completed", only expired
    expiresAtExpr: "date(event_date, '+2 days')",
    requiredWhere: null,
    // active = 1 is a soft-delete flag, not a "finished" state — a
    // deactivated event's reminder row should be removed entirely (sync
    // job treats "row not found" as a delete signal), so this stays in
    // requiredWhere rather than activeWhere.
  },
  {
    type: "goal",
    table: "goals",
    idCol: "id",
    titleExpr: "title",
    dueDateExpr: "target_date",
    leadDaysExpr: "0",
    familyMemberExpr: "family_member_id",
    priorityExpr: "COALESCE(priority, 'low')",
    statusExpr: "status",
    completedAtExpr:
      "CASE WHEN status IN ('completed', 'abandoned') THEN COALESCE(completed_on, updated_at) ELSE NULL END",
    expiresAtExpr: "NULL",
    // target_date can be NULL (long-term goals with only a year/quarter) —
    // reminder.due_date is NOT NULL, so those genuinely can't be synced yet.
    requiredWhere: "target_date IS NOT NULL",
    activeWhere: "status NOT IN ('completed', 'abandoned')",
  },
  {
    type: "renewal",
    table: "renewals",
    idCol: "id",
    titleExpr: "title",
    dueDateExpr: "expiry_date",
    leadDaysExpr: "reminder_days_before", // per-row lead time, already on the table
    familyMemberExpr: "family_member_id",
    priorityExpr: "'low'", // renewals has no priority column
    statusExpr: "status",
    // 'expired' is NOT completed — it still needs action (renew it).
    // Only 'renewed'/'cancelled' are a done deal.
    completedAtExpr:
      "CASE WHEN status IN ('renewed', 'cancelled') THEN updated_at ELSE NULL END",
    expiresAtExpr: "NULL",
    requiredWhere: null,
    activeWhere: "status = 'active'",
  },
  {
    type: "appointment",
    table: "appointments",
    idCol: "id",
    titleExpr: "title",
    dueDateExpr: "appointment_datetime",
    leadDaysExpr: "0",
    familyMemberExpr: "family_member_id",
    priorityExpr: "'low'", // appointments has no priority column
    statusExpr: "status",
    completedAtExpr: "CASE WHEN status = 'completed' THEN updated_at ELSE NULL END",
    expiresAtExpr: "date(appointment_datetime, '+7 days')",
    requiredWhere: null,
    activeWhere: "status != 'cancelled'",
  },
  {
    type: "todo_task",
    table: "todo_task",
    idCol: "id",
    titleExpr: "title",
    dueDateExpr: "target_date",
    leadDaysExpr: "0",
    familyMemberExpr: "family_member_id",
    priorityExpr: "priority", // already 'low'/'medium'/'high', NOT NULL
    statusExpr: "status",
    completedAtExpr:
      "CASE WHEN status = 'done' THEN COALESCE(completion_date, updated_at) ELSE NULL END",
    expiresAtExpr: "NULL",
    // target_date is nullable — same NOT NULL constraint issue as goals.
    requiredWhere: "target_date IS NOT NULL",
    activeWhere: "status != 'done'",
  },
  {
    type: "routine",
    table: "daily_routine_temp",
    // id now equals routine_id (see routineRepository.js's runDailyReset
    // change) — stable across days, so this is a safe sync key.
    idCol: "id",
    titleExpr: "title",
    // This table has no date column — it only ever holds *today's* rows
    // (wiped and regenerated daily), so "today" is always the correct due
    // date for whatever's currently in it.
    dueDateExpr: "date('now')",
    leadDaysExpr: "0",
    familyMemberExpr: "family_member_id",
    priorityExpr: "'low'", // no priority column on this table
    statusExpr: "status", // always 'new' in practice — see completedAtExpr note
    // markDone/markSkipped DELETE the row instead of flipping status, so a
    // "completed" routine is never actually present here to compute a
    // completed_at from — its absence (caught by getSyncRow returning
    // undefined) is what triggers removeReminder() instead.
    completedAtExpr: "NULL",
    expiresAtExpr: "NULL",
    requiredWhere: null,
    activeWhere: null,
  },
];

module.exports = { REMINDER_SOURCES };
