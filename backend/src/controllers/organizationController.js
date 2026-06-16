const { Organization, OrganizationMember, Department, Project, ProjectMember } = require('../models');

const USER_SELECT = 'id name email avatar';

function err(res, status, message, error) {
  return res.status(status).json({ statusCode: status, message, error });
}

// ─── GET /api/organizations/my ────────────────────────────────────────────────

exports.getMyOrganizations = async (req, res) => {
  try {
    const memberships = await OrganizationMember.find({
      userId: req.user._id,
      status: { $in: ['active', 'invited'] },
    }).populate({ path: 'organizationId', select: 'id name slug logo description industry size plan createdAt' });

    const result = memberships
      .filter(m => m.organizationId != null)
      .map(m => ({
        ...m.organizationId.toJSON(),
        myRole: m.orgRole,
        status: m.status,
      }));

    res.json({ organizations: result });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/organizations ──────────────────────────────────────────────────

exports.createOrganization = async (req, res) => {
  try {
    const { name, industry, size, country, website, description } = req.body;
    if (!name?.trim()) return err(res, 400, 'Name is required', 'Bad Request');

    const org = await Organization.create({
      name:        name.trim(),
      description: description?.trim() || '',
      industry:    industry  || 'other',
      size:        size      || '1-10',
      country:     country   || 'Vietnam',
      website:     website   || '',
      createdBy:   req.user._id,
      ownerId:     req.user._id,
    });

    // Owner membership
    await OrganizationMember.create({
      organizationId: org._id,
      userId:         req.user._id,
      orgRole:        'owner',
      status:         'active',
      joinedAt:       new Date(),
    });

    // Default department
    await Department.create({
      organizationId: org._id,
      name:           'Mặc định',
      description:    'Phòng ban mặc định',
    });

    res.status(201).json({ organization: org });
  } catch (e) {
    if (e.code === 11000) return err(res, 409, 'Organization name already exists', 'Conflict');
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── GET /api/organizations/:id ───────────────────────────────────────────────

exports.getOrganization = async (req, res) => {
  try {
    const org = await Organization.findById(req.params.id)
      .populate('createdBy', USER_SELECT)
      .populate('ownerId',   USER_SELECT);

    if (!org) return err(res, 404, 'Organization not found', 'Not Found');

    const [memberCount, deptCount, projectCount] = await Promise.all([
      OrganizationMember.countDocuments({ organizationId: org._id, status: 'active' }),
      Department.countDocuments({ organizationId: org._id }),
      Project.countDocuments({ organizationId: org._id }),
    ]);

    res.json({
      organization: {
        ...org.toJSON(),
        stats: { memberCount, deptCount, projectCount },
      },
      myRole: req.orgMembership?.orgRole,
    });
  } catch (e) {
    if (e.name === 'CastError') return err(res, 404, 'Organization not found', 'Not Found');
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── PUT /api/organizations/:id ───────────────────────────────────────────────

exports.updateOrganization = async (req, res) => {
  try {
    const { name, description, logo, industry, size, country, website, settings } = req.body;
    const org = req.organization;

    if (name        !== undefined) org.name        = name.trim();
    if (description !== undefined) org.description = description;
    if (logo        !== undefined) org.logo        = logo;
    if (industry    !== undefined) org.industry    = industry;
    if (size        !== undefined) org.size        = size;
    if (country     !== undefined) org.country     = country;
    if (website     !== undefined) org.website     = website;
    if (settings    !== undefined) {
      Object.assign(org.settings, settings);
    }

    await org.save();
    res.json({ organization: org });
  } catch (e) {
    if (e.code === 11000) return err(res, 409, 'Organization name already exists', 'Conflict');
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── DELETE /api/organizations/:id ───────────────────────────────────────────

exports.deleteOrganization = async (req, res) => {
  try {
    if (req.orgRole !== 'owner') {
      return err(res, 403, 'Only the owner can delete this organization', 'Forbidden');
    }
    await req.organization.softDelete();
    res.json({ statusCode: 200, message: 'Organization deleted' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/organizations/:id/transfer-ownership ──────────────────────────

exports.transferOwnership = async (req, res) => {
  try {
    if (req.orgRole !== 'owner') {
      return err(res, 403, 'Only the current owner can transfer ownership', 'Forbidden');
    }

    const { newOwnerId } = req.body;
    if (!newOwnerId) return err(res, 400, 'newOwnerId is required', 'Bad Request');

    const newOwnerMembership = await OrganizationMember.findOne({
      organizationId: req.organization._id,
      userId:         newOwnerId,
      status:         'active',
    });

    if (!newOwnerMembership) {
      return err(res, 404, 'New owner must be an active member of the organization', 'Not Found');
    }

    // Demote current owner to admin
    await OrganizationMember.updateOne(
      { organizationId: req.organization._id, userId: req.user._id },
      { orgRole: 'admin' }
    );

    // Promote new owner
    newOwnerMembership.orgRole = 'owner';
    await newOwnerMembership.save();

    req.organization.ownerId = newOwnerId;
    await req.organization.save();

    res.json({ statusCode: 200, message: 'Ownership transferred successfully' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/organizations/:id/switch ──────────────────────────────────────

exports.switchOrganization = async (req, res) => {
  try {
    const membership = await OrganizationMember.findOne({
      organizationId: req.params.id,
      userId:         req.user._id,
      status:         { $in: ['active'] },
    });

    if (!membership) {
      return err(res, 403, 'You are not an active member of this organization', 'Forbidden');
    }

    res.json({
      currentOrganizationId: req.params.id,
      orgRole:               membership.orgRole,
    });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
