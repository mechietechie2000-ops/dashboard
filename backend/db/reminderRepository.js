const db = require("./connection");
const { REMINDER_SOURCES } = require("./reminderSources");

// ---------------------------------------------------------------------
// Query builders — read from the 5 source tables via REMINDER_SOURCES.
// ---------------------------------------------------------------------
//
// buildLiveFeedQuery() - requiredWhere AND activeWhere. What the
//   Reminder card shows: hides completed/inactive rows.
// buildSyncQuery()     - requiredWhere only. What the sync functions below
//   use: must still see a row the instant it becomes completed so
//   completed_at can be recorded, or a just-finished row would be
//   indistinguishable from a deleted one.
function buildSelect(src, { includeActiveWhere }) {
  const wheres = [];
  if (src.requiredWhere) wheres.push(`(${src.requiredWhere})`);
  if (includeActiveWhere && src.activeWhere) wheres.push(`(${src.activeWhere})`);
  const whereClause = wheres.length ? ` WHERE ${wheres.join(" AND ")}` : "";

  return `
    SELECT
      '${src.type}' AS source,
      ${src.idCol} AS source_id,
      ${src.titleExpr} AS title,
      date(${src.dueDateExpr}, '-' || ${src.leadDaysExpr} || ' days') AS window_start,
      ${src.dueDateExpr} AS due_date,
      ${src.familyMemberExpr} AS family_member_id,
      ${src.priorityExpr} AS priority,
      ${src.statusExpr} AS status,
      ${src.completedAtExpr} AS completed_at,
      ${src.expiresAtExpr} AS expires_at
    FROM ${src.table}${whereClause}
  `;
}

function buildLiveFeedQuery() {
  return REMINDER_SOURCES.map((src) => buildSelect(src, { includeActiveWhere: true })).join(
    " UNION ALL "
  );
}

function buildSyncQuery() {
  return REMINDER_SOURCES.map((src) => buildSelect(src, { includeActiveWhere: false })).join(
    " UNION ALL "
  );
}

// Every reminder whose [window_start, due_date] range overlaps [from, to].
async function getReminders({ from, to }) {
  const sql = `
    SELECT * FROM (${buildLiveFeedQuery()})
    WHERE window_start <= ? AND due_date >= ?
    ORDER BY due_date ASC
  `;
  return db.all(sql, [to, from]);
}

// Single source row (sync query - requiredWhere only), used by
// syncReminder() to decide upsert vs remove.
async function getSyncRow(sourceType, sourceId) {
  const src = REMINDER_SOURCES.find((s) => s.type === sourceType);
  if (!src) throw new Error(`Unknown reminder source type: ${sourceType}`);
  const sql = `SELECT * FROM (${buildSelect(src, { includeActiveWhere: false })}) WHERE source_id = ?`;
  return db.get(sql, [sourceId]);
}

// All rows across all sources (sync query) - used by syncAllReminders().
async function getAllSyncRows() {
  return db.all(buildSyncQuery());
}

// Reads the PHYSICAL reminder table (not the live union) — this is what
// the frontend Reminder card should call. reminder_feed/getReminders()
// above stays reserved for the sync job and the original prototype route.
async function getCardReminders({ from, to } = {}) {
  const wheres = ["completed_at IS NULL"];
  const params = [];
  if (to) {
    wheres.push("window_start <= ?");
    params.push(to);
  }
  if (from) {
    wheres.push("due_date >= ?");
    params.push(from);
  }
  const sql = `
    SELECT * FROM reminder
    WHERE ${wheres.join(" AND ")}
    ORDER BY due_date ASC
  `;
  return db.all(sql, params);
}

// ---------------------------------------------------------------------
// Sync writes — keep the persisted `reminder` table in step with the
// 5 source tables. Called right after every create/update/delete of a
// source row (see sectionRepository.js, routineRepository.js).
// ---------------------------------------------------------------------

// Upsert the reminder row for one source/source_id, or remove it if the
// row no longer qualifies (deleted, or fails requiredWhere).
async function syncReminder(sourceType, sourceId) {
  const row = await getSyncRow(sourceType, sourceId);
  if (!row) {
    return removeReminder(sourceType, sourceId);
  }

  const sql = `
    INSERT INTO reminder
      (source, source_id, title, window_start, due_date, family_member_id, priority, status, completed_at, expires_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(source, source_id) DO UPDATE SET
      title = excluded.title,
      window_start = excluded.window_start,
      due_date = excluded.due_date,
      family_member_id = excluded.family_member_id,
      priority = excluded.priority,
      status = excluded.status,
      completed_at = excluded.completed_at,
      expires_at = excluded.expires_at,
      updated_at = CURRENT_TIMESTAMP
  `;
  await db.run(sql, [
    row.source,
    row.source_id,
    row.title,
    row.window_start,
    row.due_date,
    row.family_member_id,
    row.priority,
    row.status,
    row.completed_at,
    row.expires_at,
  ]);
  return { ok: true };
}

async function removeReminder(sourceType, sourceId) {
  await db.run(`DELETE FROM reminder WHERE source = ? AND source_id = ?`, [
    sourceType,
    sourceId,
  ]);
  return { ok: true };
}

// Bulk resync across all sources + orphan cleanup. Intended for a future
// nightly job as a safety net in case a sync-on-write call was missed.
async function syncAllReminders() {
  const liveRows = await getAllSyncRows();
  const seen = new Set();

  for (const row of liveRows) {
    seen.add(`${row.source}:${row.source_id}`);
    await syncReminder(row.source, row.source_id);
  }

  // Orphan cleanup: any reminder row whose source/source_id no longer
  // appears in any source table's sync query (row was hard-deleted).
  const existing = await db.all(`SELECT source, source_id FROM reminder`);
  let removed = 0;
  for (const r of existing) {
    if (!seen.has(`${r.source}:${r.source_id}`)) {
      await removeReminder(r.source, r.source_id);
      removed += 1;
    }
  }

  return { synced: liveRows.length, removed };
}

module.exports = {
  buildLiveFeedQuery,
  buildSyncQuery,
  getReminders,
  getSyncRow,
  getAllSyncRows,
  getCardReminders,
  syncReminder,
  removeReminder,
  syncAllReminders,
};