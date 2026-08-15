// Run with: node test/reminderSync.test.js
// Overrides db/connection.js with an in-memory node:sqlite instance before
// any repository module is required, so every require('./connection') in
// the app resolves to the fake below.
const path = require('path');
const Module = require('module');

const fakeConnPath = require.resolve('./_fakeConnection');
const realConnPath = path.resolve(__dirname, '..', 'db', 'connection.js');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  const resolved = originalResolve.call(this, request, ...rest);
  return resolved === realConnPath ? fakeConnPath : resolved;
};

const fs = require('fs');
const conn = require('../db/connection');

let failures = 0;
function assert(cond, msg) {
  if (!cond) {
    failures++;
    console.error('FAIL:', msg);
  } else {
    console.log('ok  :', msg);
  }
}

async function main() {
  // Apply schema, same files/order as sqliteDriver.js
  conn._raw.exec(fs.readFileSync(path.resolve(__dirname, '..', 'db', 'home_dashboard_schema.sql'), 'utf8'));
  conn._raw.exec(fs.readFileSync(path.resolve(__dirname, '..', 'db', 'reminder_schema.sql'), 'utf8'));

  const sectionRepository = require('../db/sectionRepository');
  const remindersRepository = require('../db/remindersRepository');
  const routineRepository = require('../db/routineRepository');

  // ---- family member ----
  await conn.run(`INSERT INTO family_members (id, first_name) VALUES (1, 'Test Kid')`);

  // ---- goal / renewal / appointment / todo_task / event via sectionRepository (sync-on-write) ----
  const goal = await sectionRepository.insertRecord('goals', {
    title: 'Save for bike',
    category: 'financial',
    family_member_id: 1,
    target_date: '2026-09-01',
  });
  let r = await conn.get(`SELECT * FROM reminder WHERE source_type='goal' AND source_id=?`, [goal.id]);
  assert(r && r.title === 'Save for bike', 'goal insert -> reminder synced');

  await sectionRepository.updateRecord('goals', goal.id, { status: 'completed' });
  r = await conn.get(`SELECT * FROM reminder WHERE source_type='goal' AND source_id=?`, [goal.id]);
  assert(r && r.completed_at, 'goal completed -> completed_at set (row stays, history preserved)');

  const renewal = await sectionRepository.insertRecord('renewals', {
    category: 'Vehicle',
    title: 'Auto insurance',
    expiry_date: '2026-10-01',
    reminder_days_before: 30,
  });
  r = await conn.get(`SELECT * FROM reminder WHERE source_type='renewal' AND source_id=?`, [renewal.id]);
  assert(r && r.window_start === '2026-09-01', 'renewal insert -> sync, window_start = expiry - lead days');

  await sectionRepository.deleteRecord('renewals', renewal.id);
  r = await conn.get(`SELECT * FROM reminder WHERE source_type='renewal' AND source_id=?`, [renewal.id]);
  assert(!r, 'renewal delete -> reminder row removed');

  const appt = await sectionRepository.insertRecord('appointments', {
    category: 'doctor',
    title: 'Checkup',
    family_member_id: 1,
    appointment_datetime: '2026-09-15 10:30:00',
  });
  r = await conn.get(`SELECT * FROM reminder WHERE source_type='appointment' AND source_id=?`, [appt.id]);
  assert(r && r.due_date === '2026-09-15 10:30:00', 'appointment insert -> timestamp correct');

  const todo = await sectionRepository.insertRecord('todo_task', {
    title: 'File taxes',
    target_date: '2026-04-15',
  });
  r = await conn.get(`SELECT * FROM reminder WHERE source_type='todo_task' AND source_id=?`, [todo.id]);
  assert(r && r.priority === 'medium', 'todo_task insert -> synced with default priority');

  // ---- routine wiring (item #8) ----
  await conn.run(
    `INSERT INTO daily_routine (id, family_member_id, title, frequency, scheduled_time, active)
     VALUES (1, 1, 'Take vitamins', 'daily', '08:00', 1)`
  );
  await conn.run(
    `INSERT INTO daily_routine (id, family_member_id, title, frequency, day_of_week, scheduled_time, active)
     VALUES (2, 1, 'Water plants', 'weekly', 'MON', '09:00', 1)`
  );

  const resetResult = await routineRepository.runDailyReset();
  assert(resetResult.skipped === false, 'runDailyReset() runs without throwing (dead-code bug fixed)');

  const tempVitamins = await conn.get(`SELECT * FROM daily_routine_temp WHERE routine_id = 1`);
  assert(!!tempVitamins, 'daily_routine_temp populated for daily task');
  assert(tempVitamins && tempVitamins.id === 1, 'daily_routine_temp.id explicitly equals routine_id');

  r = await conn.get(`SELECT * FROM reminder WHERE source_type='routine' AND source_id=1`);
  assert(r && r.title === 'Take vitamins', 'routine temp row synced into reminder on daily reset');

  // markDone should delete the temp row AND remove the reminder
  await routineRepository.markDone(1);
  const tempAfterDone = await conn.get(`SELECT * FROM daily_routine_temp WHERE id = 1`);
  assert(!tempAfterDone, 'markDone deletes daily_routine_temp row');
  r = await conn.get(`SELECT * FROM reminder WHERE source_type='routine' AND source_id=1`);
  assert(!r, 'markDone -> removeReminder removed the routine reminder');

  // markSkipped should also clean up
  await conn.run(`DELETE FROM app_state WHERE key='last_reset_date'`); // allow a second reset for a clean re-test
  await conn.run(`DELETE FROM daily_routine_temp`);
  await routineRepository.runDailyReset();
  r = await conn.get(`SELECT * FROM reminder WHERE source_type='routine' AND source_id=1`);
  assert(r, 'reminder re-synced after second reset');
  await routineRepository.markSkipped(1, 'not feeling it');
  r = await conn.get(`SELECT * FROM reminder WHERE source_type='routine' AND source_id=1`);
  assert(!r, 'markSkipped -> removeReminder removed the routine reminder');

  // Weekly task (Water plants) only qualifies on Monday; stale-cleanup check:
  // simulate it having been a reminder yesterday, then not qualifying today.
  await conn.run(
    `INSERT INTO reminder (source_type, source_id, title, due_date, priority)
     VALUES ('routine', 999, 'Stale routine', date('now'), 'low')`
  );
  await conn.run(`DELETE FROM app_state WHERE key='last_reset_date'`);
  await conn.run(`DELETE FROM daily_routine_temp`);
  await routineRepository.runDailyReset();
  r = await conn.get(`SELECT * FROM reminder WHERE source_type='routine' AND source_id=999`);
  assert(!r, 'stale routine reminder (no longer qualifying) cleaned up by runDailyReset');

  // ---- reminder card ----
  const card = await remindersRepository.getReminderCard({ to: '2027-01-01' });
  const types = new Set(card.map((c) => c.source_type));
  assert(types.has('goal') === false, 'completed goal excluded from live card (completed_at set)');
  assert(types.has('appointment'), 'appointment shows up on the card');
  assert(types.has('todo_task'), 'todo_task shows up on the card');

  // ---- syncAllReminders bulk + orphan cleanup ----
  await conn.run(
    `INSERT INTO reminder (source_type, source_id, title, due_date, priority)
     VALUES ('todo_task', 99999, 'Ghost task', '2026-01-01', 'low')`
  );
  const bulk = await remindersRepository.syncAllReminders();
  r = await conn.get(`SELECT * FROM reminder WHERE source_type='todo_task' AND source_id=99999`);
  assert(!r, 'syncAllReminders orphan cleanup removes rows whose source no longer exists');
  assert(bulk.synced > 0, 'syncAllReminders resynced existing rows');

  console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('TEST SCRIPT ERROR:', err);
  process.exit(1);
});
