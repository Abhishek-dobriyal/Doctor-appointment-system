const mongoose = require('mongoose');

const availabilitySlotSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      required: true,
    },
    startMinutes: { type: Number, min: 0, max: 1439, required: true },
    endMinutes: { type: Number, min: 0, max: 1439, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['patient', 'doctor', 'admin'],
      required: true,
    },
    name: { type: String, trim: true, maxlength: 120, default: '' },
    dob: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    phone: { type: String, trim: true, maxlength: 32, default: '' },
    specialization: { type: String, trim: true, maxlength: 120, default: '' },
    bio: { type: String, trim: true, maxlength: 2000, default: '' },
    availability: [availabilitySlotSchema],
    /** Simulated 2FA: when true, login returns needsOtp until verified */
    otpEnabled: { type: Boolean, default: false },
    lastActivity: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ specialization: 1 });

module.exports = mongoose.model('User', userSchema);
