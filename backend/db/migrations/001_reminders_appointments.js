// Migration 001: extend `reminders` with priority/is_completed/family_member_id,
// and rename `doctor_appointment` -> `appointments` (+ category column).
//
// Safe to run on every server boot: each step checks current state first
// (via PRAGMA table_info / sqlite_master) and is skipped if already applied.
// Progress is also recorded in `app_state` so we short-circuit entirely once
// this migration has fully run.
//
// Takes a better-sqlite3 `db` handle (synchronous API) — called from
// sqliteDriver.js right after the schema files are executed.

const MIGRATION_KEY = "migration_001_reminders_appointments";

function columnExists(db, table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}

function tableExists(db, table) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  return Boolean(row);
}

function run(db) {
  const already = db
    .prepare("SELECT value FROM app_state WHERE key = ?")
    .get(MIGRATION_KEY);
  if (already) {
    return; // already applied, nothing to do
  }

  const steps = [];

  // 1. reminders: add priority, is_completed, family_member_id
  if (tableExists(db, "reminders")) {
    if (!columnExists(db, "reminders", "priority")) {
      steps.push(
        "ALTER TABLE reminders ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'"
      );
    }
    if (!columnExists(db, "reminders", "is_completed")) {
      steps.push(
        "ALTER TABLE reminders ADD COLUMN is_completed INTEGER NOT NULL DEFAULT 0"
      );
    }
    if (!columnExists(db, "reminders", "family_member_id")) {
      steps.push(
        "ALTER TABLE reminders ADD COLUMN family_member_id INTEGER REFERENCES family_members(id)"
      );
    }
  }

  // 2. doctor_appointment -> appointments (+ category)
  if (tableExists(db, "doctor_appointment") && !tableExists(db, "appointments")) {
    steps.push("ALTER TABLE doctor_appointment RENAME TO appointments");
  }
  if (tableExists(db, "appointments") && !columnExists(db, "appointments", "category")) {
    steps.push(
      "ALTER TABLE appointments ADD COLUMN category TEXT NOT NULL DEFAULT 'Doctor'"
    );
  }

  const applyAll = db.transaction(() => {
    for (const sql of steps) {
      console.log(`[migration 001] ${sql}`);
      db.exec(sql);
    }
    db.prepare(
      "INSERT INTO app_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(MIGRATION_KEY, new Date().toISOString());
  });

  applyAll();

  if (steps.length > 0) {
    console.log(`[migration 001] applied ${steps.length} step(s)`);
  } else {
    console.log("[migration 001] nothing to do, marked as applied");
  }
}

module.exports = { run };
