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

const commentSchema = new mongoose.Schema(
  {
    taskId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content:   { type: String, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: JSON_OPTS }
);

commentSchema.pre(/^find/, function () {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

commentSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Comment', commentSchema);
