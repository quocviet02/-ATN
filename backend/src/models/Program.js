const mongoose = require('mongoose');

const JSON_OPTS = {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id; delete ret.__v; delete ret.deletedAt;
    return ret;
  },
};

const programSchema = new mongoose.Schema({
  portfolioId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name:           { type: String, required: true, trim: true },
  description:    { type: String, default: '' },
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'planning',
  },
  startDate:        { type: Date, default: null },
  targetEndDate:    { type: Date, default: null },
  actualEndDate:    { type: Date, default: null },
  budget: {
    total:    { type: Number, default: 0 },
    spent:    { type: Number, default: 0 },
    currency: { type: String, default: 'VND' },
  },
  programManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  objectives:       [{ type: String }],
  successMetrics: [{
    metric:  { type: String },
    target:  { type: String },
    current: { type: String },
  }],
  color:     { type: String, default: '#52c41a' },
  icon:      { type: String, default: 'apartment' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, toJSON: JSON_OPTS });

programSchema.pre(/^find/, function () {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
});
programSchema.methods.softDelete = async function () {
  this.deletedAt = new Date(); return this.save();
};

module.exports = mongoose.model('Program', programSchema);
