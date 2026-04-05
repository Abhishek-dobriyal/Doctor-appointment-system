const path = require('path');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || '') || '';
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  },
});

const allowed = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
]);

function fileFilter(_req, file, cb) {
  if (allowed.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, images, and plain text files are allowed'));
  }
}

const uploadHealth = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
});

module.exports = { uploadHealth, uploadDir };
