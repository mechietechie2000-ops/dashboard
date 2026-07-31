//const sqlite3 = require("sqlite3").verbose();
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = path.resolve(__dirname, "..", "..", "routine.db");

/*
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("[sqliteDriver] connection error:", err.message);
  } else {
    console.log("[sqliteDriver] connected:", dbPath);
    // Auto-apply schema on first boot / after a fresh checkout
    const schemaPath = path.resolve(__dirname, "..", "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf8");
    db.exec(schema, (schemaErr) => {
      if (schemaErr) console.error("[sqliteDriver] schema error:", schemaErr.message);
    });
  }
}); */

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


function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

module.exports = { all, run, get };
