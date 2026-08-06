const express = require("express");
const router = express.Router();
const db = require("../db/connection");
const { authenticate } = require("../middleware/auth");

// NOTE: table was renamed doctor_appointment -> appointments (migration 001)
// to allow non-doctor categories (Auto, Other, etc). Endpoint path kept as
// /getDoctorAppointment for backward compatibility with scenes/medical.js —
// rename on the frontend later if we want to generalize this page.
router.get("/getDoctorAppointment", authenticate, async (req, res) => {
  try {
    res.json(
      await db.all(
/*         `SELECT appointment_id, category, patient_name, doctor_name, appointment_date, purpose,
                amount_charged, address, contact_number, doctor_special, insurance
         FROM appointments` */
        `SELECT id, category, appointments.family_member_id , provider_name, appointment_datetime, notes
        FROM appointments` 
      )
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
