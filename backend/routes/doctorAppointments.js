const express = require("express");
const router = express.Router();
const db = require("../db/connection");

router.get("/getDoctorAppointment", async (req, res) => {
  try {
    res.json(
      await db.all(
        `SELECT appointment_id, patient_name, doctor_name, appointment_date, purpose,
                amount_charged, address, contact_number, doctor_special, insurance
         FROM doctor_appointment`
      )
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
