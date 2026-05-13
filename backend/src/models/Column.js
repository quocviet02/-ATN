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

const columnSchema = new mongoose.Schema(
  {
    boardId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true },
    name:      { type: String, required: true },
    position:  { type: Number, required: true, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: JSON_OPTS }
);

columnSchema.pre(/^find/, function () {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

columnSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Column', columnSchema);
