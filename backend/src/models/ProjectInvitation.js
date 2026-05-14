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

const projectInvitationSchema = new mongoose.Schema(
  {
    projectId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    email:      { type: String, required: true, lowercase: true, trim: true },
    invitedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
    role:       { type: String, enum: ['admin', 'member'], default: 'member' },
    token:      { type: String, required: true, unique: true },
    status:     { type: String, enum: ['pending', 'accepted', 'rejected', 'expired'], default: 'pending' },
    expiredAt:  { type: Date, required: true },
  },
  { timestamps: true, toJSON: JSON_OPTS }
);

projectInvitationSchema.index({ projectId: 1, email: 1 });

module.exports = mongoose.model('ProjectInvitation', projectInvitationSchema);
