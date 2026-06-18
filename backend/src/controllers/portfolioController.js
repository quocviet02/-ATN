const { Portfolio, Program, Project, Risk } = require('../models');

const populate = [
  { path: 'ownerId', select: 'name email avatar' },
  { path: 'stakeholders', select: 'name email avatar' },
  { path: 'createdBy', select: 'name email' },
];

// GET /api/portfolios
exports.list = async (req, res) => {
  try {
    const orgId = req.organization._id;
    const portfolios = await Portfolio.find({ organizationId: orgId }).populate(populate).sort({ createdAt: -1 });
    res.json(portfolios);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/portfolios
exports.create = async (req, res) => {
  try {
    const orgId = req.organization._id;
    const { name, description, strategicGoals, status, startDate, targetEndDate, budget, ownerId, stakeholders, color, icon } = req.body;
    const portfolio = await Portfolio.create({
      organizationId: orgId,
      name, description, strategicGoals, status, startDate, targetEndDate, budget,
      ownerId: ownerId || req.user._id,
      stakeholders: stakeholders || [],
      color, icon,
      createdBy: req.user._id,
    });
    res.status(201).json(await portfolio.populate(populate));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/portfolios/:id
exports.getOne = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id).populate(populate);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/portfolios/:id
exports.update = async (req, res) => {
  try {
    const allowed = ['name','description','strategicGoals','status','startDate','targetEndDate','actualEndDate','budget','ownerId','stakeholders','color','icon'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const portfolio = await Portfolio.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate(populate);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });
    res.json(portfolio);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/portfolios/:id
exports.remove = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ _id: req.params.id, deletedAt: null });
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });
    await portfolio.softDelete();
    res.json({ message: 'Portfolio deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/portfolios/:id/dashboard
exports.dashboard = async (req, res) => {
  try {
    const portfolio = await Portfolio.findById(req.params.id).populate(populate);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });

    const programs = await Program.find({ portfolioId: req.params.id });
    const projects = await Project.find({ portfolioId: req.params.id });
    const risks    = await Risk.find({ scopeType: 'portfolio', scopeId: req.params.id });

    const statusCounts = {};
    projects.forEach(p => { statusCounts[p.status] = (statusCounts[p.status] || 0) + 1; });
    const avgProgress = projects.length ? Math.round(projects.reduce((s, p) => s + (p.progress || 0), 0) / projects.length) : 0;
    const riskCounts  = { identified: 0, mitigated: 0, occurred: 0, closed: 0 };
    risks.forEach(r => { riskCounts[r.status] = (riskCounts[r.status] || 0) + 1; });

    res.json({
      portfolio,
      stats: {
        programCount: programs.length,
        projectCount:  projects.length,
        avgProgress,
        budgetUsage: portfolio.budget.total > 0
          ? Math.round((portfolio.budget.spent / portfolio.budget.total) * 100)
          : 0,
        statusCounts,
        riskCounts,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/portfolios/:id/roadmap
exports.roadmap = async (req, res) => {
  try {
    const programs = await Program.find({ portfolioId: req.params.id });
    const projects = await Project.find({ portfolioId: req.params.id });
    res.json({ programs, projects });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/portfolios/:id/dependencies
exports.dependencies = async (req, res) => {
  try {
    const ProjectDependency = require('../models/ProjectDependency');
    const projectIds = (await Project.find({ portfolioId: req.params.id }, '_id')).map(p => p._id);
    const deps = await ProjectDependency.find({
      $or: [{ fromProjectId: { $in: projectIds } }, { toProjectId: { $in: projectIds } }],
    }).populate('fromProjectId toProjectId', 'name status');
    res.json(deps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/portfolios/:id/risk-matrix
exports.riskMatrix = async (req, res) => {
  try {
    const allRisks = await Risk.find({ scopeType: 'portfolio', scopeId: req.params.id });
    const matrix = Array.from({ length: 5 }, () => Array(5).fill([]));
    allRisks.forEach(r => {
      const row = r.impact - 1;
      const col = r.probability - 1;
      matrix[row][col] = [...matrix[row][col], r];
    });
    res.json({ matrix, risks: allRisks });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
