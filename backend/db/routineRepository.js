const db = require("./connection");

const DAY_ABBREV = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const todayStr = () => new Date().toISOString().slice(0, 10);

// ---------- Daily reset (the core scheduled workflow) ----------
//
// Idempotent by design: safe to call more than once on the same day, so it
// can be triggered by launchd, a node-cron backup, AND a manual "run now"
// button without risk of double-processing.
async function runDailyReset() {
  const today = todayStr();
  const dayAbbrev = DAY_ABBREV[new Date().getDay()];

  const state = await db.get(`SELECT value FROM app_state WHERE key = 'last_reset_date'`);
  if (state && state.value === today) {
    return { skipped: true, reason: "already ran today" };
  }

  // 1. Log anything left over from the previous cycle that was never marked
  const unmarked = await db.all(`SELECT * FROM daily_routine_temp WHERE status = 'new'`);
  for (const row of unmarked) {
    await db.run(
      `INSERT INTO daily_routine_log (routine_id, task_name, person, log_date, status, reason)
       VALUES (?, ?, ?, ?, 'no_action', 'NO ACTION TAKEN')`,
      [row.routine_id, row.task_name, row.person, today]
    );
  }

  // 2. Clear yesterday's working table
  await db.run(`DELETE FROM daily_routine_temp`);

  // 3. Populate today's tasks: every 'daily' task, plus 'weekly' tasks whose
  //    day_of_week list includes today
  const active = await db.all(`SELECT * FROM daily_routine WHERE active = 1`);
  const todaysTasks = active.filter(
    (r) =>
      r.frequency === "daily" ||
      (r.frequency === "weekly" &&
        (r.day_of_week || "")
          .split(",")
          .map((d) => d.trim())
          .includes(dayAbbrev))
  );
  for (const task of todaysTasks) {
    await db.run(
      `INSERT INTO daily_routine_temp (routine_id, task_name, person, task_time, status, mute, announce)
       VALUES (?, ?, ?, ?, 'new', ?, ?)`,
      [task.routine_id, task.task_name, task.person, task.task_time, task.mute, task.announce]
    );
  }

  // 4. Record that today's reset has run (upsert)
  await db.run(
    `INSERT INTO app_state (key, value) VALUES ('last_reset_date', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [today]
  );

  return { skipped: false, tasksLoaded: todaysTasks.length, unmarkedLogged: unmarked.length };
}

async function hasResetRunToday() {
  const state = await db.get(`SELECT value FROM app_state WHERE key = 'last_reset_date'`);
  return !!state && state.value === todayStr();
}

// ---------- Today's working list ----------
async function getTodayTasks() {
  const rows = await db.all(`SELECT * FROM daily_routine_temp ORDER BY task_time ASC`);
  const now = Date.now();
  return rows
    .map((r) => ({
      ...r,
      isSnoozed: !!r.snoozed_until && new Date(r.snoozed_until).getTime() > now,
    }))
    .sort((a, b) => {
      // Muted or snoozed tasks sink to the bottom, otherwise sort by time
      const aBottom = !!a.mute || a.isSnoozed;
      const bBottom = !!b.mute || b.isSnoozed;
      if (aBottom !== bBottom) return aBottom ? 1 : -1;
      return a.task_time.localeCompare(b.task_time);
    });
}

async function markDone(tempId) {
  const row = await db.get(`SELECT * FROM daily_routine_temp WHERE temp_id = ?`, [tempId]);
  if (!row) throw new Error("Task not found");
  await db.run(
    `INSERT INTO daily_routine_log (routine_id, task_name, person, log_date, status, reason)
     VALUES (?, ?, ?, ?, 'done', NULL)`,
    [row.routine_id, row.task_name, row.person, todayStr()]
  );
  await db.run(`DELETE FROM daily_routine_temp WHERE temp_id = ?`, [tempId]);
  return { ok: true };
}

async function markSkipped(tempId, reason) {
  const row = await db.get(`SELECT * FROM daily_routine_temp WHERE temp_id = ?`, [tempId]);
  if (!row) throw new Error("Task not found");
  if (!reason) throw new Error("A skip reason is required");
  await db.run(
    `INSERT INTO daily_routine_log (routine_id, task_name, person, log_date, status, reason)
     VALUES (?, ?, ?, ?, 'skipped', ?)`,
    [row.routine_id, row.task_name, row.person, todayStr(), reason]
  );
  await db.run(`DELETE FROM daily_routine_temp WHERE temp_id = ?`, [tempId]);
  return { ok: true };
}

async function toggleMute(tempId) {
  const row = await db.get(`SELECT mute FROM daily_routine_temp WHERE temp_id = ?`, [tempId]);
  if (!row) throw new Error("Task not found");
  await db.run(`UPDATE daily_routine_temp SET mute = ? WHERE temp_id = ?`, [row.mute ? 0 : 1, tempId]);
  return { ok: true };
}

async function toggleAnnounce(tempId) {
  const row = await db.get(`SELECT announce FROM daily_routine_temp WHERE temp_id = ?`, [tempId]);
  if (!row) throw new Error("Task not found");
  await db.run(`UPDATE daily_routine_temp SET announce = ? WHERE temp_id = ?`, [
    row.announce ? 0 : 1,
    tempId,
  ]);
  return { ok: true };
}

async function snoozeTask(tempId, minutes = 10) {
  const until = new Date(Date.now() + minutes * 60000).toISOString();
  await db.run(`UPDATE daily_routine_temp SET snoozed_until = ? WHERE temp_id = ?`, [until, tempId]);
  return { ok: true, until };
}

// ---------- Streaks ----------
// Consecutive days (ending today) where every logged task for this person was 'done'
async function getStreak(person) {
  const rows = await db.all(
    `SELECT log_date, status FROM daily_routine_log WHERE person = ? ORDER BY log_date DESC`,
    [person]
  );
  const byDate = {};
  for (const r of rows) {
    (byDate[r.log_date] ||= []).push(r.status);
  }
  let streak = 0;
  const cursor = new Date();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const dateStr = cursor.toISOString().slice(0, 10);
    const statuses = byDate[dateStr];
    if (!statuses || statuses.length === 0) break;
    if (statuses.every((s) => s === "done")) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ---------- Master routine CRUD (the recurring templates) ----------
async function listRoutines() {
  return db.all(`SELECT * FROM daily_routine WHERE active = 1 ORDER BY task_time ASC`);
}

async function addRoutine(data) {
  const { task_name, person, frequency, day_of_week, task_time, mute = 0, announce = 0 } = data;
  if (!task_name || !person || !frequency || !task_time) {
    throw new Error("task_name, person, frequency, and task_time are required");
  }
  const result = await db.run(
    `INSERT INTO daily_routine (task_name, person, frequency, day_of_week, task_time, mute, announce, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [task_name, person, frequency, day_of_week || null, task_time, mute ? 1 : 0, announce ? 1 : 0]
  );
  return { routine_id: result.lastID };
}

async function updateRoutine(routineId, data) {
  const { task_name, person, frequency, day_of_week, task_time, mute, announce, active } = data;
  await db.run(
    `UPDATE daily_routine
     SET task_name = ?, person = ?, frequency = ?, day_of_week = ?, task_time = ?,
         mute = ?, announce = ?, active = ?
     WHERE routine_id = ?`,
    [
      task_name,
      person,
      frequency,
      day_of_week || null,
      task_time,
      mute ? 1 : 0,
      announce ? 1 : 0,
      active === undefined ? 1 : active ? 1 : 0,
      routineId,
    ]
  );
  return { ok: true };
}

async function deleteRoutine(routineId) {
  // Soft delete so history in daily_routine_log stays intact
  await db.run(`UPDATE daily_routine SET active = 0 WHERE routine_id = ?`, [routineId]);
  return { ok: true };
}

module.exports = {
  runDailyReset,
  hasResetRunToday,
  getTodayTasks,
  markDone,
  markSkipped,
  toggleMute,
  toggleAnnounce,
  snoozeTask,
  getStreak,
  listRoutines,
  addRoutine,
  updateRoutine,
  deleteRoutine,
};
