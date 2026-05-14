const crypto                        = require('crypto');
const { ProjectMember, ProjectInvitation, User } = require('../models');
const { sendInvitationEmail }       = require('../utils/emailService');
const notifService                  = require('../services/notificationService');

const USER_SELECT = 'id name email avatar';

function err(res, status, message, error = 'Error') {
  return res.status(status).json({ statusCode: status, message, error });
}

// ─── POST /api/projects/:id/invitations ───────────────────────────────────────

exports.createInvitation = async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    const projectId  = req.params.id;
    const project    = req.project;
    const callerRole = req.membership.role;

    if (!email?.trim()) return err(res, 400, 'Email is required', 'Bad Request');
    if (!['admin', 'member'].includes(role)) {
      return err(res, 400, "Role must be 'admin' or 'member'", 'Bad Request');
    }
    if (callerRole === 'admin' && role === 'admin') {
      return err(res, 403, "Admins can only invite users with role 'member'", 'Forbidden');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Already a member?
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const isMember = await ProjectMember.findOne({ projectId, user: existingUser._id });
      if (isMember) return err(res, 409, 'User is already a member of this project', 'Conflict');
    }

    // Already has a live pending invitation?
    const existingInv = await ProjectInvitation.findOne({
      projectId,
      email:     normalizedEmail,
      status:    'pending',
      expiredAt: { $gt: new Date() },
    });
    if (existingInv) {
      return err(res, 409, 'A pending invitation already exists for this email', 'Conflict');
    }

    const token     = crypto.randomUUID();
    const expiredAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await ProjectInvitation.create({
      projectId,
      email: normalizedEmail,
      invitedBy: req.user._id,
      role,
      token,
      status: 'pending',
      expiredAt,
    });

    await sendInvitationEmail({
      toEmail:     normalizedEmail,
      inviterName: req.user.name,
      projectName: project.name,
      role,
      token,
    });

    res.status(201).json({ message: `Đã gửi lời mời đến ${normalizedEmail}` });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/projects/:id/invitations ────────────────────────────────────────

exports.getInvitations = async (req, res) => {
  try {
    const invitations = await ProjectInvitation.find({ projectId: req.params.id })
      .populate('invitedBy', USER_SELECT)
      .sort({ createdAt: -1 });
    res.json({ invitations });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── DELETE /api/projects/:id/invitations/:invitationId ──────────────────────

exports.deleteInvitation = async (req, res) => {
  try {
    const inv = await ProjectInvitation.findOne({
      _id:       req.params.invitationId,
      projectId: req.params.id,
    });
    if (!inv) return err(res, 404, 'Invitation not found', 'Not Found');
    await inv.deleteOne();
    res.json({ message: 'Invitation cancelled' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/invite/:token  (public — no JWT) ────────────────────────────────

exports.getByToken = async (req, res) => {
  try {
    const inv = await ProjectInvitation.findOne({ token: req.params.token })
      .populate('projectId', 'name')
      .populate('invitedBy', USER_SELECT);

    if (!inv) return err(res, 404, 'Invitation not found', 'Not Found');

    // Auto-expire if past deadline
    if (inv.status === 'pending' && inv.expiredAt < new Date()) {
      inv.status = 'expired';
      await inv.save();
    }

    res.json({
      invitation: {
        id:        inv.id,
        email:     inv.email,
        role:      inv.role,
        status:    inv.status,
        expiredAt: inv.expiredAt,
        project:   { id: inv.projectId.id, name: inv.projectId.name },
        invitedBy: {
          name:      inv.invitedBy.name,
          avatarUrl: inv.invitedBy.avatar || '',
        },
      },
    });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/invite/:token/accept  (requires JWT) ──────────────────────────

exports.acceptToken = async (req, res) => {
  try {
    const inv = await ProjectInvitation.findOne({ token: req.params.token });
    if (!inv) return err(res, 404, 'Invitation not found', 'Not Found');

    if (inv.status === 'expired' || inv.expiredAt < new Date()) {
      if (inv.status !== 'expired') { inv.status = 'expired'; await inv.save(); }
      return err(res, 410, 'Invitation has expired', 'Gone');
    }
    if (inv.status !== 'pending') {
      return err(res, 400, `Invitation is already ${inv.status}`, 'Bad Request');
    }

    // Email must match logged-in user
    if (inv.email !== req.user.email.toLowerCase()) {
      return err(res, 403, 'This invitation is not for your account', 'Forbidden');
    }

    // Already a member → just mark accepted and return
    const existing = await ProjectMember.findOne({ projectId: inv.projectId, user: req.user._id });
    if (existing) {
      inv.status = 'accepted';
      await inv.save();
      return res.json({ message: 'You are already a member', projectId: inv.projectId });
    }

    await ProjectMember.create({ projectId: inv.projectId, user: req.user._id, role: inv.role });
    inv.status = 'accepted';
    await inv.save();

    // Notify the inviter
    if (inv.invitedBy && inv.invitedBy.toString() !== req.user._id.toString()) {
      notifService.create({
        recipient: inv.invitedBy,
        type:      'member_joined',
        title:     'Thành viên mới đã tham gia',
        body:      `${req.user.name} đã chấp nhận lời mời của bạn`,
        link:      `/project/members`,
        meta:      { projectId: inv.projectId, userId: req.user._id },
      });
    }

    res.json({ message: 'Invitation accepted', projectId: inv.projectId });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/invite/:token/reject  (public) ────────────────────────────────

exports.rejectToken = async (req, res) => {
  try {
    const inv = await ProjectInvitation.findOne({ token: req.params.token });
    if (!inv) return err(res, 404, 'Invitation not found', 'Not Found');
    if (inv.status !== 'pending') {
      return err(res, 400, `Invitation is already ${inv.status}`, 'Bad Request');
    }
    inv.status = 'rejected';
    await inv.save();
    res.json({ message: 'Invitation rejected' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
