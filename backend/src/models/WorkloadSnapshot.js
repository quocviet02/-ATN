const mongoose = require('mongoose');

const JSON_OPTS = {
  virtuals: true,
  transform: (_, ret) => { ret.id = ret._id?.toString(); delete ret._id; delete ret.__v; return ret; },
};

const workloadSnapshotSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekStart:     { type: Date, required: true },
  capacityHours: { type: Number, default: 40 },
  allocatedHours:{ type: Number, default: 0 },
  actualHours:   { type: Number, default: 0 },
  utilization:   { type: Number, default: 0 },
  isOverloaded:  { type: Boolean, default: false },
  burnoutRisk: {
    type: String,
    enum: ['low','medium','high','critical'],
    default: 'low',
  },
  projectBreakdown: [{
    projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    projectName: { type: String },
    hours:       { type: Number },
    _id: false,
  }],
}, { timestamps: true, toJSON: JSON_OPTS });

workloadSnapshotSchema.index({ userId: 1, weekStart: -1 });
workloadSnapshotSchema.index({ userId: 1, weekStart: 1 }, { unique: true });

module.exports = mongoose.model('WorkloadSnapshot', workloadSnapshotSchema);
