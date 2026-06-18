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
    startDate:   { type: Date, default: null },
    dueDate:     { type: Date, default: null },
    deletedAt:   { type: Date, default: null },
    status:      {
      type:    String,
      enum:    ['planning','in_development','testing','released','maintenance','paused','cancelled'],
      default: 'in_development',
    },
    version:     { type: String, default: '1.0.0' },
    releaseDate: { type: Date, default: null },
    endDate:     { type: Date, default: null },
    progress:    { type: Number, default: 0, min: 0, max: 100 },
    techStack:   [{ type: String }],
    repository:  { type: String, default: '' },
    demoUrl:        { type: String, default: '' },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null, index: true },
    departmentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    portfolioId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', default: null, index: true },
    programId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Program', default: null, index: true },
    visibility:     {
      type:    String,
      enum:    ['private', 'department', 'organization', 'public'],
      default: 'private',
    },
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
