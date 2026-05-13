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

const projectMemberSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    role:           { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    canEditTask:    { type: Boolean, default: false },
    canDragTask:    { type: Boolean, default: false },
    canAssignSelf:  { type: Boolean, default: false },
    canAssignOthers:{ type: Boolean, default: false },
  },
  { timestamps: true, toJSON: JSON_OPTS }
);

projectMemberSchema.index({ projectId: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('ProjectMember', projectMemberSchema);
