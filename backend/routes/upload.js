const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { authenticate } = require('../middleware/auth'); // Ensure import matches your auth file

// Helper function to sanitize names for folder creation (removes invalid file characters)
const sanitizeFolderName = (name) => {
  if (!name) return 'Unsorted';
  return name.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim();
};

// Dynamic Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const { category, personName, expiryDate } = req.body;

      // 1. Determine status: current vs expired
      let status = 'current';
      if (expiryDate && expiryDate !== 'N/A') {
        const exp = new Date(expiryDate);
        const today = new Date();
        // Reset time component for an accurate date-only comparison
        today.setHours(0, 0, 0, 0);

        if (exp < today) {
          status = 'expired';
        }
      }

      // 2. Sanitize folder names to prevent directory traversal or invalid path characters
      const safePersonName = sanitizeFolderName(personName);
      const safeCategory = sanitizeFolderName(category);

      // 3. Construct target directory: uploads/{person_name}/{doc_type}/{current or expired}
      const targetDir = path.join(
        __dirname,
        '../uploads',
        safePersonName,
        safeCategory,
        status
      );

      // 4. Create directory recursively if it doesn't exist
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      cb(null, targetDir);
    } catch (err) {
      cb(err, null);
    }
  },

  filename: (req, file, cb) => {
    // Generate unique filename to avoid overwrites
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage: storage });

router.post('/api/documents/upload', authenticate, upload.single('document'), (req, res) => {
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    console.log('File successfully saved to dynamic path:', req.file.path);

    return res.status(200).json({
      message: 'File uploaded successfully!',
      filePath: req.file.path
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during upload.' });
  }
});

module.exports = router;