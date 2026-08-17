const db = require('./connection');
const { syncReminder, removeReminder } = require('./remindersRepository');

const DAY_ABBREV = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
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
    return { skipped: true, reason: 'already ran today' };
  }

  // 1. Log anything left over from the previous cycle that was never marked
  const unmarked = await db.all(`SELECT * FROM daily_routine_temp WHERE status = 'new'`);
  
  for (const row of unmarked) {
    const member = row.family_member_id
      ? await db.get(`SELECT first_name FROM family_members WHERE id = ?`, [row.family_member_id])
      : null;
    await db.run(
      `INSERT INTO daily_routine_log (routine_id, title, person, family_member_id, log_date, status, reason)
       VALUES (?, ?, ?, ?, ?, 'no_action', 'NO ACTION TAKEN')`,
      [
        row.routine_id,
        row.title,
        member?.first_name || 'Unassigned',
        row.family_member_id,
        today,
      ]
    );
  }

  // 2. Clear yesterday's working table
  await db.run(`DELETE FROM daily_routine_temp`);

  // 3. Populate today's tasks: every 'daily' task, plus 'weekly' tasks whose
  //    day_of_week list includes today
  const active = await db.all(`SELECT * FROM daily_routine WHERE active = 1`);
  const todaysTasks = active.filter(
    (r) =>
      r.frequency === 'daily' ||
      (r.frequency === 'weekly' &&
        (r.day_of_week || '')
          .split(',')
          .map((d) => d.trim())
          .includes(dayAbbrev))
  );
  for (const task of todaysTasks) {
    // id is inserted explicitly equal to routine_id (task.id), instead of
    // letting it autoincrement, so this routine's reminder keeps a stable
    // identity (source_id) across days instead of churning on every reset.
    await db.run(
      `INSERT INTO daily_routine_temp (id, routine_id, title, family_member_id, scheduled_time, status, mute, announce)
       VALUES (?, ?, ?, ?, ?, 'new', ?, ?)`,
      [task.id, task.id, task.title, task.family_member_id, task.scheduled_time, task.mute, task.announce]
    );
    try {
      await syncReminder('routine', task.id);
    } catch (err) {
      console.error(`[daily-reset] syncReminder failed for routine ${task.id}:`, err.message);
    }
  }

  // 3b. Clean up stale routine reminders: any reminder row still pointing
  // at a routine that didn't qualify for today (e.g. a weekly task whose
  // day_of_week doesn't include today) shouldn't linger in the Reminder
  // card since daily_routine_temp no longer has a matching row for it.
  const todaysIds = new Set(todaysTasks.map((t) => t.id));
  const staleRoutineReminders = await db.all(
    `SELECT source_id FROM reminder WHERE source_type = 'routine'`
  );
  for (const { source_id } of staleRoutineReminders) {
    if (!todaysIds.has(source_id)) {
      try {
        await removeReminder('routine', source_id);
      } catch (err) {
        console.error(`[daily-reset] removeReminder failed for routine ${source_id}:`, err.message);
      }
    }
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
  const rows = await db.all(`SELECT * FROM daily_routine_temp ORDER BY scheduled_time ASC`);
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
      return a.scheduled_time.localeCompare(b.scheduled_time);
    });
}

async function markDone(tempId) {
  const row = await db.get(`SELECT * FROM daily_routine_temp WHERE id = ?`, [tempId]);
  if (!row) throw new Error('Task not found');
  const member = row.family_member_id
    ? await db.get(`SELECT first_name FROM family_members WHERE id = ?`, [row.family_member_id])
    : null;
  await db.run(
    `INSERT INTO daily_routine_log (routine_id, title, person, family_member_id, log_date, status, reason)
     VALUES (?, ?, ?, ?, ?, 'done', NULL)`,
    [
      row.routine_id,
      row.title,
      member?.first_name || 'Unassigned',
      row.family_member_id,
      todayStr(),
    ]
  );
  await db.run(`DELETE FROM daily_routine_temp WHERE id = ?`, [tempId]);
  try {
    await removeReminder('routine', tempId);
  } catch (err) {
    console.error(`[markDone] removeReminder failed for routine ${tempId}:`, err.message);
  }
  return { ok: true };
}

async function markSkipped(tempId, reason) {
  console.log(reason);
  const row = await db.get(`SELECT * FROM daily_routine_temp WHERE id = ?`, [tempId]);
  if (!row) throw new Error('Task not found');
  const member = row.family_member_id
    ? await db.get(`SELECT first_name FROM family_members WHERE id = ?`, [row.family_member_id])
    : null;
  
  console.log("title: ", row.title);
  console.log("first_name: ", member?.first_name);
  console.log("family_member_id: ", row.family_member_id);

  await db.run(
    `INSERT INTO daily_routine_log (routine_id, title, person, family_member_id, log_date, status, reason)
     VALUES (?, ?, ?, ?, ?, 'skipped', ?)`,
    [
      row.routine_id,
      row.title,
      member?.first_name || 'Unassigned',
      row.family_member_id,
      todayStr(),
      reason
    ]
  );
  await db.run(`DELETE FROM daily_routine_temp WHERE id = ?`, [tempId]);
  try {
    await removeReminder('routine', tempId);
  } catch (err) {
    console.error(`[markSkipped] removeReminder failed for routine ${tempId}:`, err.message);
  }
  return { ok: true };
}
/*   const row = await db.get(`SELECT * FROM daily_routine_temp WHERE temp_id = ?`, [tempId]);
  if (!row) throw new Error('Task not found');
  if (!reason) throw new Error('A skip reason is required');
  await db.run(
    `INSERT INTO daily_routine_log (routine_id, title, person, log_date, status, reason)
     VALUES (?, ?, ?, ?, 'skipped', ?)`,
    [row.routine_id, row.title, row.person, todayStr(), reason]
  );
  await db.run(`DELETE FROM daily_routine_temp WHERE temp_id = ?`, [tempId]);
  return { ok: true };
} */

async function toggleMute(tempId) {
  const row = await db.get(`SELECT mute FROM daily_routine_temp WHERE id = ?`, [tempId]);
  if (!row) throw new Error('Task not found');
  await db.run(`UPDATE daily_routine_temp SET mute = ? WHERE id = ?`, [row.mute ? 0 : 1, tempId]);
  return { ok: true };
}

async function toggleAnnounce(tempId) {
  const row = await db.get(`SELECT announce FROM daily_routine_temp WHERE id = ?`, [tempId]);
  if (!row) throw new Error('Task not found');
  await db.run(`UPDATE daily_routine_temp SET announce = ? WHERE id = ?`, [
    row.announce ? 0 : 1,
    tempId,
  ]);
  return { ok: true };
}

async function snoozeTask(tempId, minutes = 10) {
  const until = new Date(Date.now() + minutes * 60000).toISOString();
  await db.run(`UPDATE daily_routine_temp SET snoozed_until = ? WHERE id = ?`, [until, tempId]);
  return { ok: true, until };
}

// ---------- Streaks ----------
// Consecutive days (ending today) where every logged task for this family_member_id was 'done'
async function getStreak(family_member_id) {
  const rows = await db.all(
    `SELECT log_date, status FROM daily_routine_log WHERE family_member_id = ? ORDER BY log_date DESC`,
    [family_member_id]
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
    if (statuses.every((s) => s === 'done')) {
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
  return db.all(`SELECT * FROM daily_routine WHERE active = 1 ORDER BY scheduled_time ASC`);
}

async function addRoutine(data) {
  const {
    title,
    family_member_id,
    frequency,
    day_of_week,
    scheduled_time,
    mute = 0,
    announce = 0,
  } = data;
  if (!title || !family_member_id || !frequency || !scheduled_time) {
    throw new Error('title, family_member_id, frequency, and scheduled_time are required');
  }
  const result = await db.run(
    `INSERT INTO daily_routine (title, family_member_id, frequency, day_of_week, scheduled_time, mute, announce, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      title,
      family_member_id,
      frequency,
      day_of_week || null,
      scheduled_time,
      mute ? 1 : 0,
      announce ? 1 : 0,
    ]
  );
  return { id: result.lastID };
}

async function updateRoutine(routineId, data) {
  const {
    title,
    family_member_id,
    frequency,
    day_of_week,
    scheduled_time,
    mute,
    announce,
    active,
  } = data;
  await db.run(
    `UPDATE daily_routine
     SET title = ?, family_member_id = ?, frequency = ?, day_of_week = ?, scheduled_time = ?,
         mute = ?, announce = ?, active = ?
     WHERE id = ?`,
    [
      title,
      family_member_id,
      frequency,
      day_of_week || null,
      scheduled_time,
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
  await db.run(`UPDATE daily_routine SET active = 0 WHERE id = ?`, [routineId]);
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
