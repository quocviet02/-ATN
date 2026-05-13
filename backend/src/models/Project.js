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

const projectSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    description: { type: String, default: '' },
    background:  { type: String, default: '' },
    owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt:   { type: Date, default: null },
  },
  { timestamps: true, toJSON: JSON_OPTS }
);

projectSchema.pre(/^find/, function () {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

projectSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Project', projectSchema);
