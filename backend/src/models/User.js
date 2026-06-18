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

const userSchema = new mongoose.Schema(
  {
    name:      { type: String, required: true },
    email:     { type: String, required: true, unique: true, lowercase: true },
    password:  { type: String, required: true },
    avatar:    { type: String, default: null },
    deletedAt: { type: Date,   default: null },
    workCapacity: {
      hoursPerWeek: { type: Number, default: 40 },
      workingDays:  { type: [String], default: ['mon','tue','wed','thu','fri'] },
      timezone:     { type: String, default: 'Asia/Ho_Chi_Minh' },
      startTime:    { type: String, default: '09:00' },
      endTime:      { type: String, default: '18:00' },
    },
  },
  { timestamps: true, toJSON: JSON_OPTS }
);

userSchema.pre(/^find/, function () {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

userSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
