const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: ['task_assigned', 'task_due_soon', 'task_overdue', 'comment_added',
           'member_invited', 'member_joined', 'task_moved', 'task_updated'],
    required: true
  },
  title:   { type: String, required: true },
  body:    { type: String, default: '' },
  link:    { type: String, default: '' },
  isRead:  { type: Boolean, default: false, index: true },
  meta:    { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
