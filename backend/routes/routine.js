const express = require("express");
const router = express.Router();
const repo = require("../db/routineRepository");
const { authenticate } = require("../middleware/auth");
const { authenticateInternal } = require("../middleware/internalAuth");

const handle = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---- Daily reset (machine-to-machine only — launchd curl / node-cron backup) ----
// Deliberately ABOVE router.use(authenticate) below: launchd's curl has no
// browser session/JWT cookie, so this uses its own shared-secret check
// (see middleware/internalAuth.js) instead of user login.
router.post("/api/routine/daily-reset", authenticateInternal, handle(() => repo.runDailyReset()));
router.get(
  "/api/routine/daily-reset/status",
  authenticateInternal,
  handle(async () => ({ ranToday: await repo.hasResetRunToday() }))
);

// Apply protection to all remaining /api/routine routes below
router.use(authenticate); // <-- Secure all routes below

// ---- Master routine templates (CRUD) ----
router.get("/api/routine", handle(() => repo.listRoutines()));
router.post("/api/routine", handle((req) => repo.addRoutine(req.body)));
router.put("/api/routine/:id", handle((req) => repo.updateRoutine(req.params.id, req.body)));
router.delete("/api/routine/:id", handle((req) => repo.deleteRoutine(req.params.id)));

// Manual trigger for the logged-in-user "Reset" button on the dashboard.
// Same idempotent runDailyReset() as the cron/launchd paths — if it already
// ran today, this just reports { skipped: true } instead of running twice.
router.post("/api/routine/daily-reset/manual", handle(() => repo.runDailyReset()));

// ---- Today's working list ----
router.get("/api/routine/today", handle(() => repo.getTodayTasks()));
router.post("/api/routine/today/:tempId/done", handle((req) => repo.markDone(req.params.tempId)));
router.post(
  "/api/routine/today/:tempId/skip",
  handle((req) => repo.markSkipped(req.params.tempId, req.body.reason))
);
router.post("/api/routine/today/:tempId/mute", handle((req) => repo.toggleMute(req.params.tempId)));
router.post(
  "/api/routine/today/:tempId/announce",
  handle((req) => repo.toggleAnnounce(req.params.tempId))
);
router.post(
  "/api/routine/today/:tempId/snooze",
  handle((req) => repo.snoozeTask(req.params.tempId, req.body.minutes))
);

// ---- Streaks ----
router.get(
  "/api/routine/streak/:person",
  handle(async (req) => ({ streak: await repo.getStreak(req.params.person) }))
);

module.exports = router;