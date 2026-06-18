const mongoose = require('mongoose');

const JSON_OPTS = {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id; delete ret.__v; delete ret.deletedAt;
    return ret;
  },
};

const riskSchema = new mongoose.Schema({
  scopeType: {
    type: String,
    enum: ['portfolio', 'program', 'project'],
    required: true,
  },
  scopeId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title:   { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: {
    type: String,
    enum: ['technical', 'resource', 'financial', 'schedule', 'scope', 'external'],
    default: 'technical',
  },
  probability: { type: Number, min: 1, max: 5, required: true },
  impact:      { type: Number, min: 1, max: 5, required: true },
  riskScore:   { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['identified', 'mitigated', 'occurred', 'closed'],
    default: 'identified',
  },
  mitigationPlan: { type: String, default: '' },
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate:   { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true, toJSON: JSON_OPTS });

riskSchema.pre('save', function (next) {
  this.riskScore = this.probability * this.impact;
  next();
});

riskSchema.pre(/^find/, function () {
  if (this.getQuery().deletedAt === undefined) this.where({ deletedAt: null });
});

riskSchema.methods.softDelete = async function () {
  this.deletedAt = new Date(); return this.save();
};

module.exports = mongoose.model('Risk', riskSchema);
