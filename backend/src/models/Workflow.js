const mongoose = require('mongoose');

const JSON_OPTS = {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.deletedAt;
    return ret;
  },
};

const AutoActionSchema = new mongoose.Schema({
  type:   { type: String, enum: ['send_notification', 'assign_user', 'send_email', 'update_field'] },
  config: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const TransitionSchema = new mongoose.Schema({
  id:              { type: String, default: () => require('crypto').randomUUID() },
  name:            { type: String, required: true },
  fromStateId:     { type: String, required: true },
  toStateId:       { type: String, required: true },
  allowedRoles:    [{ type: String, enum: ['owner', 'admin', 'member'] }],
  allowedUsers:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  requiredFields:  [{ type: String }],
  requireApproval: { type: Boolean, default: false },
  approvers:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  approvalCount:   { type: Number, default: 1 },
  autoActions:     [AutoActionSchema],
}, { _id: false });

const StateSchema = new mongoose.Schema({
  id:        { type: String, default: () => require('crypto').randomUUID() },
  name:      { type: String, required: true },
  color:     { type: String, default: '#3b82f6' },
  position:  { type: Number, default: 0 },
  isInitial: { type: Boolean, default: false },
  isFinal:   { type: Boolean, default: false },
  slaHours:  { type: Number, default: null },
}, { _id: false });

const workflowSchema = new mongoose.Schema(
  {
    projectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name:        { type: String, required: true },
    description: { type: String, default: '' },
    isDefault:   { type: Boolean, default: false },
    states:      [StateSchema],
    transitions: [TransitionSchema],
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt:   { type: Date, default: null },
  },
  { timestamps: true, toJSON: JSON_OPTS }
);

workflowSchema.pre(/^find/, function () {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

workflowSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Workflow', workflowSchema);
