import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  RadioGroup,
  Radio,
  Checkbox,
  Select,
  MenuItem,
  InputLabel,
  Button,
  useTheme,
} from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import Header from "../../components/Header";
import { tokens } from "../../theme";

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

// ---------------------------------------------------------------------
// Local-folder save support (File System Access API).
// Only Chromium-based browsers (Chrome/Edge, desktop + Android) implement
// window.showDirectoryPicker / writable FileSystemDirectoryHandle. Safari
// (desktop + iOS) and Firefox do not support writing to an arbitrary
// folder — those browsers keep using the existing share-sheet based
// "Save a copy" button instead.
//
// The chosen directory handle is persisted in IndexedDB (handles are
// structured-cloneable) so the user isn't asked to pick a folder again on
// every visit. Re-granting permission on a later visit still requires a
// user gesture (browser security requirement), so we re-request
// permission — rather than re-open the picker — the next time the user
// drops/selects a file.
// ---------------------------------------------------------------------
const FSA_SUPPORTED =
  typeof window !== "undefined" &&
  typeof window.showDirectoryPicker === "function";
const IDB_NAME = "digilocker";
const IDB_STORE = "handles";
const IDB_KEY = "saveDirectory";

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetHandle() {
  try {
    const db = await idbOpen();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSetHandle(handle) {
  try {
    const db = await idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(handle, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Persistence is a nice-to-have; local save still works for this session.
  }
}

async function idbClearHandle() {
  try {
    const db = await idbOpen();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
}

// Shared styling for TextField / Select so every themed input in this form
// looks and behaves consistently (label color, focus/hover border, etc.),
// matching the pattern used in RoutineAdmin.jsx.
const fieldSx = (colors) => ({
  "& .MuiInputLabel-root": { color: colors.grey[300] },
  "& .MuiInputLabel-root.MuiInputLabel-shrink, & .MuiInputLabel-root.Mui-focused":
    {
      color: `${colors.greenAccent[400]} !important`,
      backgroundColor: colors.primary[400],
      px: "6px",
    },
  "& .MuiOutlinedInput-root": {
    color: colors.grey[100],
    "& fieldset": { borderColor: colors.grey[500] },
    "&:hover fieldset": { borderColor: colors.greenAccent[500] },
    "&.Mui-focused fieldset": { borderColor: colors.greenAccent[500] },
  },
  "& .MuiSelect-icon": { color: colors.grey[300] },
});

const DigiLocker = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Form state
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [personId, setPersonId] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [noIssueDate, setNoIssueDate] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [noExpiry, setNoExpiry] = useState(false);
  const [scope, setScope] = useState("individual"); // 'individual' | 'joint'
  const [folder, setFolder] = useState("current"); // 'current' | 'archive'

  // File & feedback state
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);

  // Post-upload state, kept so the user can still save a copy locally
  // (iCloud/Files/Drive via the OS share sheet) after the upload succeeds.
  const [lastUploadedFile, setLastUploadedFile] = useState(null);
  // The server-generated filename ({person}-{category}-{dates}-{random}.ext),
  // NOT the original filename the user picked. Kept separately so the
  // "Save a copy" share sheet can offer the file under this name too,
  // matching what's stored server-side.
  const [lastStoredFilename, setLastStoredFilename] = useState("");

  // Opt-in "also save a copy to a folder on this device" (Chromium only —
  // see FSA_SUPPORTED above). Deliberately NOT reset by resetForm(), so the
  // choice carries over from one upload to the next in the same session.
  const [saveLocalCopy, setSaveLocalCopy] = useState(false);
  const [localDirHandle, setLocalDirHandle] = useState(null);
  const [localDirName, setLocalDirName] = useState("");
  const [localSaveNote, setLocalSaveNote] = useState("");

  const selectedCategory = categories.find((c) => c.id === category);

  useEffect(() => {
    // Category/subcategory config now comes from the backend, not a
    // hardcoded list, so it stays in sync with what the server allows.
    fetch("/api/documents/categories", { credentials: "include" })
      .then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(new Error("Failed to load categories")),
      )
      .then((data) => setCategories(data.categories || []))
      .catch(() => setError("Could not load document categories."));

    // Previously a hardcoded placeholder while GET /api/family-members
    // didn't exist yet. Kept here, commented, for reference:
    //
    // const mockFamily = [
    //   { id: '1', name: 'Self' },
    //   { id: '2', name: 'Spouse' },
    //   { id: '3', name: 'Child 1' }
    // ];
    // setFamilyMembers(mockFamily);
    fetch("/api/family-members", { credentials: "include" })
      .then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(new Error("Failed to load family members")),
      )
      .then((rows) =>
        setFamilyMembers(
          (rows || []).map((m) => ({
            id: String(m.id),
            name: [m.first_name, m.last_name].filter(Boolean).join(" "),
          })),
        ),
      )
      .catch(() => setError("Could not load family members."));
  }, []);

  // Restore a previously-picked save folder, if any. Permission state
  // ('granted' | 'prompt' | 'denied') can be checked without a user
  // gesture, but re-requesting it (if not still 'granted') requires one —
  // that happens later, on the next drop/select or upload.
  useEffect(() => {
    if (!FSA_SUPPORTED) return;
    idbGetHandle().then(async (handle) => {
      if (!handle) return;
      try {
        setLocalDirHandle(handle);
        setLocalDirName(handle.name);
        const perm = await handle.queryPermission({ mode: "readwrite" });
        if (perm === "granted") setSaveLocalCopy(true);
      } catch {
        // Handle is no longer valid (folder moved/deleted, etc).
        idbClearHandle();
      }
    });
  }, []);

  // Makes sure we have a writable directory handle, reusing the remembered
  // one when possible. Must be called from within a user gesture (a drop/
  // click handler) — both showDirectoryPicker() and requestPermission()
  // require one.
  const ensureDirectoryAccess = async () => {
    if (!FSA_SUPPORTED) return null;
    try {
      if (localDirHandle) {
        const perm = await localDirHandle.queryPermission({
          mode: "readwrite",
        });
        if (perm === "granted") return localDirHandle;
        const requested = await localDirHandle.requestPermission({
          mode: "readwrite",
        });
        if (requested === "granted") return localDirHandle;
        // Permission denied for the remembered folder — fall through and
        // let the user pick a (possibly new) folder instead.
      }
      const handle = await window.showDirectoryPicker();
      setLocalDirHandle(handle);
      setLocalDirName(handle.name);
      idbSetHandle(handle);
      return handle;
    } catch (err) {
      // AbortError just means the user dismissed the picker — not an error.
      if (err.name !== "AbortError") {
        setError("Could not access the chosen folder: " + err.message);
      }
      return null;
    }
  };

  const handleChangeFolder = async () => {
    setError("");
    try {
      const handle = await window.showDirectoryPicker();
      setLocalDirHandle(handle);
      setLocalDirName(handle.name);
      idbSetHandle(handle);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError("Could not access the chosen folder: " + err.message);
      }
    }
  };

  const onDrop = async (acceptedFiles, rejectedFiles) => {
    setError("");

    if (rejectedFiles.length > 0) {
      const err = rejectedFiles[0].errors[0];
      if (err.code === "file-too-large") {
        setError(`File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`);
      } else if (err.code === "file-invalid-type") {
        setError(
          "Invalid file format. Only PDF, JPG, PNG, and WEBP are allowed.",
        );
      } else {
        setError(err.message);
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];

      if (selectedFile.name.length > 200) {
        setError("Filename is too long (maximum 200 characters allowed).");
        return;
      }

      setFile(selectedFile);
      setLocalSaveNote("");

      if (saveLocalCopy) {
        await ensureDirectoryAccess();
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_MIME_TYPES,
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: false,
  });

  const resetForm = () => {
    setFile(null);
    setCategory("");
    setPersonId("");
    setIssueDate("");
    setNoIssueDate(false);
    setExpiryDate("");
    setNoExpiry(false);
    setScope("individual");
    setFolder("current");
  };

  const handleCancel = () => {
    setError("");
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !category || (scope === "individual" && !personId)) {
      setError("Please fill in all required fields and select a valid file.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("category", category);
      formData.append("personId", personId);
      formData.append("issueDate", noIssueDate ? "N/A" : issueDate || "N/A");
      formData.append("expiryDate", noExpiry ? "N/A" : expiryDate || "N/A");
      formData.append("scope", scope);
      formData.append("folder", folder);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        credentials: "include", // sends the httpOnly auth cookie automatically
        // DO NOT manually set 'Content-Type': 'multipart/form-data'.
        // Fetch will automatically add the boundary header when passing FormData.
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "File upload failed.");
      }

      setLastUploadedFile(file);
      setLastStoredFilename(
        data.upload && data.upload.storedFilename
          ? data.upload.storedFilename
          : file.name,
      );

      if (saveLocalCopy && FSA_SUPPORTED) {
        const handle = await ensureDirectoryAccess();
        if (handle) {
          try {
            const savedName =
              (data.upload && data.upload.storedFilename) || file.name;
            const fileHandle = await handle.getFileHandle(savedName, {
              create: true,
            });
            const writable = await fileHandle.createWritable();
            await writable.write(file);
            await writable.close();
            setLocalSaveNote(
              `Also saved a copy to "${handle.name}" as "${savedName}".`,
            );
          } catch (copyErr) {
            console.error("Local folder save failed:", copyErr);
            setLocalSaveNote("");
            setError(
              `Uploaded successfully, but saving a local copy to "${handle.name}" failed: ${copyErr.message}`,
            );
          }
        }
      }

      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Workaround for "save this to my own iCloud/Drive/Files": the browser
  // cannot write into a specific cloud provider directly (no such API
  // exists on iOS Safari, PWA or not). Instead we hand the file to the
  // OS via the Web Share API, which opens the native share sheet — the
  // user then picks "Save to Files" -> iCloud Drive (or any other
  // provider they have installed) themselves.
  const handleSaveACopy = async () => {
    if (!lastUploadedFile) return;
    setError("");
    try {
      // Share the file under the server-generated name (matches what's
      // stored in uploads/), not the original name the user picked
      // (e.g. "IMG_1234.jpg"). The File constructor just relabels the
      // same bytes — it doesn't re-read or re-encode anything.
      const renamedFile = new File(
        [lastUploadedFile],
        lastStoredFilename || lastUploadedFile.name,
        { type: lastUploadedFile.type },
      );

      if (navigator.canShare && navigator.canShare({ files: [renamedFile] })) {
        await navigator.share({
          files: [renamedFile],
          title: renamedFile.name,
        });
      } else {
        // Fallback for browsers without file-sharing support (e.g. desktop
        // Safari/Firefox): open the file so the OS's native
        // viewer/print/share affordance is available.
        const url = URL.createObjectURL(renamedFile);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (err) {
      // AbortError just means the user dismissed the share sheet - not an error.
      if (err.name !== "AbortError") {
        setError("Could not open the save dialog: " + err.message);
      }
    }
  };

  return (
    <Box m="20px">
      <Header
        title="DigiLocker"
        subtitle="Upload and organize household documents"
      />

      {error && (
        <Box
          mb="16px"
          p="10px 14px"
          borderRadius="6px"
          sx={{
            backgroundColor: colors.redAccent[900],
            border: `1px solid ${colors.redAccent[600]}`,
          }}
        >
          <Typography color={colors.redAccent[300]}>{error}</Typography>
        </Box>
      )}

      {lastUploadedFile && (
        <Box
          mb="16px"
          p="12px 14px"
          borderRadius="6px"
          sx={{
            backgroundColor: colors.greenAccent[900],
            border: `1px solid ${colors.greenAccent[600]}`,
          }}
        >
          <Typography color={colors.greenAccent[300]} mb="8px">
            Uploaded "{lastUploadedFile.name}" successfully.
          </Typography>
          {localSaveNote && (
            <Typography
              color={colors.greenAccent[300]}
              mb="8px"
              variant="body2"
            >
              {localSaveNote}
            </Typography>
          )}
          <Button
            type="button"
            variant="outlined"
            onClick={handleSaveACopy}
            sx={{
              color: colors.greenAccent[300],
              borderColor: colors.greenAccent[500],
              "&:hover": {
                borderColor: colors.greenAccent[300],
                backgroundColor: colors.greenAccent[800],
              },
            }}
          >
            Save a copy to iCloud / Files / Drive
          </Button>
        </Box>
      )}

      <Paper
        component="form"
        onSubmit={handleSubmit}
        elevation={0}
        sx={{
          maxWidth: "640px",
          p: "24px",
          backgroundColor: colors.primary[400],
          backgroundImage: "none",
          borderRadius: "10px",
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        {/* Category Selection */}
        <FormControl fullWidth required sx={fieldSx(colors)}>
          <InputLabel id="category-label">Document Category</InputLabel>
          <Select
            labelId="category-label"
            label="Document Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Individual / Joint */}
        <FormControl>
          <FormLabel
            sx={{ color: colors.grey[300], fontSize: "0.85rem", mb: 0.5 }}
          >
            Scope
          </FormLabel>
          <RadioGroup
            row
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <FormControlLabel
              value="individual"
              control={<Radio color="secondary" />}
              label="Individual"
              sx={{ color: colors.grey[200] }}
            />
            <FormControlLabel
              value="joint"
              control={<Radio color="secondary" />}
              label="Joint / Shared (household)"
              sx={{ color: colors.grey[200] }}
            />
          </RadioGroup>
        </FormControl>

        {/* Family Member Selection (individual only) */}
        {scope === "individual" && (
          <FormControl fullWidth required sx={fieldSx(colors)}>
            <InputLabel id="person-label">Person Name</InputLabel>
            <Select
              labelId="person-label"
              label="Person Name"
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
            >
              {familyMembers.map((member) => (
                <MenuItem key={member.id} value={member.id}>
                  {member.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Dates Selection */}
        {(!selectedCategory ||
          selectedCategory.hasIssueDate ||
          selectedCategory.hasExpiryDate) && (
          <Box display="flex" gap={2} flexWrap="wrap">
            <Box flex={1} minWidth={220}>
              <TextField
                label="Issue Date"
                type="date"
                fullWidth
                value={issueDate}
                disabled={noIssueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={fieldSx(colors)}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={noIssueDate}
                    onChange={(e) => {
                      setNoIssueDate(e.target.checked);
                      if (e.target.checked) setIssueDate("");
                    }}
                    sx={{
                      color: colors.grey[400],
                      "&.Mui-checked": { color: colors.greenAccent[500] },
                    }}
                  />
                }
                label="N/A (Does not have Issue Date)"
                sx={{
                  color: colors.grey[300],
                  mt: "2px",
                  "& .MuiFormControlLabel-label": { fontSize: "0.85rem" },
                }}
              />
            </Box>

            <Box flex={1} minWidth={220}>
              <TextField
                label="Expiration Date"
                type="date"
                fullWidth
                value={expiryDate}
                disabled={noExpiry}
                onChange={(e) => setExpiryDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={fieldSx(colors)}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={noExpiry}
                    onChange={(e) => {
                      setNoExpiry(e.target.checked);
                      if (e.target.checked) setExpiryDate("");
                    }}
                    sx={{
                      color: colors.grey[400],
                      "&.Mui-checked": { color: colors.greenAccent[500] },
                    }}
                  />
                }
                label="N/A (Does not expire)"
                sx={{
                  color: colors.grey[300],
                  mt: "2px",
                  "& .MuiFormControlLabel-label": { fontSize: "0.85rem" },
                }}
              />
            </Box>
          </Box>
        )}

        {/* Current / Archive */}
        <FormControlLabel
          control={
            <Checkbox
              checked={folder === "current"}
              onChange={(e) =>
                setFolder(e.target.checked ? "current" : "archive")
              }
              sx={{
                color: colors.grey[400],
                "&.Mui-checked": { color: colors.greenAccent[500] },
              }}
            />
          }
          label="Current (uncheck to file under Archive)"
          sx={{ color: colors.grey[200] }}
        />

        {/* Also save a copy to a folder on this device (opt-in) */}
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={saveLocalCopy}
                disabled={!FSA_SUPPORTED}
                onChange={async (e) => {
                  const checked = e.target.checked;
                  setSaveLocalCopy(checked);
                  setLocalSaveNote("");
                  // If a file's already selected when the box is checked,
                  // ask for folder access right away rather than waiting
                  // for the next drop.
                  if (checked && file && FSA_SUPPORTED) {
                    await ensureDirectoryAccess();
                  }
                }}
                sx={{
                  color: colors.grey[400],
                  "&.Mui-checked": { color: colors.greenAccent[500] },
                }}
              />
            }
            label="Also save a copy to a folder on this device"
            sx={{ color: colors.grey[200] }}
          />
          {FSA_SUPPORTED ? (
            saveLocalCopy && (
              <Box display="flex" alignItems="center" gap={1} ml="32px">
                <Typography variant="body2" color={colors.grey[400]}>
                  {localDirName
                    ? `Saving to: "${localDirName}"`
                    : "You'll be asked to pick a folder when you add a file."}
                </Typography>
                {localDirName && (
                  <Button
                    type="button"
                    onClick={handleChangeFolder}
                    sx={{
                      minWidth: 0,
                      p: 0,
                      fontSize: "0.8rem",
                      color: colors.blueAccent[300],
                    }}
                  >
                    Change folder
                  </Button>
                )}
              </Box>
            )
          ) : (
            <Typography variant="body2" color={colors.grey[500]} ml="32px">
              Not supported in this browser — use the "Save a copy" button after
              uploading instead.
            </Typography>
          )}
        </Box>

        {/* Drag and Drop Zone */}
        <Box
          {...getRootProps()}
          sx={{
            border: `2px dashed ${isDragActive ? colors.greenAccent[500] : colors.grey[500]}`,
            borderRadius: "6px",
            padding: "2rem",
            textAlign: "center",
            backgroundColor: isDragActive
              ? colors.blueAccent[900]
              : colors.primary[500],
            cursor: "pointer",
            transition: "background-color 120ms ease, border-color 120ms ease",
            "&:hover": { borderColor: colors.greenAccent[500] },
          }}
        >
          {/* No `capture` attribute here on purpose: on iOS Safari (and some
              Android versions), setting capture="environment" skips the
              normal action sheet and jumps straight into the camera app,
              with no way to pick an existing file from Photos/Files. Leaving
              it off gives the full "Take Photo / Photo Library / Browse"
              picker on mobile, and the normal file dialog on desktop. */}
          <input {...getInputProps()} />
          <CloudUploadOutlinedIcon
            sx={{ fontSize: 32, color: colors.grey[400], mb: 1 }}
          />
          {isDragActive ? (
            <Typography color={colors.grey[100]}>
              Drop the document here...
            </Typography>
          ) : (
            <Typography color={colors.grey[300]}>
              Drag & drop a document here, or click to select (PDF, JPG, PNG,
              WEBP - Max {MAX_FILE_SIZE_MB}MB)
            </Typography>
          )}
          {file && (
            <Typography
              color={colors.greenAccent[400]}
              fontWeight="bold"
              mt={1}
            >
              Selected File: {file.name} (
              {(file.size / (1024 * 1024)).toFixed(2)} MB)
            </Typography>
          )}
        </Box>

        {/* Actions */}
        <Box display="flex" gap={2}>
          <Button
            type="button"
            onClick={handleCancel}
            disabled={uploading}
            fullWidth
            sx={{
              color: colors.grey[200],
              border: `1px solid ${colors.grey[500]}`,
              "&:hover": {
                borderColor: colors.redAccent[400],
                color: colors.redAccent[400],
              },
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={uploading}
            fullWidth
            sx={{
              backgroundColor: colors.blueAccent[600],
              color: "#fff",
              fontWeight: "bold",
              "&:hover": { backgroundColor: colors.blueAccent[700] },
            }}
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default DigiLocker;
