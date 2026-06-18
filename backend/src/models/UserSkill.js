const mongoose = require('mongoose');

const JSON_OPTS = {
  virtuals: true,
  transform: (_, ret) => { ret.id = ret._id?.toString(); delete ret._id; delete ret.__v; return ret; },
};

const userSkillSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skillId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
  level:             { type: Number, min: 1, max: 5, required: true },
  yearsOfExperience: { type: Number, default: 0 },
  selfAssessed:      { type: Boolean, default: true },
  endorsedBy:        [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  lastUsedDate:      { type: Date, default: null },
  certificates:      [{ type: String }],
}, { timestamps: true, toJSON: JSON_OPTS });

userSkillSchema.index({ userId: 1, skillId: 1 }, { unique: true });

module.exports = mongoose.model('UserSkill', userSkillSchema);
