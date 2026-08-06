const express = require("express");
const router = express.Router();
const repo = require("../db/remindersRepository");
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

module.exports = router;
