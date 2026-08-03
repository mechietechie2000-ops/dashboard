import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
};

const DigiLocker = () => {
  // Form state
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [personId, setPersonId] = useState('');
  const [issueDate, setIssueDate] = useState('');
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

    // TODO: replace with a real GET /api/family endpoint once it exists.
    const mockFamily = [
      { id: '1', name: 'Self' },
      { id: '2', name: 'Spouse' },
      { id: '3', name: 'Child 1' }
    ];
    setFamilyMembers(mockFamily);
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
      formData.append('issueDate', issueDate || 'N/A');
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

      // Reset form
      setFile(null);
      setCategory('');
      setPersonId('');
      setIssueDate('');
      setExpiryDate('');
      setNoExpiry(false);
      setScope('individual');
      setFolder('current');
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
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>DigiLocker - Document Upload</h2>

      {error && <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#ffe6e6' }}>{error}</div>}

      {lastUploadedFile && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#e9f9ee', border: '1px solid #b7e4c7', borderRadius: '6px' }}>
          <p style={{ margin: 0 }}>Uploaded "{lastUploadedFile.name}" successfully.</p>
          <button
            type="button"
            onClick={handleSaveACopy}
            style={{ marginTop: '0.5rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}
          >
            Save a copy to iCloud / Files / Drive
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Category Selection */}
        <div style={{ marginBottom: '1rem' }}>
          <label><strong>Document Category *</strong></label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          >
            <option value="">-- Select Category --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Individual / Joint */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ marginRight: '1.5rem' }}>
            <input
              type="radio"
              name="scope"
              checked={scope === 'individual'}
              onChange={() => setScope('individual')}
            /> Individual
          </label>
          <label>
            <input
              type="radio"
              name="scope"
              checked={scope === 'joint'}
              onChange={() => setScope('joint')}
            /> Joint / Shared (household)
          </label>
        </div>

        {/* Family Member Selection (individual only) */}
        {scope === 'individual' && (
          <div style={{ marginBottom: '1rem' }}>
            <label><strong>Person Name *</strong></label>
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
            >
              <option value="">-- Select Family Member --</option>
              {familyMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Dates Selection */}
        {(!selectedCategory || selectedCategory.hasIssueDate || selectedCategory.hasExpiryDate) && (
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label><strong>Issue Date</strong></label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <label><strong>Expiration Date</strong></label>
              <input
                type="date"
                value={expiryDate}
                disabled={noExpiry}
                onChange={(e) => setExpiryDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
              />
              <label style={{ fontSize: '0.85rem', display: 'block', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  checked={noExpiry}
                  onChange={(e) => {
                    setNoExpiry(e.target.checked);
                    if (e.target.checked) setExpiryDate('');
                  }}
                /> N/A (Does not expire)
              </label>
            </div>
          </div>
        )}

        {/* Current / Archive */}
        <div style={{ marginBottom: '1rem' }}>
          <label>
            <input
              type="checkbox"
              checked={folder === 'current'}
              onChange={(e) => setFolder(e.target.checked ? 'current' : 'archive')}
            /> Current (uncheck to file under Archive)
          </label>
        </div>

        {/* Drag and Drop Zone */}
        <div
          {...getRootProps()}
          style={{
            border: '2px dashed #007bff',
            borderRadius: '6px',
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: isDragActive ? '#e9f5ff' : '#f9f9f9',
            cursor: 'pointer',
            marginBottom: '1rem'
          }}
        >
          {/* `capture` lets mobile browsers offer the camera directly */}
          <input {...getInputProps({ capture: 'environment' })} />
          {isDragActive ? (
            <p>Drop the document here...</p>
          ) : (
            <p>Drag & drop a document here, or click to select (PDF, JPG, PNG, WEBP - Max {MAX_FILE_SIZE_MB}MB)</p>
          )}
          {file && <p style={{ color: 'green', fontWeight: 'bold' }}>Selected File: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</p>}
        </div>

        <button
          type="submit"
          disabled={uploading}
          style={{ width: '100%', padding: '0.75rem', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </form>
    </div>
  );
};

export default DigiLocker;
