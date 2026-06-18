const mongoose = require('mongoose');

const JSON_OPTS = {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id; delete ret.__v;
    return ret;
  },
};

const projectDependencySchema = new mongoose.Schema({
  fromProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  toProjectId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  type: {
    type: String,
    enum: ['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'],
    default: 'finish_to_start',
  },
  description: { type: String, default: '' },
  isBlocking:  { type: Boolean, default: false },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, toJSON: JSON_OPTS });

projectDependencySchema.index({ fromProjectId: 1, toProjectId: 1 }, { unique: true });

module.exports = mongoose.model('ProjectDependency', projectDependencySchema);
