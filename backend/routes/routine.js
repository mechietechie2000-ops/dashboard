const express = require("express");
const router = express.Router();
const repo = require("../db/routineRepository");
const { authenticate } = require("../middleware/auth"); // <-- Import middleware

const handle = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Apply protection to all /api/routine routes below
router.use(authenticate); // <-- Secure all routes below

// ---- Master routine templates (CRUD) ----
router.get("/api/routine", handle(() => repo.listRoutines()));
router.post("/api/routine", handle((req) => repo.addRoutine(req.body)));
router.put("/api/routine/:id", handle((req) => repo.updateRoutine(req.params.id, req.body)));
router.delete("/api/routine/:id", handle((req) => repo.deleteRoutine(req.params.id)));

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

// ---- Daily reset ----
// Call this from launchd (curl) at midnight, and/or an in-process node-cron
// backup. It's idempotent, so calling it more than once in a day is harmless.
router.post("/api/routine/daily-reset", handle(() => repo.runDailyReset()));
router.get("/api/routine/daily-reset/status", handle(async () => ({ ranToday: await repo.hasResetRunToday() })));

module.exports = router;