const mongoose = require('mongoose');

const JSON_OPTS = {
  virtuals: true,
  transform: (_, ret) => { ret.id = ret._id?.toString(); delete ret._id; delete ret.__v; return ret; },
};

const timeOffSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', default: null },
  type: {
    type: String,
    enum: ['vacation','sick','personal','training','public_holiday','maternity','other'],
    default: 'vacation',
  },
  startDate:   { type: Date, required: true },
  endDate:     { type: Date, required: true },
  hoursPerDay: { type: Number, default: 8 },
  totalHours:  { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending','approved','rejected','cancelled'],
    default: 'pending',
  },
  reason:     { type: String, default: '' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true, toJSON: JSON_OPTS });

// Auto-calculate totalHours before save
timeOffSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    const days = Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24)) + 1;
    this.totalHours = days * (this.hoursPerDay || 8);
  }
  next();
});

module.exports = mongoose.model('TimeOff', timeOffSchema);
