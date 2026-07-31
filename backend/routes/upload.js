const express = require("express");
const multer = require("multer");
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "data"),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

router.post("/upload", upload.array("files"), (req, res) => {
  res.status(200).send("Files uploaded successfully");
});

module.exports = router;
