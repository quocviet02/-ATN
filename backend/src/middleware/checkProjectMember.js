const { Project, ProjectMember } = require('../models');

module.exports = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        statusCode: 404,
        message:    'Project not found',
        error:      'Not Found',
      });
    }

    const membership = await ProjectMember.findOne({ projectId: project._id, user: req.user._id });
    if (!membership) {
      return res.status(403).json({
        statusCode: 403,
        message:    'You are not a member of this project',
        error:      'Forbidden',
      });
    }

    req.project    = project;
    req.membership = membership;
    next();
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ statusCode: 404, message: 'Project not found', error: 'Not Found' });
    }
    res.status(500).json({ statusCode: 500, message: err.message, error: 'Internal Server Error' });
  }
};
