// Test-only stand-in for db/connection.js, backed by node's built-in
// node:sqlite instead of better-sqlite3 (which can't build in this
// sandbox — no network access to nodejs.org for node-gyp headers).
// Same async contract: all/run/get.
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON;');

async function all(sql, params = []) {
  return db.prepare(sql).all(...params);
}

async function run(sql, params = []) {
  const info = db.prepare(sql).run(...params);
  return { lastID: Number(info.lastInsertRowid), changes: Number(info.changes) };
}

async function get(sql, params = []) {
  return db.prepare(sql).get(...params);
}

module.exports = { all, run, get, _raw: db };
