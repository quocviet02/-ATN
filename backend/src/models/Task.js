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

const taskSchema = new mongoose.Schema(
  {
    columnId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Column', required: true },
    boardId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Board',  required: true },
    title:       { type: String, required: true },
    description: { type: String, default: '' },
    assignee:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    priority:    { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    dueDate:     { type: Date,   default: null },
    position:       { type: Number, required: true, default: 0 },
    createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt:      { type: Date,   default: null },
    startDate:      { type: Date,   default: null },
    estimatedHours: { type: Number, default: null },
    actualHours:    { type: Number, default: null },
    dependencies:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    progress:       { type: Number, default: 0, min: 0, max: 100 },
    workflowId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', default: null },
    currentStateId: { type: String, default: null },
    slaBreached:    { type: Boolean, default: false },
    stateHistory: [{
      stateId:       { type: String },
      enteredAt:     { type: Date },
      exitedAt:      { type: Date, default: null },
      durationHours: { type: Number, default: null },
      userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      _id: false,
    }],
    pendingApprovals: [{
      transitionId: { type: String },
      requesterId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      requestedAt:  { type: Date, default: Date.now },
      comment:      { type: String, default: '' },
      approvers: [{
        userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        decidedAt:  { type: Date, default: null },
        comment:    { type: String, default: '' },
        _id: false,
      }],
      _id: false,
    }],
  },
  { timestamps: true, toJSON: JSON_OPTS }
);

taskSchema.pre(/^find/, function () {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

taskSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Task', taskSchema);
