const { Project, ProjectMember, User } = require('../models');

const USER_SELECT = 'id name email avatar';

function err(res, status, message, error) {
  return res.status(status).json({ statusCode: status, message, error });
}

// ─── GET /api/projects/my-projects ───────────────────────────────────────────

exports.getMyProjects = async (req, res) => {
  try {
    const memberships = await ProjectMember.find({ user: req.user._id })
      .populate({ path: 'projectId', select: 'id name description background' })
      .sort({ lastAccessedAt: -1, createdAt: -1 });

    const validMemberships = memberships.filter(m => m.projectId != null);

    const projectIds = validMemberships.map(m => m.projectId._id);
    const counts = await ProjectMember.aggregate([
      { $match: { projectId: { $in: projectIds } } },
      { $group: { _id: '$projectId', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    counts.forEach(c => { countMap[c._id.toString()] = c.count; });

    const projects = validMemberships.map(m => ({
      id:             m.projectId.id,
      name:           m.projectId.name,
      description:    m.projectId.description || '',
      role:           m.role,
      memberCount:    countMap[m.projectId._id.toString()] || 1,
      lastAccessedAt: m.lastAccessedAt || null,
    }));

    res.json({ projects });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/projects ────────────────────────────────────────────────────────

exports.getProjects = async (req, res) => {
  try {
    const memberships = await ProjectMember.find({ user: req.user._id })
      .populate({ path: 'projectId', populate: { path: 'owner', select: USER_SELECT } });

    const projects = memberships
      .filter(m => m.projectId != null)
      .map(m => ({ ...m.projectId.toJSON(), myRole: m.role }));

    res.json({ projects });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/projects ───────────────────────────────────────────────────────

exports.createProject = async (req, res) => {
  try {
    const { name, description = '' } = req.body;
    if (!name?.trim()) return err(res, 400, 'Name is required', 'Bad Request');

    const project = await Project.create({
      name:        name.trim(),
      description: description.trim(),
      owner:       req.user._id,
    });

    await ProjectMember.create({ projectId: project._id, user: req.user._id, role: 'owner' });

    res.status(201).json({ project });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── GET /api/projects/search?q= ─────────────────────────────────────────────

exports.searchProjects = async (req, res) => {
  try {
    const q = (req.query.q ?? '').trim();

    const memberships = await ProjectMember.find({ user: req.user._id }, 'projectId role');

    const projectIds = memberships.map(m => m.projectId);
    const roleMap    = Object.fromEntries(memberships.map(m => [m.projectId.toString(), m.role]));

    const filter = { _id: { $in: projectIds } };
    if (q) filter.name = { $regex: q, $options: 'i' };

    const projects = await Project.find(filter)
      .populate('owner', USER_SELECT)
      .sort({ name: 1 });

    const result = projects.map(p => ({ ...p.toJSON(), myRole: roleMap[p.id] }));
    res.json({ projects: result });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/projects/:id ────────────────────────────────────────────────────

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', USER_SELECT);

    const members = await ProjectMember.find({ projectId: req.params.id })
      .populate('user', USER_SELECT)
      .sort({ createdAt: 1 });

    res.json({ project: { ...project.toJSON(), members }, myRole: req.membership.role });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── PUT /api/projects/:id ────────────────────────────────────────────────────

exports.updateProject = async (req, res) => {
  try {
    const { name, description, background } = req.body;
    const project = req.project;

    if (name        !== undefined) project.name        = name.trim();
    if (description !== undefined) project.description = description.trim();
    if (background  !== undefined) project.background  = background;
    await project.save();

    res.json({ project });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────

exports.deleteProject = async (req, res) => {
  try {
    await req.project.softDelete();
    res.json({ statusCode: 200, message: 'Project deleted' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
