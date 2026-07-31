const express = require("express");
const router = express.Router();
const db = require("../db/connection");

router.get("/getSportSchedule", async (req, res) => {
  try {
    res.json(
      await db.all(
        `SELECT ACTIVITY_CODE, ACTIVITY_NAME, ACTIVITY_FOR, LEVEL, DAY_OF_WEEK, TIME_SLOT,
                DURATION, FREQUENCY, START_DATE, END_DATE, SPECIAL_EVENT_DATE, FACILITY_NAME,
                ADDRESS, PHONE_NUMBER, MONTHLY_FEES, REGISTRATION_FEES, OTHER_EXPENSES, GEAR_LIST
         FROM activity`
      )
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
