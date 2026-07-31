const express = require("express");
const router = express.Router();
const notes = require("../data/notes");

router.get("/api/notes", (req, res) => {
  res.json(notes);
});

router.get("/api/notes/:id", (req, res) => {
  const note = notes.find((n) => n._id === req.params.id);
  res.send(note);
});

module.exports = router;
