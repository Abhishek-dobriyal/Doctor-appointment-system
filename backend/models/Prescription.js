const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    title: { type: String, trim: true, maxlength: 200, default: 'Prescription' },
    items: [{ type: String, trim: true, maxlength: 500 }],
    /** Mock PDF served as static HTML route */
    mockPdfToken: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);
