import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios'; // Import axios for making HTTP requests

const FileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      setUploadedFiles(acceptedFiles);
    },
  });

  const handleUpload = async () => {
    try {
      const formData = new FormData();
      uploadedFiles.forEach((file) => {
        formData.append('files', file);
      });

      // Send files to the server
      //await axios.post('/upload', formData, {
      await axios.post('http://localhost:5000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Clear uploaded files after successful upload
      setUploadedFiles([]);
    } catch (error) {
      console.error('Error uploading files:', error);
    }
  };

  return (
    <div>
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        <p>Drag and drop files here or click to browse.</p>
        <ul>
          {uploadedFiles.map((file) => (
            <li key={file.name}>{file.name}</li>
          ))}
        </ul>
      </div>
      <button onClick={handleUpload}>Upload Files</button>
    </div>
  );
};

export default FileUpload;
