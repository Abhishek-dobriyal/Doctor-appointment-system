const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    type: {
      type: String,
      enum: ['medication', 'test', 'diet', 'other'],
      default: 'other',
    },
    deadline: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending',
    },
    details: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);
