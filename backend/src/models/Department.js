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

const departmentSchema = new mongoose.Schema(
  {
    organizationId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name:               { type: String, required: true, trim: true },
    description:        { type: String, default: '' },
    headId:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    parentDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    color:              { type: String, default: '#1890ff' },
    icon:               { type: String, default: 'team' },
    deletedAt:          { type: Date, default: null },
  },
  { timestamps: true, toJSON: JSON_OPTS }
);

departmentSchema.pre(/^find/, function () {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

departmentSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Department', departmentSchema);
