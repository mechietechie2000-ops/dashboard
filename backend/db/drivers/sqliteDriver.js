const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.resolve(__dirname, "..", "..", "routine.db");

// 1. Initialize better-sqlite3 (synchronous)
let db;
try {
  db = new Database(dbPath);
  console.log("[sqliteDriver] connected:", dbPath);

  // Enable WAL mode for better performance & concurrent read/write handling
  db.pragma("journal_mode = WAL");

  // 2. Read and apply schema
  const schemaPath = path.resolve(__dirname, "..", "schema.sql");
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, "utf8");
    db.exec(schema);
    console.log("[sqliteDriver] schema executed successfully");
  }
} catch (err) {
  console.error("[sqliteDriver] error:", err.message);
}

// 3. Implement driver methods matching connection interface using better-sqlite3
async function all(sql, params = []) {
  return db.prepare(sql).all(params);
}

async function run(sql, params = []) {
  const info = db.prepare(sql).run(params);
  return { lastID: info.lastInsertRowid, changes: info.changes };
}

async function get(sql, params = []) {
  return db.prepare(sql).get(params);
}

module.exports = { all, run, get };