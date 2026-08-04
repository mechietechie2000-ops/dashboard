const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const { ipUploadLimiter, userUploadLimiter } = require("../middleware/uploadRateLimit");
const { get, run } = require("../db/connection");
const categoriesConfig = require("../data/documentCategories.json");

// ---------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_ORIGINAL_NAME_LENGTH = 200;

// mime -> allowed extension. This is the allowlist checked against the
// file's actual magic bytes (via `file-type`), never the client's
// Content-Type header, which is trivially spoofable.
const ALLOWED_MIME_TO_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

// Stored strictly outside any statically-served/public web root so files
// are never directly URL-guessable — every read goes through the
// authenticated GET /api/documents/:fileId route below.
const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

const CATEGORY_BY_ID = new Map(categoriesConfig.categories.map((c) => [c.id, c]));

const handle = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error." });
  }
};

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

// Whitelist-based sanitizer for anything that becomes part of a path
// component (person name, category shortname, etc). Never derived from
// the client-supplied original filename.
function sanitizePathComponent(value, fallback = "Unassigned") {
  if (!value) return fallback;
  const cleaned = String(value)
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return cleaned.length > 0 ? cleaned.slice(0, 60) : fallback;
}

// Reject path traversal, null bytes, control characters, and overlong
// names in the *client-supplied* original filename. We never use this
// value to build a path — it's validated only so we can safely store it
// as metadata (the filename shown to the user later).
function validateOriginalFilename(name) {
  if (!name || typeof name !== "string") {
    return "Filename is required.";
  }
  if (name.length > MAX_ORIGINAL_NAME_LENGTH) {
    return `Filename exceeds the maximum length of ${MAX_ORIGINAL_NAME_LENGTH} characters.`;
  }
  if (name.includes("\u0000")) {
    return "Filename contains an invalid character.";
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    return "Filename contains an invalid control character.";
  }
  if (name.includes("/") || name.includes("\\") || name.includes("..")) {
    return "Filename contains an invalid path character.";
  }
  return null;
}

// YYYY-MM-DD -> YY. Returns null if not a well-formed date string.
function toTwoDigitYear(isoDate) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return String(d.getFullYear()).slice(-2);
}

function isNAValue(v) {
  return !v || v === "N/A" || v === "n/a";
}

// Validates issue/expiry date logic. Both are optional (N/A allowed for
// either or both), but if present they must be internally consistent.
function validateDates(issueDate, expiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!isNAValue(issueDate)) {
    const issue = new Date(issueDate);
    if (Number.isNaN(issue.getTime())) return "Issue date is invalid.";
    if (issue > today) return "Issue date cannot be in the future.";
  }

  if (!isNAValue(expiryDate)) {
    const expiry = new Date(expiryDate);
    if (Number.isNaN(expiry.getTime())) return "Expiry date is invalid.";
  }

  if (!isNAValue(issueDate) && !isNAValue(expiryDate)) {
    const issue = new Date(issueDate);
    const expiry = new Date(expiryDate);
    if (expiry < issue) return "Expiry date cannot be before issue date.";
  }

  return null;
}

async function deleteFileQuietly(absolutePath) {
  try {
    if (absolutePath && fs.existsSync(absolutePath)) {
      await fs.promises.unlink(absolutePath);
    }
  } catch (err) {
    console.error("Failed to clean up file after error:", err.message);
  }
}

// ---------------------------------------------------------------------
// Multer: buffered in memory so we can validate (size already capped by
// multer itself, filename, magic bytes) *before* anything ever touches
// disk. Nothing is written until every check passes, so failure paths
// never need to clean up a partial file.
// ---------------------------------------------------------------------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
});

function runMulter(req, res, next) {
  upload.single("document")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          error: `File exceeds the ${MAX_FILE_SIZE_MB}MB limit.`,
        });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}

// ---------------------------------------------------------------------
// GET /api/documents/categories
// Category/subcategory config, including shortnames and which date
// fields are relevant, so the frontend doesn't need to hardcode this.
// ---------------------------------------------------------------------
router.get("/api/documents/categories", authenticate, (req, res) => {
  res.json(categoriesConfig);
});

// ---------------------------------------------------------------------
// POST /api/documents/upload
// ---------------------------------------------------------------------
router.post(
  "/api/documents/upload",
  ipUploadLimiter,
  authenticate,
  userUploadLimiter,
  runMulter,
  handle(async (req, res) => {
    // req.user is populated by `authenticate` before we ever look at the file.
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ error: "Access denied." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const { originalname, buffer, size } = req.file;
    const {
      category: categoryId,
      subcategory,
      personId,
      issueDate,
      expiryDate,
      scope = "individual",
      folder = "current",
    } = req.body;

    // 1. Original filename: validate, never use it to build a path.
    const filenameError = validateOriginalFilename(originalname);
    if (filenameError) {
      return res.status(400).json({ error: filenameError });
    }

    // 2. Category allowlist.
    const category = CATEGORY_BY_ID.get(categoryId);
    if (!category) {
      return res.status(400).json({ error: "Invalid or missing document category." });
    }

    // 3. Scope / folder allowlists.
    if (!["individual", "joint"].includes(scope)) {
      return res.status(400).json({ error: "Invalid scope. Must be 'individual' or 'joint'." });
    }
    if (!["current", "archive"].includes(folder)) {
      return res.status(400).json({ error: "Invalid folder. Must be 'current' or 'archive'." });
    }
    const status = folder === "archive" ? "archived" : "current";

    // 4. Date validation.
    const dateError = validateDates(issueDate, expiryDate);
    if (dateError) {
      return res.status(400).json({ error: dateError });
    }

    // 5. Person lookup (required for individual scope; ignored for joint).
    let personRow = null;
    if (scope === "individual") {
      if (!personId) {
        return res.status(400).json({ error: "personId is required for individual documents." });
      }
      personRow = await get("SELECT id, first_name FROM family_members WHERE id = ?", [personId]);
      if (!personRow) {
        return res.status(400).json({ error: "Selected family member was not found." });
      }
    }

    // 6. Magic-byte validation — never trust the client's Content-Type header.
    const { fileTypeFromBuffer } = await import("file-type");
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !ALLOWED_MIME_TO_EXT[detected.mime]) {
      return res.status(400).json({
        error: "File content does not match an allowed type (PDF, PNG, JPEG, WEBP).",
      });
    }
    const ext = ALLOWED_MIME_TO_EXT[detected.mime];

    // 7. Build the server-generated stored filename.
    //    Human-readable (per the requested naming convention) but built
    //    entirely from server-validated fields — never from the raw
    //    client-supplied filename — plus a random suffix to prevent
    //    collisions/overwrites.
    const personLabel = scope === "joint" ? "Joint" : sanitizePathComponent(personRow.first_name);
    const subcategorySafe = subcategory ? sanitizePathComponent(subcategory) : "";
    const startYY = !isNAValue(issueDate) ? toTwoDigitYear(issueDate) : null;
    const endYY = !isNAValue(expiryDate) ? toTwoDigitYear(expiryDate) : null;
    const yearSuffix = startYY && endYY ? `-${startYY}-${endYY}` : "";
    const randomSuffix = crypto.randomBytes(4).toString("hex");

    const storedFilename =
      [personLabel, category.shortName, subcategorySafe].filter(Boolean).join("-") +
      yearSuffix +
      `-${randomSuffix}.${ext}`;

    // 8. Target directory:
    //      current: uploads/{first_name}/{document_category}/
    //      archive: uploads/archive/{first_name}/{document_category}/
    //    Uses the full category label (not the shortcode) so the folder
    //    structure on disk is human-readable/searchable at a glance.
    const personDir = scope === "joint" ? "Joint Documents" : personLabel;
    const categoryDir = sanitizePathComponent(category.label, category.shortName);
    const relativeDir =
      folder === "archive"
        ? path.join("archive", personDir, categoryDir)
        : path.join(personDir, categoryDir);
    const targetDir = path.join(UPLOAD_ROOT, relativeDir);
    const absolutePath = path.join(targetDir, storedFilename);
    const relativePath = path.join(relativeDir, storedFilename);

    // Defense in depth: confirm the resolved path never escapes UPLOAD_ROOT,
    // even though every component above is already whitelisted/sanitized.
    if (!absolutePath.startsWith(UPLOAD_ROOT + path.sep)) {
      return res.status(400).json({ error: "Invalid file path." });
    }

    await fs.promises.mkdir(targetDir, { recursive: true });

    try {
      await fs.promises.writeFile(absolutePath, buffer);
    } catch (err) {
      console.error("Failed to write uploaded file:", err.message);
      return res.status(500).json({ error: "Failed to store the file." });
    }

    // 9. Persist metadata. Clean up the file on any DB failure.
    try {
      const result = await run(
        `INSERT INTO uploads
           (original_filename, stored_filename, relative_path, mime_type, size_bytes,
            category, subcategory, person_id, scope, issue_date, expiry_date, status, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          originalname,
          storedFilename,
          relativePath,
          detected.mime,
          size,
          category.id,
          subcategory || null,
          scope === "individual" ? personRow.id : null,
          scope,
          isNAValue(issueDate) ? null : issueDate,
          isNAValue(expiryDate) ? null : expiryDate,
          status,
          req.user.userId,
        ]
      );

      return res.status(201).json({
        message: "File uploaded successfully.",
        upload: {
          id: result.lastID,
          originalFilename: originalname,
          category: category.id,
          subcategory: subcategory || null,
          scope,
          status,
          mimeType: detected.mime,
          sizeBytes: size,
          uploadedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      await deleteFileQuietly(absolutePath);
      console.error("Failed to save upload metadata:", err.message);
      return res.status(500).json({ error: "Failed to save upload metadata." });
    }
  })
);

// ---------------------------------------------------------------------
// GET /api/documents/:fileId
// Streams the file back after checking the requester is allowed to see
// it. Never exposes the raw filesystem path in the response.
// ---------------------------------------------------------------------
router.get(
  "/api/documents/:fileId",
  authenticate,
  handle(async (req, res) => {
    const fileId = Number(req.params.fileId);
    if (!Number.isInteger(fileId) || fileId <= 0) {
      return res.status(400).json({ error: "Invalid document id." });
    }

    const row = await get("SELECT * FROM uploads WHERE id = ?", [fileId]);
    if (!row) {
      return res.status(404).json({ error: "Document not found." });
    }

    // TODO: once an admin role exists, allow admins through here too.
    const isOwner = row.uploaded_by === req.user.userId;
    const isJointVisible = row.scope === "joint";
    if (!isOwner && !isJointVisible) {
      return res.status(403).json({ error: "You do not have access to this document." });
    }

    const absolutePath = path.join(UPLOAD_ROOT, row.relative_path);
    if (!absolutePath.startsWith(UPLOAD_ROOT + path.sep) || !fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "Document not found." });
    }

    res.setHeader("Content-Type", row.mime_type);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(row.original_filename)}"`
    );
    fs.createReadStream(absolutePath).pipe(res);
  })
);

module.exports = router;