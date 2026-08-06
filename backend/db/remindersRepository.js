const db = require("./connection");
const { REMINDER_SOURCES } = require("./reminderSources");

// One SELECT per source, unioned together. window_start is when this item
// should start appearing (due_date - lead_days); due_date is the hard
// deadline. Point-in-time sources (events/goals/appointments) have
// window_start === due_date since their leadDaysExpr is '0'.
function buildUnionQuery() {
  const selects = REMINDER_SOURCES.map((src) => {
    const whereClause = src.where ? ` WHERE ${src.where}` : "";
    return `
      SELECT
        '${src.type}' AS source_type,
        ${src.idCol} AS source_id,
        ${src.titleExpr} AS title,
        date(${src.dueDateExpr}, '-' || ${src.leadDaysExpr} || ' days') AS window_start,
        ${src.dueDateExpr} AS due_date,
        ${src.familyMemberExpr} AS family_member_id
      FROM ${src.table}${whereClause}
    `;
  });
  return selects.join(" UNION ALL ");
}

// Returns every reminder whose [window_start, due_date] range overlaps
// [from, to] — this is what makes a renewal with a long lead time appear
// across many days/buckets, not just once on its exact due date.
async function getReminders({ from, to }) {
  const sql = `
    SELECT * FROM (${buildUnionQuery()})
    WHERE window_start <= ? AND due_date >= ?
    ORDER BY due_date ASC
  `;
  return db.all(sql, [to, from]);
}

module.exports = { getReminders };
