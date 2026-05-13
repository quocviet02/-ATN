const mongoose = require('mongoose');

const JSON_OPTS = {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
};

const activityLogSchema = new mongoose.Schema(
  {
    taskId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    action:   { type: String, enum: ['created', 'updated', 'moved', 'assigned', 'commented', 'deleted'], required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true, updatedAt: false, toJSON: JSON_OPTS }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
