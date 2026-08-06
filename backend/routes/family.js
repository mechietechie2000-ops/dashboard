const express = require("express");
const router = express.Router();
const { all } = require("../db/connection");
const { authenticate } = require("../middleware/auth");

// ---------------------------------------------------------------------
// GET /api/family-members
// Returns the household roster used to populate person-selection
// dropdowns (e.g. DigiLocker's "Person Name" field).
// ---------------------------------------------------------------------
router.get("/api/family-members", authenticate, async (req, res) => {
  try {
    const rows = await all(
      `SELECT id, first_name, last_name, relationship
       FROM family_members
       ORDER BY first_name ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch family members:", err.message);
    res.status(500).json({ error: "Failed to fetch family members." });
  }
});

module.exports = router;