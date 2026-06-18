const { ProjectDependency } = require('../models');

// POST /api/dependencies
exports.create = async (req, res) => {
  try {
    const { fromProjectId, toProjectId, type, description, isBlocking } = req.body;
    if (fromProjectId === toProjectId) return res.status(400).json({ message: 'Cannot create self-dependency' });
    const dep = await ProjectDependency.create({
      fromProjectId, toProjectId, type, description, isBlocking,
      createdBy: req.user._id,
    });
    await dep.populate('fromProjectId toProjectId', 'name status');
    res.status(201).json(dep);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Dependency already exists' });
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/dependencies/:id
exports.remove = async (req, res) => {
  try {
    const dep = await ProjectDependency.findByIdAndDelete(req.params.id);
    if (!dep) return res.status(404).json({ message: 'Dependency not found' });
    res.json({ message: 'Dependency removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
