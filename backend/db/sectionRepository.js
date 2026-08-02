const db = require("./connection");
const sectionConfig = require("./sectionConfig");

function getConfig(sectionKey) {
  const cfg = sectionConfig[sectionKey];
  if (!cfg) {
    const err = new Error(`Unknown section: ${sectionKey}`);
    err.status = 404;
    throw err;
  }
  return cfg;
}

async function listRecords(sectionKey, { limit } = {}) {
  const cfg = getConfig(sectionKey);
  let sql = `SELECT * FROM ${cfg.tableName}`;
  if (cfg.where) sql += ` WHERE ${cfg.where}`;
  sql += ` ORDER BY ${cfg.orderBy}`;
  if (limit) sql += ` LIMIT ${Number(limit)}`;
  return db.all(sql);
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
  const params = cols.map((c) => values[c]);

  const sql = `INSERT INTO ${cfg.tableName} (${cols.join(", ")}) VALUES (${placeholders})`;
  const result = await db.run(sql, params);
  return { id: result.lastID };
}

module.exports = { listRecords, insertRecord };
