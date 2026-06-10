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

const releaseSchema = new mongoose.Schema(
  {
    projectId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    version:      { type: String, required: true },
    releaseDate:  { type: Date, required: true },
    releaseNotes: { type: String, default: '' },
    type:         { type: String, enum: ['major', 'minor', 'patch', 'hotfix'], default: 'minor' },
    status:       { type: String, enum: ['draft', 'released', 'rollback'], default: 'released' },
    createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tasks:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
    deletedAt:    { type: Date, default: null },
  },
  { timestamps: true, toJSON: JSON_OPTS }
);

releaseSchema.pre(/^find/, function () {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

releaseSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Release', releaseSchema);
