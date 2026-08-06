const express = require("express");
const router = express.Router();
const repo = require("../db/sectionRepository");
const { authenticate } = require("../middleware/auth");

const handle = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
};

router.use(authenticate);

router.get(
  "/api/sections/:sectionKey",
  handle((req) => repo.listRecords(req.params.sectionKey, { limit: req.query.limit }))
);

router.post(
  "/api/sections/:sectionKey",
  handle((req) => repo.insertRecord(req.params.sectionKey, req.body))
);

module.exports = router;
