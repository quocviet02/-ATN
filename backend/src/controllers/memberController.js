const { User, ProjectMember } = require('../models');

const USER_SELECT = 'id name email avatar';

function err(res, status, message, error) {
  return res.status(status).json({ statusCode: status, message, error });
}

// ─── GET /api/projects/:id/members ───────────────────────────────────────────

exports.getMembers = async (req, res) => {
  try {
    const members = await ProjectMember.find({ projectId: req.params.id })
      .populate('user', USER_SELECT)
      .sort({ createdAt: 1 });
    res.json({ members });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/projects/:id/members ──────────────────────────────────────────

exports.addMember = async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    const projectId  = req.params.id;
    const callerRole = req.membership.role;

    if (!email?.trim()) return err(res, 400, 'Email is required', 'Bad Request');

    if (!['admin', 'member'].includes(role)) {
      return err(res, 400, "Role must be 'admin' or 'member'", 'Bad Request');
    }

    if (callerRole === 'admin' && role === 'admin') {
      return err(res, 403, "Admins can only add users with role 'member'", 'Forbidden');
    }

    const targetUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (!targetUser) {
      return err(res, 404, 'No user found with that email', 'Not Found');
    }

    const existing = await ProjectMember.findOne({ projectId, user: targetUser._id });
    if (existing) {
      return err(res, 409, 'User is already a member of this project', 'Conflict');
    }

    const member = await ProjectMember.create({ projectId, user: targetUser._id, role });
    await member.populate('user', USER_SELECT);

    res.status(201).json({ member });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── PUT /api/projects/:id/members/:userId ────────────────────────────────────

exports.updateMemberRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id: projectId, userId: targetUserId } = req.params;

    if (!['admin', 'member'].includes(role)) {
      return err(res, 400, "Role must be 'admin' or 'member'", 'Bad Request');
    }

    const target = await ProjectMember.findOne({ projectId, user: targetUserId })
      .populate('user', USER_SELECT);

    if (!target) return err(res, 404, 'Member not found in this project', 'Not Found');

    if (target.role === 'owner') {
      return err(res, 403, "Cannot change the owner's role. Transfer ownership instead.", 'Forbidden');
    }

    target.role = role;
    await target.save();

    res.json({ member: target });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── PUT /api/projects/:id/members/:userId/permissions ───────────────────────

exports.updateMemberPermissions = async (req, res) => {
  try {
    const { id: projectId, userId: targetUserId } = req.params;
    const { canEditTask, canDragTask, canAssignSelf, canAssignOthers } = req.body;

    const target = await ProjectMember.findOne({ projectId, user: targetUserId })
      .populate('user', USER_SELECT);

    if (!target) return err(res, 404, 'Member not found in this project', 'Not Found');

    if (target.role === 'owner') {
      return err(res, 403, "Cannot change the owner's permissions", 'Forbidden');
    }

    if (canEditTask    !== undefined) target.canEditTask     = !!canEditTask;
    if (canDragTask    !== undefined) target.canDragTask     = !!canDragTask;
    if (canAssignSelf  !== undefined) target.canAssignSelf   = !!canAssignSelf;
    if (canAssignOthers !== undefined) target.canAssignOthers = !!canAssignOthers;

    await target.save();
    res.json({ member: target });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/projects/:id/my-permissions ────────────────────────────────────

exports.getMyPermissions = async (req, res) => {
  try {
    const membership = req.membership;
    const isOwnerOrAdmin = ['owner', 'admin'].includes(membership.role);
    res.json({
      permissions: {
        canEditTask:     isOwnerOrAdmin || membership.canEditTask,
        canDragTask:     isOwnerOrAdmin || membership.canDragTask,
        canAssignSelf:   isOwnerOrAdmin || membership.canAssignSelf,
        canAssignOthers: isOwnerOrAdmin || membership.canAssignOthers,
      }
    });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── PUT /api/projects/:id/last-accessed ────────────────────────────────────

exports.updateLastAccessed = async (req, res) => {
  try {
    await ProjectMember.findOneAndUpdate(
      { projectId: req.params.id, user: req.user._id },
      { $set: { lastAccessedAt: new Date() } }
    );
    res.json({ success: true });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── DELETE /api/projects/:id/members/:userId ────────────────────────────────

exports.removeMember = async (req, res) => {
  try {
    const { id: projectId, userId: targetUserId } = req.params;
    const callerRole = req.membership.role;

    const target = await ProjectMember.findOne({ projectId, user: targetUserId });

    if (!target) return err(res, 404, 'Member not found in this project', 'Not Found');

    if (target.role === 'owner') {
      return err(res, 403, 'Cannot remove the project owner. Transfer ownership first.', 'Forbidden');
    }

    if (callerRole === 'admin' && target.role === 'admin') {
      return err(res, 403, 'Admins cannot remove other admins', 'Forbidden');
    }

    await target.deleteOne();
    res.json({ statusCode: 200, message: 'Member removed successfully' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
