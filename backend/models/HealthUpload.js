const mongoose = require('mongoose');

const healthUploadSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalName: { type: String, trim: true, maxlength: 255 },
    storedName: { type: String, required: true },
    mimeType: { type: String, maxlength: 128 },
    sizeBytes: { type: Number },
    label: { type: String, trim: true, maxlength: 200, default: 'Health report' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('HealthUpload', healthUploadSchema);
