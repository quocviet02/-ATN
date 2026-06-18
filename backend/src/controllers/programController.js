const { Program, Project } = require('../models');

const populate = [
  { path: 'programManagerId', select: 'name email avatar' },
  { path: 'createdBy', select: 'name email' },
];

// GET /api/portfolios/:portfolioId/programs
exports.listByPortfolio = async (req, res) => {
  try {
    const programs = await Program.find({ portfolioId: req.params.portfolioId }).populate(populate).sort({ createdAt: -1 });
    res.json(programs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/portfolios/:portfolioId/programs
exports.create = async (req, res) => {
  try {
    const { Portfolio } = require('../models');
    const portfolio = await Portfolio.findById(req.params.portfolioId);
    if (!portfolio) return res.status(404).json({ message: 'Portfolio not found' });

    const { name, description, status, startDate, targetEndDate, budget, programManagerId, objectives, successMetrics, color, icon } = req.body;
    const program = await Program.create({
      portfolioId: req.params.portfolioId,
      organizationId: portfolio.organizationId,
      name, description, status, startDate, targetEndDate, budget,
      programManagerId: programManagerId || req.user._id,
      objectives: objectives || [],
      successMetrics: successMetrics || [],
      color, icon,
      createdBy: req.user._id,
    });
    res.status(201).json(await program.populate(populate));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/programs/:id
exports.getOne = async (req, res) => {
  try {
    const program = await Program.findById(req.params.id).populate(populate);
    if (!program) return res.status(404).json({ message: 'Program not found' });
    res.json(program);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/programs/:id
exports.update = async (req, res) => {
  try {
    const allowed = ['name','description','status','startDate','targetEndDate','actualEndDate','budget','programManagerId','objectives','successMetrics','color','icon'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    const program = await Program.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate(populate);
    if (!program) return res.status(404).json({ message: 'Program not found' });
    res.json(program);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/programs/:id
exports.remove = async (req, res) => {
  try {
    const program = await Program.findOne({ _id: req.params.id, deletedAt: null });
    if (!program) return res.status(404).json({ message: 'Program not found' });
    await program.softDelete();
    res.json({ message: 'Program deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/programs/:id/projects
exports.listProjects = async (req, res) => {
  try {
    const projects = await Project.find({ programId: req.params.id }).populate('owner', 'name email avatar');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/programs/:id/projects  (add existing project to program)
exports.addProject = async (req, res) => {
  try {
    const { projectId } = req.body;
    const project = await Project.findByIdAndUpdate(projectId, { programId: req.params.id }, { new: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/programs/:id/roadmap
exports.roadmap = async (req, res) => {
  try {
    const projects = await Project.find({ programId: req.params.id });
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
