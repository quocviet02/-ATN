const mongoose = require('mongoose');

const JSON_OPTS = {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
};

const organizationMemberSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    departmentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    orgRole: {
      type:    String,
      enum:    ['owner', 'admin', 'department_head', 'team_lead', 'member', 'guest'],
      default: 'member',
    },
    jobTitle:   { type: String, default: '' },
    employeeId: { type: String, default: '' },
    joinedAt:   { type: Date, default: Date.now },
    invitedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type:    String,
      enum:    ['active', 'invited', 'suspended', 'deactivated'],
      default: 'active',
    },
    permissions: [{ type: String }],
  },
  { timestamps: true, toJSON: JSON_OPTS }
);

organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('OrganizationMember', organizationMemberSchema);
