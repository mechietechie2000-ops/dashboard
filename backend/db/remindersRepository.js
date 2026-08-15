const db = require('./connection');
const { REMINDER_SOURCES } = require('./reminderSources');

function sourceConfig(sourceType) {
  const cfg = REMINDER_SOURCES.find((s) => s.type === sourceType);
  if (!cfg) {
    const err = new Error(`Unknown reminder source: ${sourceType}`);
    err.status = 400;
    throw err;
  }
  return cfg;
}

// One SELECT per source, unioned together. window_start is when this item
// should start appearing (due_date - lead_days); due_date is the hard
// deadline. Point-in-time sources (events/goals/appointments/todo_task/
// routine) have window_start === due_date since their leadDaysExpr is '0'.
function selectFor(src, { includeCompletedAt = false } = {}) {
  return `
    SELECT
      '${src.type}' AS source_type,
      ${src.idCol} AS source_id,
      ${src.titleExpr} AS title,
      date(${src.dueDateExpr}, '-' || ${src.leadDaysExpr} || ' days') AS window_start,
      ${src.dueDateExpr} AS due_date,
      ${src.familyMemberExpr} AS family_member_id,
      ${src.priorityExpr} AS priority,
      ${src.statusExpr} AS status,
      ${includeCompletedAt ? src.completedAtExpr : 'NULL'} AS completed_at,
      ${src.expiresAtExpr} AS expires_at
    FROM ${src.table}
  `;
}

// Live feed: hides completed/inactive rows via each source's activeWhere.
// `sources` optionally restricts to a subset of source types (used to let
// a source, e.g. goals, be excluded from the card without a code change).
function buildLiveFeedQuery(sources) {
  const list = REMINDER_SOURCES.filter(
    (s) => (sources ? sources.includes(s.type) : s.includeInLiveFeedByDefault)
  );
  const selects = list.map((src) => {
    const where = [src.requiredWhere, src.activeWhere].filter(Boolean).join(' AND ');
    return `${selectFor(src)} WHERE ${where}`;
  });
  return selects.join(' UNION ALL ');
}

// Sync query: only requiredWhere, no activeWhere — the sync must still be
// able to see a row the moment it becomes completed (to record
// completed_at), whereas the live feed should hide it by then. Using one
// query for both would make a just-completed row indistinguishable from a
// deleted one.
function buildSyncQuery(sourceType) {
  const sources = sourceType ? [sourceConfig(sourceType)] : REMINDER_SOURCES;
  const selects = sources.map((src) => {
    const where = src.requiredWhere;
    return `${selectFor(src, { includeCompletedAt: true })} WHERE ${where}`;
  });
  return selects.join(' UNION ALL ');
}

// Returns every reminder whose [window_start, due_date] range overlaps
// [from, to] — this is what makes a renewal with a long lead time appear
// across many days/buckets, not just once on its exact due date.
// Backed by the live feed (source tables directly), NOT the physical
// reminder table — see getReminderCard() for that.
async function getReminders({ from, to, sources } = {}) {
  const sql = `
    SELECT * FROM (${buildLiveFeedQuery(sources)})
    WHERE window_start <= ? AND due_date >= ?
    ORDER BY due_date ASC
  `;
  return db.all(sql, [to, from]);
}

// One source row, via the sync query (requiredWhere only, includes
// completed_at) — used by syncReminder to decide upsert vs remove.
async function getSyncRow(sourceType, sourceId) {
  const src = sourceConfig(sourceType);
  const sql = `SELECT * FROM (${buildSyncQuery(sourceType)}) WHERE source_id = ?`;
  return db.get(sql, [sourceId]);
}

async function getAllSyncRows() {
  return db.all(`SELECT * FROM (${buildSyncQuery()})`);
}

// ---------------------------------------------------------------------
// Persisted `reminder` table sync. Source of truth stays in the source
// tables — this only mirrors it, plus the notify/mute/snooze columns the
// source tables don't have.
// ---------------------------------------------------------------------

async function upsertReminderRow(row) {
  await db.run(
    `INSERT INTO reminder
       (source_type, source_id, title, window_start, due_date, family_member_id,
        priority, status, completed_at, expires_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(source_type, source_id) DO UPDATE SET
       title = excluded.title,
       window_start = excluded.window_start,
       due_date = excluded.due_date,
       family_member_id = excluded.family_member_id,
       priority = excluded.priority,
       status = excluded.status,
       completed_at = excluded.completed_at,
       expires_at = excluded.expires_at,
       updated_at = CURRENT_TIMESTAMP`,
    [
      row.source_type,
      row.source_id,
      row.title,
      row.window_start,
      row.due_date,
      row.family_member_id,
      row.priority,
      row.status,
      row.completed_at,
      row.expires_at,
    ]
  );
}

// Upsert one reminder from its source row, or remove it if the source row
// no longer qualifies (e.g. it was deleted, or its dueDateExpr went NULL).
// Call this right after every create/update/delete of a source row.
async function syncReminder(sourceType, sourceId) {
  sourceConfig(sourceType); // validates sourceType, throws if unknown
  const row = await getSyncRow(sourceType, sourceId);
  if (!row) {
    await removeReminder(sourceType, sourceId);
    return { removed: true };
  }
  await upsertReminderRow(row);
  return { synced: true };
}

async function removeReminder(sourceType, sourceId) {
  const result = await db.run(`DELETE FROM reminder WHERE source_type = ? AND source_id = ?`, [
    sourceType,
    sourceId,
  ]);
  return { removed: result.changes > 0 };
}

// Bulk resync + orphan cleanup — a safety net for a nightly job, in case
// any sync-on-write call was missed (crash between the source write and
// the sync call, a code path that forgot to call syncReminder, etc).
async function syncAllReminders() {
  const rows = await getAllSyncRows();
  for (const row of rows) {
    await upsertReminderRow(row);
  }

  // Orphans: reminder rows whose source row no longer exists at all (a
  // real DELETE that, for whatever reason, never called removeReminder).
  // Rows that still exist but are now completed/inactive are NOT orphans
  // — they're in `rows` above with completed_at set, which is exactly the
  // history-for-free behavior the live feed's activeWhere filters out.
  const existing = new Set(rows.map((r) => `${r.source_type}:${r.source_id}`));
  const current = await db.all(`SELECT source_type, source_id FROM reminder`);
  let orphansRemoved = 0;
  for (const { source_type, source_id } of current) {
    if (!existing.has(`${source_type}:${source_id}`)) {
      await removeReminder(source_type, source_id);
      orphansRemoved += 1;
    }
  }

  return { synced: rows.length, orphansRemoved };
}

// ---------------------------------------------------------------------
// Reminder card: queries the physical `reminder` table directly (not the
// live union above, which is only meant for the sync job and the original
// prototype /api/reminders endpoint) with WHERE completed_at IS NULL.
// `sources` optionally restricts which source types show up, so a source
// (e.g. goals) can be toggled off from the card without a code change —
// the reminder table still has it synced, it's just not selected here.
// ---------------------------------------------------------------------
async function getReminderCard({ from, to, sources } = {}) {
  const params = [];
  let sql = `SELECT * FROM reminder WHERE completed_at IS NULL`;
  if (sources && sources.length) {
    sql += ` AND source_type IN (${sources.map(() => '?').join(', ')})`;
    params.push(...sources);
  }
  // Same overlap semantics as getReminders(): a reminder shows up if its
  // [window_start, due_date] range overlaps [from, to] at all.
  if (to) {
    sql += ` AND (window_start IS NULL OR window_start <= ?)`;
    params.push(to);
  }
  if (from) {
    sql += ` AND due_date >= ?`;
    params.push(from);
  }
  sql += ` ORDER BY due_date ASC`;
  return db.all(sql, params);
}

module.exports = {
  buildLiveFeedQuery,
  buildSyncQuery,
  getReminders,
  getSyncRow,
  getAllSyncRows,
  syncReminder,
  removeReminder,
  syncAllReminders,
  getReminderCard,
};
