import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

// Allowed configuration & validation limits
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png']
};

const CATEGORIES = [
  'Passport',
  'Driver License',
  'Property Registry',
  'Power of Attorney',
  'Tax Return',
  'Medical Record',
  'Insurance Policy',
  'Other'
];

const DigiLocker = () => {
  // Form state
  const [category, setCategory] = useState('');
  const [personId, setPersonId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [noExpiry, setNoExpiry] = useState(false);

  // File & feedback state
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);

  // Mock fetching family members from your backend API
  useEffect(() => {
    // Replace with your actual API fetch call:
    // fetch('/api/family', { headers: { Authorization: `Bearer ${token}` } })
    const mockFamily = [
      { id: '1', name: 'Self' },
      { id: '2', name: 'Spouse' },
      { id: '3', name: 'Child 1' }
    ];
    setFamilyMembers(mockFamily);
  }, []);

  // File validation inside Dropzone
  const onDrop = (acceptedFiles, rejectedFiles) => {
    setError('');

    if (rejectedFiles.length > 0) {
      const err = rejectedFiles[0].errors[0];
      if (err.code === 'file-too-large') {
        setError(`File size exceeds the limit of ${MAX_FILE_SIZE_MB}MB.`);
      } else if (err.code === 'file-invalid-type') {
        setError('Invalid file format. Only PDF, JPG, and PNG are allowed.');
      } else {
        setError(err.message);
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];

      // Sanitize filename length check (prevent long-filename exploits)
      if (selectedFile.name.length > 100) {
        setError('Filename is too long (maximum 100 characters allowed).');
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
    if (!file || !category || !personId) {
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
      formData.append('issueDate', issueDate);
      formData.append('expiryDate', noExpiry ? 'N/A' : expiryDate);

      const token = localStorage.getItem('token'); // Or read from Auth Context

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          // DO NOT manually set 'Content-Type': 'multipart/form-data'.
          // Fetch will automatically add the boundary header when passing FormData.
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'File upload failed.');
      }

      alert('Document uploaded successfully!');
      // Reset form
      setFile(null);
      setCategory('');
      setPersonId('');
      setIssueDate('');
      setExpiryDate('');
      setNoExpiry(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
      <h2>DigiLocker - Document Upload</h2>
      
      {error && <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#ffe6e6' }}>{error}</div>}

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
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Family Member Selection */}
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

        {/* Dates Selection */}
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
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the document here...</p>
          ) : (
            <p>Drag & drop a document here, or click to select (PDF, JPG, PNG - Max 10MB)</p>
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