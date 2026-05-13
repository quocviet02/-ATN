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
    position:    { type: Number, required: true, default: 0 },
    deletedAt:   { type: Date,   default: null },
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
