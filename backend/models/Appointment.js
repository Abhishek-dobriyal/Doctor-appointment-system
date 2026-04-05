const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
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
      index: true,
    },
    startTime: { type: Date, required: true, index: true },
    durationMinutes: {
      type: Number,
      enum: [15, 30, 60],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'completed'],
      default: 'pending',
      index: true,
    },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    doctorNotes: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true }
);

appointmentSchema.index({ doctor: 1, startTime: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
