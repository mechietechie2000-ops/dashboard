const db = require("./connection");
const sectionConfig = require("./sectionConfig");
const { REMINDER_SOURCES } = require("./reminderSources");
const reminderRepo = require("./reminderRepository");

// Reverse lookup: source table name -> reminder source type, so any
// section whose table is a reminder source gets synced automatically
// without each call site needing to know about reminders.
const TABLE_TO_REMINDER_TYPE = Object.fromEntries(
  REMINDER_SOURCES.map((s) => [s.table, s.type])
);

function getConfig(sectionKey) {
  const cfg = sectionConfig[sectionKey];
  if (!cfg) {
    const err = new Error(`Unknown section: ${sectionKey}`);
    err.status = 404;
    throw err;
  }
  return cfg;
}

function parseJsonColumns(cfg, rows) {
  if (!cfg.jsonColumns || cfg.jsonColumns.length === 0) return rows;
  return rows.map((row) => {
    const next = { ...row };
    for (const col of cfg.jsonColumns) {
      if (typeof next[col] === "string" && next[col]) {
        try {
          next[col] = JSON.parse(next[col]);
        } catch {
          // leave as-is if it's not valid JSON (e.g. legacy/blank data)
        }
      }
    }
    return next;
  });
}

async function listRecords(sectionKey, { limit } = {}) {
  const cfg = getConfig(sectionKey);
  // `select`/`joins` are optional per-section overrides (see sectionConfig.js)
  // for sections that need to resolve a foreign key to a display value, e.g.
  // renewals.family_member_id -> family_members.first_name.
  let sql = `SELECT ${cfg.select || "*"} FROM ${cfg.tableName}`;
  if (cfg.joins) sql += ` ${cfg.joins}`;
  if (cfg.where) sql += ` WHERE ${cfg.where}`;
  sql += ` ORDER BY ${cfg.orderBy}`;
  if (limit) sql += ` LIMIT ${Number(limit)}`;
  const rows = await db.all(sql);
  return parseJsonColumns(cfg, rows);
}

async function insertRecord(sectionKey, values) {
  const cfg = getConfig(sectionKey);

  for (const col of cfg.requiredColumns) {
    if (values[col] === undefined || values[col] === null || values[col] === "") {
      const err = new Error(`${col} is required`);
      err.status = 400;
      throw err;
    }
  }

  const cols = cfg.columns.filter((c) => values[c] !== undefined && values[c] !== "");
  const placeholders = cols.map(() => "?").join(", ");
  const params = cols.map((c) => {
    const v = values[c];
    // Object-valued fields (e.g. renewals.attributes) are stored as JSON text.
    return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
  });

  const sql = `INSERT INTO ${cfg.tableName} (${cols.join(", ")}) VALUES (${placeholders})`;
  const result = await db.run(sql, params);

  const reminderType = TABLE_TO_REMINDER_TYPE[cfg.tableName];
  if (reminderType) {
    await reminderRepo.syncReminder(reminderType, result.lastID);
  }

  return { id: result.lastID };
}

async function updateRecord(sectionKey, id, values) {
  const cfg = getConfig(sectionKey);

  const cols = cfg.columns.filter((c) => values[c] !== undefined);
  if (cols.length === 0) {
    const err = new Error("No updatable fields provided");
    err.status = 400;
    throw err;
  }

  const setClause = cols.map((c) => `${c} = ?`).join(", ");
  const params = cols.map((c) => {
    const v = values[c];
    return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
  });
  params.push(id);

  const sql = `UPDATE ${cfg.tableName} SET ${setClause} WHERE id = ?`;
  const result = await db.run(sql, params);

  const reminderType = TABLE_TO_REMINDER_TYPE[cfg.tableName];
  if (reminderType) {
    await reminderRepo.syncReminder(reminderType, id);
  }

  return { changes: result.changes };
}

async function deleteRecord(sectionKey, id) {
  const cfg = getConfig(sectionKey);
  const sql = `DELETE FROM ${cfg.tableName} WHERE id = ?`;
  const result = await db.run(sql, [id]);

  const reminderType = TABLE_TO_REMINDER_TYPE[cfg.tableName];
  if (reminderType) {
    await reminderRepo.removeReminder(reminderType, id);
  }

  return { changes: result.changes };
}

module.exports = { listRecords, insertRecord, updateRecord, deleteRecord };
