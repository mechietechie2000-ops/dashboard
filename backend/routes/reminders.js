const express = require("express");
const router = express.Router();
const repo = require("../db/remindersRepository");
const sectionRepository = require("../db/sectionRepository");
const routineRepository = require("../db/routineRepository");
const { authenticate } = require("../middleware/auth");

// Per-source "mark complete" behavior for PATCH /api/reminders/:sourceType/:sourceId/complete.
// todo_task/goals/renewals/appointments go through the generic sectionRepository
// (sectionKey + the status value that counts as "done" for that table) — these
// already trigger the reminder sync automatically via sectionRepository.js.
// routine is NOT written to directly (source of truth for "done" is the
// today's-instance table, and its own endpoint already deletes the row and
// removes the reminder) — it's proxied to routineRepository.markDone instead.
const COMPLETE_HANDLERS = {
  todo_task: (sourceId) =>
    sectionRepository.updateRecord("todo_task", sourceId, { status: "done" }),
  goal: (sourceId) => sectionRepository.updateRecord("goals", sourceId, { status: "completed" }),
  renewal: (sourceId) =>
    sectionRepository.updateRecord("renewals", sourceId, { status: "renewed" }),
  appointment: (sourceId) =>
    sectionRepository.updateRecord("appointments", sourceId, { status: "completed" }),
  routine: (sourceId) => routineRepository.markDone(sourceId),
};

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

// GET /api/reminders/card?from=&to=&sources=goal,renewal
// The Reminder card's actual data source — queries the physical `reminder`
// table (WHERE completed_at IS NULL), not the live union above (that's
// only for the sync job and the legacy GET /api/reminders endpoint).
// `sources` (comma-separated source_type list) lets the frontend exclude a
// source, e.g. goals, without any backend change.
//
// Bucket-to-date-range conversion (today/tomorrow/this_week/next_week) is
// done client-side in utils/reminderBuckets.js's bucketToRange(), using the
// browser's local wall-clock and an explicit end-of-day boundary on `to`.
// This route only accepts already-resolved from/to — it intentionally does
// NOT resolve a `bucket` param itself anymore: an earlier version did that
// here using UTC dates with no end-of-day cushion, which is what caused
// bucket filters to show records that belonged to a different local day.
router.get(
  "/api/reminders/card",
  handle((req) => {
    let { from, to, sources } = req.query;
    if (!from) from = new Date().toISOString().slice(0, 10);
    if (!to) to = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const sourceList = sources ? sources.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    return repo.getReminderCard({ from, to, sources: sourceList });
  })
);

// PATCH /api/reminders/:sourceType/:sourceId/complete
router.patch(
  "/api/reminders/:sourceType/:sourceId/complete",
  handle((req) => {
    const { sourceType, sourceId } = req.params;
    const fn = COMPLETE_HANDLERS[sourceType];
    if (!fn) {
      const err = new Error(`Cannot complete reminder source: ${sourceType}`);
      err.status = 400;
      throw err;
    }
    return fn(sourceId);
  })
);

// POST /api/reminders/sync
// Manual trigger for the same resync + orphan-cleanup that runDailyReset's
// nightly job does — lets the frontend force reminder rows to catch up to
// their source tables on demand (e.g. a refresh button) instead of waiting
// for the next scheduled run.
router.post(
  "/api/reminders/sync",
  handle(() => repo.syncAllReminders())
);

module.exports = router;
