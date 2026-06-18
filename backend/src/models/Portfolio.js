const mongoose = require('mongoose');

const JSON_OPTS = {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id; delete ret.__v; delete ret.deletedAt;
    return ret;
  },
};

const portfolioSchema = new mongoose.Schema({
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name:           { type: String, required: true, trim: true },
  description:    { type: String, default: '' },
  strategicGoals: [{ type: String }],
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'planning',
  },
  startDate:     { type: Date, default: null },
  targetEndDate: { type: Date, default: null },
  actualEndDate: { type: Date, default: null },
  budget: {
    total:    { type: Number, default: 0 },
    spent:    { type: Number, default: 0 },
    currency: { type: String, default: 'VND' },
  },
  ownerId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stakeholders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  color:        { type: String, default: '#1890ff' },
  icon:         { type: String, default: 'folder' },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:    { type: Date, default: null },
}, { timestamps: true, toJSON: JSON_OPTS });

portfolioSchema.pre(/^find/, function () {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
});
portfolioSchema.methods.softDelete = async function () {
  this.deletedAt = new Date(); return this.save();
};

module.exports = mongoose.model('Portfolio', portfolioSchema);
