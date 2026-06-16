const { OrganizationMember, User, Department } = require('../models');
const nodemailer = require('nodemailer');

const USER_SELECT = 'id name email avatar';

function err(res, status, message, error) {
  return res.status(status).json({ statusCode: status, message, error });
}

// ─── GET /api/organizations/:id/members ──────────────────────────────────────

exports.getMembers = async (req, res) => {
  try {
    const { departmentId, role, search, page = 1, limit = 20 } = req.query;
    const filter = { organizationId: req.organization._id };

    if (departmentId) filter.departmentId = departmentId;
    if (role)         filter.orgRole      = role;

    let query = OrganizationMember.find(filter)
      .populate('userId',       USER_SELECT)
      .populate('departmentId', 'id name color')
      .populate('invitedBy',    'id name email')
      .sort({ joinedAt: -1 });

    const total   = await OrganizationMember.countDocuments(filter);
    const skip    = (Number(page) - 1) * Number(limit);
    const members = await query.skip(skip).limit(Number(limit));

    let result = members;
    if (search) {
      const s = search.toLowerCase();
      result = members.filter(m =>
        m.userId?.name?.toLowerCase().includes(s) ||
        m.userId?.email?.toLowerCase().includes(s)
      );
    }

    res.json({ members: result, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/organizations/:id/members/invite ───────────────────────────────

exports.inviteMember = async (req, res) => {
  try {
    const { email, orgRole = 'member', departmentId, jobTitle } = req.body;
    if (!email) return err(res, 400, 'email is required', 'Bad Request');

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return err(res, 404, 'User not found. They must register first.', 'Not Found');
    }

    const existing = await OrganizationMember.findOne({
      organizationId: req.organization._id,
      userId:         user._id,
    });

    if (existing) {
      return err(res, 409, 'User is already a member of this organization', 'Conflict');
    }

    const memberCount = await OrganizationMember.countDocuments({
      organizationId: req.organization._id,
      status:         'active',
    });

    if (memberCount >= req.organization.maxMembers) {
      return err(res, 403, 'Organization member limit reached', 'Forbidden');
    }

    const membership = await OrganizationMember.create({
      organizationId: req.organization._id,
      userId:         user._id,
      departmentId:   departmentId || null,
      orgRole,
      jobTitle:       jobTitle || '',
      invitedBy:      req.user._id,
      status:         'invited',
      joinedAt:       new Date(),
    });

    await membership.populate('userId', USER_SELECT);
    res.status(201).json({ member: membership });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── POST /api/organizations/:id/members/bulk-invite ─────────────────────────

exports.bulkInvite = async (req, res) => {
  try {
    const { members } = req.body;
    if (!Array.isArray(members) || members.length === 0) {
      return err(res, 400, 'members array is required', 'Bad Request');
    }

    const results = { invited: [], failed: [] };

    for (const item of members) {
      try {
        const user = await User.findOne({ email: item.email?.toLowerCase() });
        if (!user) {
          results.failed.push({ email: item.email, reason: 'User not found' });
          continue;
        }

        const existing = await OrganizationMember.findOne({
          organizationId: req.organization._id,
          userId:         user._id,
        });

        if (existing) {
          results.failed.push({ email: item.email, reason: 'Already a member' });
          continue;
        }

        await OrganizationMember.create({
          organizationId: req.organization._id,
          userId:         user._id,
          departmentId:   item.departmentId || null,
          orgRole:        item.orgRole || 'member',
          jobTitle:       item.jobTitle || '',
          invitedBy:      req.user._id,
          status:         'invited',
          joinedAt:       new Date(),
        });

        results.invited.push(item.email);
      } catch (itemErr) {
        results.failed.push({ email: item.email, reason: itemErr.message });
      }
    }

    res.status(201).json({ results });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── PUT /api/organizations/:orgId/members/:userId ────────────────────────────

exports.updateMember = async (req, res) => {
  try {
    const { orgRole, departmentId, jobTitle, employeeId } = req.body;

    const membership = await OrganizationMember.findOne({
      organizationId: req.organization._id,
      userId:         req.params.userId,
    });

    if (!membership) return err(res, 404, 'Member not found', 'Not Found');

    // Prevent demoting the only owner
    if (membership.orgRole === 'owner' && orgRole && orgRole !== 'owner') {
      const ownerCount = await OrganizationMember.countDocuments({
        organizationId: req.organization._id,
        orgRole:        'owner',
        status:         'active',
      });
      if (ownerCount <= 1) {
        return err(res, 400, 'Cannot demote the only owner', 'Bad Request');
      }
    }

    if (orgRole      !== undefined) membership.orgRole      = orgRole;
    if (departmentId !== undefined) membership.departmentId = departmentId || null;
    if (jobTitle     !== undefined) membership.jobTitle     = jobTitle;
    if (employeeId   !== undefined) membership.employeeId   = employeeId;

    await membership.save();
    await membership.populate('userId',       USER_SELECT);
    await membership.populate('departmentId', 'id name color');
    res.json({ member: membership });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── DELETE /api/organizations/:orgId/members/:userId ─────────────────────────

exports.removeMember = async (req, res) => {
  try {
    const membership = await OrganizationMember.findOne({
      organizationId: req.organization._id,
      userId:         req.params.userId,
    });

    if (!membership) return err(res, 404, 'Member not found', 'Not Found');

    if (membership.orgRole === 'owner') {
      return err(res, 400, 'Cannot remove the organization owner', 'Bad Request');
    }

    await OrganizationMember.deleteOne({ _id: membership._id });
    res.json({ statusCode: 200, message: 'Member removed from organization' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/organizations/:orgId/members/:userId/suspend ──────────────────

exports.suspendMember = async (req, res) => {
  try {
    const membership = await OrganizationMember.findOne({
      organizationId: req.organization._id,
      userId:         req.params.userId,
    });

    if (!membership) return err(res, 404, 'Member not found', 'Not Found');
    if (membership.orgRole === 'owner') {
      return err(res, 400, 'Cannot suspend the organization owner', 'Bad Request');
    }

    membership.status = 'suspended';
    await membership.save();
    res.json({ statusCode: 200, message: 'Member suspended' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/organizations/:orgId/members/:userId/activate ─────────────────

exports.activateMember = async (req, res) => {
  try {
    const membership = await OrganizationMember.findOne({
      organizationId: req.organization._id,
      userId:         req.params.userId,
    });

    if (!membership) return err(res, 404, 'Member not found', 'Not Found');

    membership.status = 'active';
    await membership.save();
    res.json({ statusCode: 200, message: 'Member activated' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
