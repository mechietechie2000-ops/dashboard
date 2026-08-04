import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
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
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import Header from '../../components/Header';
import { tokens } from '../../theme';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
};

// Shared styling for TextField / Select so every themed input in this form
// looks and behaves consistently (label color, focus/hover border, etc.),
// matching the pattern used in RoutineAdmin.jsx.
const fieldSx = (colors) => ({
  '& .MuiInputLabel-root': { color: colors.grey[300] },
  '& .MuiInputLabel-root.MuiInputLabel-shrink, & .MuiInputLabel-root.Mui-focused': {
    color: `${colors.greenAccent[400]} !important`,
    backgroundColor: colors.primary[400],
    px: '6px',
  },
  '& .MuiOutlinedInput-root': {
    color: colors.grey[100],
    '& fieldset': { borderColor: colors.grey[500] },
    '&:hover fieldset': { borderColor: colors.greenAccent[500] },
    '&.Mui-focused fieldset': { borderColor: colors.greenAccent[500] },
  },
  '& .MuiSelect-icon': { color: colors.grey[300] },
});

const DigiLocker = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Form state
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [personId, setPersonId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [noIssueDate, setNoIssueDate] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [noExpiry, setNoExpiry] = useState(false);
  const [scope, setScope] = useState('individual'); // 'individual' | 'joint'
  const [folder, setFolder] = useState('current'); // 'current' | 'archive'

  // File & feedback state
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);

  // Post-upload state, kept so the user can still save a copy locally
  // (iCloud/Files/Drive via the OS share sheet) after the upload succeeds.
  const [lastUploadedFile, setLastUploadedFile] = useState(null);

  const selectedCategory = categories.find((c) => c.id === category);

  useEffect(() => {
    // Category/subcategory config now comes from the backend, not a
    // hardcoded list, so it stays in sync with what the server allows.
    fetch('/api/documents/categories', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load categories'))))
      .then((data) => setCategories(data.categories || []))
      .catch(() => setError('Could not load document categories.'));

    // Previously a hardcoded placeholder while GET /api/family-members
    // didn't exist yet. Kept here, commented, for reference:
    //
    // const mockFamily = [
    //   { id: '1', name: 'Self' },
    //   { id: '2', name: 'Spouse' },
    //   { id: '3', name: 'Child 1' }
    // ];
    // setFamilyMembers(mockFamily);
    fetch('/api/family-members', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load family members'))))
      .then((rows) =>
        setFamilyMembers(
          (rows || []).map((m) => ({
            id: String(m.id),
            name: [m.first_name, m.last_name].filter(Boolean).join(' '),
          }))
        )
      )
      .catch(() => setError('Could not load family members.'));
  }, []);

  const onDrop = (acceptedFiles, rejectedFiles) => {
    setError('');

    if (rejectedFiles.length > 0) {
      const err = rejectedFiles[0].errors[0];
      if (err.code === 'file-too-large') {
        setError(`File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`);
      } else if (err.code === 'file-invalid-type') {
        setError('Invalid file format. Only PDF, JPG, PNG, and WEBP are allowed.');
      } else {
        setError(err.message);
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];

      if (selectedFile.name.length > 200) {
        setError('Filename is too long (maximum 200 characters allowed).');
        return;
      }

      setFile(selectedFile);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_MIME_TYPES,
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: false
  });

  const resetForm = () => {
    setFile(null);
    setCategory('');
    setPersonId('');
    setIssueDate('');
    setNoIssueDate(false);
    setExpiryDate('');
    setNoExpiry(false);
    setScope('individual');
    setFolder('current');
  };

  const handleCancel = () => {
    setError('');
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !category || (scope === 'individual' && !personId)) {
      setError('Please fill in all required fields and select a valid file.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('category', category);
      formData.append('personId', personId);
      formData.append('issueDate', noIssueDate ? 'N/A' : (issueDate || 'N/A'));
      formData.append('expiryDate', noExpiry ? 'N/A' : (expiryDate || 'N/A'));
      formData.append('scope', scope);
      formData.append('folder', folder);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        credentials: 'include', // sends the httpOnly auth cookie automatically
        // DO NOT manually set 'Content-Type': 'multipart/form-data'.
        // Fetch will automatically add the boundary header when passing FormData.
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'File upload failed.');
      }

      setLastUploadedFile(file);
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
    setError('');
    try {
      if (navigator.canShare && navigator.canShare({ files: [lastUploadedFile] })) {
        await navigator.share({ files: [lastUploadedFile], title: lastUploadedFile.name });
      } else {
        // Fallback for browsers without file-sharing support (e.g. desktop
        // Safari/Firefox): open the file so the OS's native
        // viewer/print/share affordance is available.
        const url = URL.createObjectURL(lastUploadedFile);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (err) {
      // AbortError just means the user dismissed the share sheet - not an error.
      if (err.name !== 'AbortError') {
        setError('Could not open the save dialog: ' + err.message);
      }
    }
  };

  return (
    <Box m="20px">
      <Header title="DigiLocker" subtitle="Upload and organize household documents" />

      {error && (
        <Box
          mb="16px"
          p="10px 14px"
          borderRadius="6px"
          sx={{ backgroundColor: colors.redAccent[900], border: `1px solid ${colors.redAccent[600]}` }}
        >
          <Typography color={colors.redAccent[300]}>{error}</Typography>
        </Box>
      )}

      {lastUploadedFile && (
        <Box
          mb="16px"
          p="12px 14px"
          borderRadius="6px"
          sx={{ backgroundColor: colors.greenAccent[900], border: `1px solid ${colors.greenAccent[600]}` }}
        >
          <Typography color={colors.greenAccent[300]} mb="8px">
            Uploaded "{lastUploadedFile.name}" successfully.
          </Typography>
          <Button
            type="button"
            variant="outlined"
            onClick={handleSaveACopy}
            sx={{
              color: colors.greenAccent[300],
              borderColor: colors.greenAccent[500],
              '&:hover': { borderColor: colors.greenAccent[300], backgroundColor: colors.greenAccent[800] },
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
          maxWidth: '640px',
          p: '24px',
          backgroundColor: colors.primary[400],
          backgroundImage: 'none',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
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
          <FormLabel sx={{ color: colors.grey[300], fontSize: '0.85rem', mb: 0.5 }}>Scope</FormLabel>
          <RadioGroup row value={scope} onChange={(e) => setScope(e.target.value)}>
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
        {scope === 'individual' && (
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
        {(!selectedCategory || selectedCategory.hasIssueDate || selectedCategory.hasExpiryDate) && (
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
                      if (e.target.checked) setIssueDate('');
                    }}
                    sx={{ color: colors.grey[400], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                  />
                }
                label="N/A (Does not have Issue Date)"
                sx={{ color: colors.grey[300], mt: '2px', '& .MuiFormControlLabel-label': { fontSize: '0.85rem' } }}
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
                      if (e.target.checked) setExpiryDate('');
                    }}
                    sx={{ color: colors.grey[400], '&.Mui-checked': { color: colors.greenAccent[500] } }}
                  />
                }
                label="N/A (Does not expire)"
                sx={{ color: colors.grey[300], mt: '2px', '& .MuiFormControlLabel-label': { fontSize: '0.85rem' } }}
              />
            </Box>
          </Box>
        )}

        {/* Current / Archive */}
        <FormControlLabel
          control={
            <Checkbox
              checked={folder === 'current'}
              onChange={(e) => setFolder(e.target.checked ? 'current' : 'archive')}
              sx={{ color: colors.grey[400], '&.Mui-checked': { color: colors.greenAccent[500] } }}
            />
          }
          label="Current (uncheck to file under Archive)"
          sx={{ color: colors.grey[200] }}
        />

        {/* Drag and Drop Zone */}
        <Box
          {...getRootProps()}
          sx={{
            border: `2px dashed ${isDragActive ? colors.greenAccent[500] : colors.grey[500]}`,
            borderRadius: '6px',
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: isDragActive ? colors.blueAccent[900] : colors.primary[500],
            cursor: 'pointer',
            transition: 'background-color 120ms ease, border-color 120ms ease',
            '&:hover': { borderColor: colors.greenAccent[500] },
          }}
        >
          {/* `capture` lets mobile browsers offer the camera directly */}
          <input {...getInputProps({ capture: 'environment' })} />
          <CloudUploadOutlinedIcon sx={{ fontSize: 32, color: colors.grey[400], mb: 1 }} />
          {isDragActive ? (
            <Typography color={colors.grey[100]}>Drop the document here...</Typography>
          ) : (
            <Typography color={colors.grey[300]}>
              Drag & drop a document here, or click to select (PDF, JPG, PNG, WEBP - Max {MAX_FILE_SIZE_MB}MB)
            </Typography>
          )}
          {file && (
            <Typography color={colors.greenAccent[400]} fontWeight="bold" mt={1}>
              Selected File: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
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
              '&:hover': { borderColor: colors.redAccent[400], color: colors.redAccent[400] },
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
              color: '#fff',
              fontWeight: 'bold',
              '&:hover': { backgroundColor: colors.blueAccent[700] },
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default DigiLocker;