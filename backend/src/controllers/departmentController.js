const { Department, OrganizationMember, Project } = require('../models');

function err(res, status, message, error) {
  return res.status(status).json({ statusCode: status, message, error });
}

function buildTree(departments) {
  const map = {};
  const roots = [];

  departments.forEach(d => {
    map[d.id] = { ...d.toJSON(), children: [] };
  });

  departments.forEach(d => {
    if (d.parentDepartmentId) {
      const parentId = d.parentDepartmentId.toString();
      if (map[parentId]) {
        map[parentId].children.push(map[d.id]);
      } else {
        roots.push(map[d.id]);
      }
    } else {
      roots.push(map[d.id]);
    }
  });

  return roots;
}

// ─── GET /api/organizations/:orgId/departments ────────────────────────────────

exports.getDepartments = async (req, res) => {
  try {
    const depts = await Department.find({ organizationId: req.organization._id })
      .populate('headId', 'id name email avatar')
      .sort({ createdAt: 1 });

    // Attach member counts
    const counts = await OrganizationMember.aggregate([
      { $match: { organizationId: req.organization._id, status: 'active' } },
      { $group: { _id: '$departmentId', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    counts.forEach(c => { if (c._id) countMap[c._id.toString()] = c.count; });

    const deptsWithCount = depts.map(d => ({
      ...d.toJSON(),
      memberCount: countMap[d.id] || 0,
    }));

    const tree = buildTree(deptsWithCount.map(d => ({ ...d, toJSON: () => d })));
    res.json({ departments: deptsWithCount, tree });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/organizations/:orgId/departments ───────────────────────────────

exports.createDepartment = async (req, res) => {
  try {
    const { name, description, headId, parentDepartmentId, color, icon } = req.body;
    if (!name?.trim()) return err(res, 400, 'Name is required', 'Bad Request');

    const dept = await Department.create({
      organizationId:     req.organization._id,
      name:               name.trim(),
      description:        description || '',
      headId:             headId             || null,
      parentDepartmentId: parentDepartmentId || null,
      color:              color || '#1890ff',
      icon:               icon  || 'team',
    });

    await dept.populate('headId', 'id name email avatar');
    res.status(201).json({ department: dept });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── PUT /api/departments/:id ─────────────────────────────────────────────────

exports.updateDepartment = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return err(res, 404, 'Department not found', 'Not Found');

    // Verify org membership
    if (dept.organizationId.toString() !== req.organization._id.toString()) {
      return err(res, 403, 'Access denied', 'Forbidden');
    }

    const { name, description, headId, parentDepartmentId, color, icon } = req.body;
    if (name               !== undefined) dept.name               = name.trim();
    if (description        !== undefined) dept.description        = description;
    if (headId             !== undefined) dept.headId             = headId || null;
    if (parentDepartmentId !== undefined) dept.parentDepartmentId = parentDepartmentId || null;
    if (color              !== undefined) dept.color              = color;
    if (icon               !== undefined) dept.icon               = icon;

    await dept.save();
    await dept.populate('headId', 'id name email avatar');
    res.json({ department: dept });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── DELETE /api/departments/:id ──────────────────────────────────────────────

exports.deleteDepartment = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return err(res, 404, 'Department not found', 'Not Found');

    if (dept.organizationId.toString() !== req.organization._id.toString()) {
      return err(res, 403, 'Access denied', 'Forbidden');
    }

    const subDepts = await Department.countDocuments({ parentDepartmentId: dept._id });
    if (subDepts > 0) {
      return err(res, 400, 'Cannot delete department with sub-departments', 'Bad Request');
    }

    const members = await OrganizationMember.countDocuments({ departmentId: dept._id, status: 'active' });
    if (members > 0) {
      return err(res, 400, 'Cannot delete department with active members', 'Bad Request');
    }

    const projects = await Project.countDocuments({ departmentId: dept._id });
    if (projects > 0) {
      return err(res, 400, 'Cannot delete department with active projects', 'Bad Request');
    }

    await dept.softDelete();
    res.json({ statusCode: 200, message: 'Department deleted' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/departments/:id/members ────────────────────────────────────────

exports.getDepartmentMembers = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return err(res, 404, 'Department not found', 'Not Found');

    if (dept.organizationId.toString() !== req.organization._id.toString()) {
      return err(res, 403, 'Access denied', 'Forbidden');
    }

    const members = await OrganizationMember.find({
      departmentId: dept._id,
      status:       { $in: ['active', 'invited'] },
    }).populate('userId', 'id name email avatar');

    res.json({ members });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/departments/:id/members ───────────────────────────────────────

exports.addDepartmentMember = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return err(res, 404, 'Department not found', 'Not Found');

    if (dept.organizationId.toString() !== req.organization._id.toString()) {
      return err(res, 403, 'Access denied', 'Forbidden');
    }

    const { userId, jobTitle } = req.body;
    if (!userId) return err(res, 400, 'userId is required', 'Bad Request');

    const membership = await OrganizationMember.findOne({
      organizationId: dept.organizationId,
      userId,
    });

    if (!membership) {
      return err(res, 404, 'User is not a member of this organization', 'Not Found');
    }

    membership.departmentId = dept._id;
    if (jobTitle !== undefined) membership.jobTitle = jobTitle;
    await membership.save();

    res.json({ statusCode: 200, message: 'Member added to department' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
