const ProjectMember = require('../models/ProjectMember');

/**
 * requireRole(...roles)
 *   - No roles → any project member passes
 *   - With roles → member's role must be in the list
 * Sets req.membership so controllers can read the caller's role without an extra DB call.
 */
const requireRole = (...roles) =>
  async (req, res, next) => {
    try {
      const projectId = req.params.projectId;
      const member = await ProjectMember.findOne({ projectId, user: req.user._id });

      if (!member) {
        return res.status(403).json({ message: 'You are not a member of this project' });
      }

      if (roles.length && !roles.includes(member.role)) {
        return res.status(403).json({
          message: `This action requires one of: ${roles.join(', ')}. Your role: ${member.role}`,
        });
      }

      req.membership = member;
      next();
    } catch (err) {
      next(err);
    }
  };

module.exports = { requireRole };
