const express = require("express");
const router = express.Router();
const repo = require("../db/reminderRepository");
const sectionRepo = require("../db/sectionRepository");
const routineRepo = require("../db/routineRepository");
const { authenticate } = require("../middleware/auth");

const handle = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
};

router.use(authenticate);

// GET /api/reminders?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns a flat, date-ordered list spanning every source table in
// reminderSources.js. Defaults to today through +400 days so the frontend
// can bucket into Today/This Week/This Month/.../Next Year from one call.
router.get(
  "/api/reminders",
  handle((req) => {
    const today = new Date().toISOString().slice(0, 10);
    const defaultTo = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const from = req.query.from || today;
    const to = req.query.to || defaultTo;
    return repo.getReminders({ from, to });
  })
);

// Preset bucket -> [from, to] ranges, mirrors the day math in
// frontend/src/utils/reminderBuckets.js so ?bucket=today etc. match what
// the client would compute itself. Week ends Saturday (Sun-Sat week),
// matching endOfWeek() there.
function bucketRange(bucket) {
  const now = new Date();
  const day0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const iso = (d) => d.toISOString().slice(0, 10);
  const addDays = (d, n) => new Date(d.getTime() + n * 24 * 60 * 60 * 1000);

  const day1 = addDays(day0, 1);
  const weekEnd = addDays(day0, 6 - day0.getDay());
  const nextWeekEnd = addDays(weekEnd, 7);

  switch (bucket) {
    case "today":
      return [iso(day0), iso(day0)];
    case "tomorrow":
      return [iso(day1), iso(day1)];
    case "this_week":
      return [iso(day0), iso(weekEnd)];
    case "next_week":
      return [iso(addDays(weekEnd, 1)), iso(nextWeekEnd)];
    default:
      return null;
  }
}

// GET /api/reminders/card?bucket=today|tomorrow|this_week|next_week
// GET /api/reminders/card?from=YYYY-MM-DD&to=YYYY-MM-DD
// GET /api/reminders/card   (no params — everything incomplete)
//
// Reads the PHYSICAL reminder table (WHERE completed_at IS NULL), not the
// live union — this is the route the Reminder card should call. The
// original /api/reminders above stays reserved for the sync job and the
// prototype it was originally built for.
router.get(
  "/api/reminders/card",
  handle((req) => {
    if (req.query.bucket) {
      const range = bucketRange(req.query.bucket);
      if (!range) {
        const err = new Error(
          `Unknown bucket '${req.query.bucket}' — use today|tomorrow|this_week|next_week, or from/to`
        );
        err.status = 400;
        throw err;
      }
      const [from, to] = range;
      return repo.getCardReminders({ from, to });
    }
    return repo.getCardReminders({ from: req.query.from, to: req.query.to });
  })
);

// Per-source "mark complete" config — everything except routine goes
// through the generic sectionRepository.updateRecord (same path normal
// edits use, so it auto-triggers the sync via sectionRepository.js's
// hooks). 'done' value matches what each source's completedAtExpr in
// reminderSources.js actually checks for.
const COMPLETE_HANDLERS = {
  todo_task: (id) =>
    sectionRepo.updateRecord("todo_task", id, {
      status: "done",
      completion_date: new Date().toISOString().slice(0, 10),
    }),
  goal: (id) =>
    sectionRepo.updateRecord("goals", id, {
      status: "completed",
      completed_on: new Date().toISOString().slice(0, 10),
    }),
  renewal: (id) =>
    sectionRepo.updateRecord("renewals", id, { status: "renewed" }),
  appointment: (id) =>
    sectionRepo.updateRecord("appointments", id, { status: "completed" }),
  // routine's "completion" is deleting the daily_routine_temp row, not a
  // status flip — do NOT write to `reminder` directly (see reminderSources.js
  // note). markDone already calls removeReminder() itself.
  routine: (id) => routineRepo.markDone(id),
};

// PATCH /api/reminders/:source/:sourceId/complete
// :source must be a reminderSources.js `type` value (event/goal/renewal/
// appointment/todo_task/routine).
router.patch(
  "/api/reminders/:source/:sourceId/complete",
  handle((req) => {
    const fn = COMPLETE_HANDLERS[req.params.source];
    if (!fn) {
      const err = new Error(
        `Source '${req.params.source}' can't be marked complete this way` +
          (req.params.source === "event" ? " — events don't have a completion state." : ".")
      );
      err.status = 400;
      throw err;
    }
    return fn(req.params.sourceId);
  })
);

module.exports = router;
