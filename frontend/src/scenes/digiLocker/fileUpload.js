import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';

const FileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      setUploadedFiles(acceptedFiles);
    },
  });
//TO DO : Customize and Style this Drag and Drop to Upload box as you want
  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <p>Drag and drop files here or click to browse.</p>
      <ul>
        {uploadedFiles.map((file) => (
          <li key={file.name}>{file.name}</li>
        ))}
      </ul>
    </div>
  );
};
export default FileUpload;