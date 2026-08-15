const db = require('./connection');
const sectionConfig = require('./sectionConfig');
const { REMINDER_SOURCES } = require('./reminderSources');
const { syncReminder, removeReminder } = require('./remindersRepository');

// tableName -> reminder source_type, e.g. 'goals' -> 'goal'. Only tables
// that are actually reminder sources show up here (bills/library/etc are
// not, so they're simply skipped below).
const TABLE_TO_SOURCE_TYPE = REMINDER_SOURCES.reduce((map, src) => {
  map[src.table] = src.type;
  return map;
}, {});

async function syncReminderForSection(cfg, id) {
  const sourceType = TABLE_TO_SOURCE_TYPE[cfg.tableName];
  if (!sourceType) return; // this section isn't a reminder source
  try {
    await syncReminder(sourceType, id);
  } catch (err) {
    console.error(`[sectionRepository] syncReminder failed for ${sourceType} ${id}:`, err.message);
  }
}

async function removeReminderForSection(cfg, id) {
  const sourceType = TABLE_TO_SOURCE_TYPE[cfg.tableName];
  if (!sourceType) return;
  try {
    await removeReminder(sourceType, id);
  } catch (err) {
    console.error(`[sectionRepository] removeReminder failed for ${sourceType} ${id}:`, err.message);
  }
}

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
      if (typeof next[col] === 'string' && next[col]) {
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
  let sql = `SELECT ${cfg.select || '*'} FROM ${cfg.tableName}`;
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
    if (values[col] === undefined || values[col] === null || values[col] === '') {
      const err = new Error(`${col} is required`);
      err.status = 400;
      throw err;
    }
  }

  const cols = cfg.columns.filter((c) => values[c] !== undefined && values[c] !== '');
  const placeholders = cols.map(() => '?').join(', ');
  const params = cols.map((c) => {
    const v = values[c];
    // Object-valued fields (e.g. renewals.attributes) are stored as JSON text.
    return v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
  });

  const sql = `INSERT INTO ${cfg.tableName} (${cols.join(', ')}) VALUES (${placeholders})`;
  const result = await db.run(sql, params);
  await syncReminderForSection(cfg, result.lastID);
  return { id: result.lastID };
}

async function updateRecord(sectionKey, id, values) {
  const cfg = getConfig(sectionKey);

  if (sectionKey === 'goals' && values.status !== undefined) {
    if (values.status === 'completed') {
      values.completed_on = values.completed_on ?? new Date().toISOString().slice(0, 10);
    } else if (values.status === 'abandoned') {
      values.completed_on = null;
    }
  }

  if (cfg.columns.includes('updated_at')) {
    values.updated_at = new Date().toISOString();
  }

  const cols = cfg.columns.filter((c) => values[c] !== undefined);
  if (cols.length === 0) {
    const err = new Error('No updatable fields provided');
    err.status = 400;
    throw err;
  }

  const setClause = cols.map((c) => `${c} = ?`).join(', ');
  const params = cols.map((c) => {
    const v = values[c];
    return v !== null && typeof v === 'object' ? JSON.stringify(v) : v;
  });
  params.push(id);

  const sql = `UPDATE ${cfg.tableName} SET ${setClause} WHERE id = ?`;
  const result = await db.run(sql, params);
  await syncReminderForSection(cfg, id);
  return { changes: result.changes };
}

async function deleteRecord(sectionKey, id) {
  const cfg = getConfig(sectionKey);
  const sql = `DELETE FROM ${cfg.tableName} WHERE id = ?`;
  const result = await db.run(sql, [id]);
  await removeReminderForSection(cfg, id);
  return { changes: result.changes };
}

module.exports = { listRecords, insertRecord, updateRecord, deleteRecord };
