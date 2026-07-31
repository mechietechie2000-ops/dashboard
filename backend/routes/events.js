const express = require("express");
const router = express.Router();
const db = require("../db/connection");

router.get("/dailyevent", async (req, res) => {
  try {
    res.json(await db.all("SELECT * FROM event"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/addNewEvent", async (req, res) => {
  const { EventFor, EventName, EventTime } = req.body;
  try {
    await db.run(
      "INSERT INTO event (PERSON_NAME, EVENT_NAME, EVENT_TIME) VALUES (?, ?, ?)",
      [EventFor, EventName, EventTime]
    );
    res.json({ message: "Data inserted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NOTE: original SQL here was invalid (mixed DELETE with VALUES syntax).
// Fixed to a proper WHERE match. Still matching on 3 text columns since
// the `event` table has no id column exposed yet — recommend adding an
// EVENT_ID primary key so update/delete can target a single row reliably.
router.post("/deleteEvent", async (req, res) => {
  const { EventFor, EventName, EventTime } = req.body;
  try {
    await db.run(
      "DELETE FROM event WHERE PERSON_NAME = ? AND EVENT_NAME = ? AND EVENT_TIME = ?",
      [EventFor, EventName, EventTime]
    );
    res.json({ message: "Data deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NOTE: original SQL here was invalid (UPDATE with VALUES syntax, not valid
// SQL at all). Left as a stub — needs a primary key + the actual new values
// to be meaningful. Flagging rather than guessing at intent.
router.post("/updateEvent", async (req, res) => {
  res.status(501).json({
    error:
      "updateEvent not implemented yet — table needs a primary key (e.g. EVENT_ID) and the request needs to send both the target id and the new field values.",
  });
});

router.get("/addNewEvent2", async (req, res) => {
  try {
    res.json(await db.all("PRAGMA database_list;"));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
