const { Skill, UserSkill, User } = require('../models');

// GET /api/skills?category=&search=
exports.listSkills = async (req, res) => {
  try {
    const { category, search } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const skills = await Skill.find(filter).sort({ category: 1, name: 1 });
    res.json(skills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/skills (Admin only)
exports.createSkill = async (req, res) => {
  try {
    const { name, category, description, color } = req.body;
    const skill = await Skill.create({ name, category, description, color });
    res.status(201).json(skill);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Skill already exists' });
    res.status(500).json({ message: err.message });
  }
};

// POST /api/skills/seed
exports.seedSkills = async (req, res) => {
  try {
    await Skill.seed();
    const count = await Skill.countDocuments();
    res.json({ message: `Skills ready. Total: ${count}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/users/:userId/skills
exports.getUserSkills = async (req, res) => {
  try {
    const skills = await UserSkill.find({ userId: req.params.userId })
      .populate('skillId', 'name category color icon')
      .populate('endorsedBy', 'name avatar')
      .sort({ level: -1 });
    res.json(skills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/users/:userId/skills
// Body: [{ skillId, level, yearsOfExperience, certificates }]
exports.updateUserSkills = async (req, res) => {
  try {
    const userId = req.params.userId;
    const items  = req.body; // array

    if (!Array.isArray(items)) return res.status(400).json({ message: 'Body must be an array' });

    const results = [];
    for (const item of items) {
      const { skillId, level, yearsOfExperience, certificates, lastUsedDate } = item;
      const doc = await UserSkill.findOneAndUpdate(
        { userId, skillId },
        { userId, skillId, level, yearsOfExperience: yearsOfExperience || 0, certificates: certificates || [], lastUsedDate: lastUsedDate || null, selfAssessed: true },
        { upsert: true, new: true, runValidators: true }
      ).populate('skillId', 'name category color');
      results.push(doc);
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/users/:userId/skills/:skillId
exports.removeUserSkill = async (req, res) => {
  try {
    await UserSkill.findOneAndDelete({ userId: req.params.userId, skillId: req.params.skillId });
    res.json({ message: 'Skill removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/users/:userId/skills/:skillId/endorse
exports.endorseSkill = async (req, res) => {
  try {
    const { userId, skillId } = req.params;
    const endorserId = req.user._id;

    if (userId === endorserId.toString()) {
      return res.status(400).json({ message: 'Cannot endorse your own skill' });
    }

    const userSkill = await UserSkill.findOneAndUpdate(
      { userId, skillId },
      { $addToSet: { endorsedBy: endorserId } },
      { new: true }
    ).populate('skillId', 'name category color');

    if (!userSkill) return res.status(404).json({ message: 'Skill not found for this user' });
    res.json(userSkill);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/organizations/:orgId/skills-matrix
// Returns all members with their skills for the org
exports.getOrgSkillsMatrix = async (req, res) => {
  try {
    const { OrganizationMember } = require('../models');
    const members = await OrganizationMember.find({ organizationId: req.organization._id, status: { $ne: 'suspended' } })
      .populate('userId', 'name email avatar workCapacity');

    const userIds = members.map(m => m.userId?._id).filter(Boolean);
    const userSkills = await UserSkill.find({ userId: { $in: userIds } })
      .populate('skillId', 'name category color');

    // Group by userId
    const skillsByUser = {};
    userSkills.forEach(us => {
      const uid = us.userId.toString();
      if (!skillsByUser[uid]) skillsByUser[uid] = [];
      skillsByUser[uid].push(us);
    });

    const skills = await Skill.find().sort({ category: 1, name: 1 });

    const matrix = members
      .filter(m => m.userId)
      .map(m => ({
        user:   m.userId,
        orgRole: m.orgRole,
        skills: skillsByUser[m.userId._id.toString()] || [],
      }));

    res.json({ matrix, skills });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
