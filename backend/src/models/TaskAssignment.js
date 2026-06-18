const mongoose = require('mongoose');

const JSON_OPTS = {
  virtuals: true,
  transform: (_, ret) => { ret.id = ret._id?.toString(); delete ret._id; delete ret.__v; return ret; },
};

const taskAssignmentSchema = new mongoose.Schema({
  taskId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  estimatedHours: { type: Number, default: 0 },
  actualHours:    { type: Number, default: 0 },
  startDate:      { type: Date, default: null },
  dueDate:        { type: Date, default: null },
  status: {
    type: String,
    enum: ['assigned','in_progress','completed'],
    default: 'assigned',
  },
  // Key: "2026-W22", Value: hours allocated that week
  weeklyAllocation: { type: Map, of: Number, default: {} },
}, { timestamps: true, toJSON: JSON_OPTS });

taskAssignmentSchema.index({ taskId: 1, userId: 1 }, { unique: true });
taskAssignmentSchema.index({ userId: 1, startDate: 1 });

module.exports = mongoose.model('TaskAssignment', taskAssignmentSchema);
