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

const organizationSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, unique: true, trim: true },
    slug:        { type: String, unique: true, lowercase: true, trim: true },
    logo:        { type: String, default: null },
    description: { type: String, default: '' },
    industry:    {
      type: String,
      enum: ['banking', 'finance', 'technology', 'healthcare', 'education', 'other'],
      default: 'other',
    },
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '500+'],
      default: '1-10',
    },
    country:  { type: String, default: 'Vietnam' },
    website:  { type: String, default: '' },
    plan:     {
      type:    String,
      enum:    ['free', 'starter', 'business', 'enterprise'],
      default: 'free',
    },
    maxMembers:  { type: Number, default: 10 },
    maxProjects: { type: Number, default: 5 },
    settings: {
      allowMemberInvite:          { type: Boolean, default: true },
      requireApprovalForJoin:     { type: Boolean, default: false },
      defaultProjectVisibility:   { type: String, enum: ['public', 'private'], default: 'private' },
      ssoEnabled:                 { type: Boolean, default: false },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON: JSON_OPTS }
);

organizationSchema.pre(/^find/, function () {
  if (this.getQuery().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

organizationSchema.pre('save', function (next) {
  if (this.isModified('name') || this.isNew) {
    this.slug = this.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]/g, '')
      .replace(/--+/g, '-')
      .trim();
  }
  next();
});

organizationSchema.methods.softDelete = async function () {
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Organization', organizationSchema);
