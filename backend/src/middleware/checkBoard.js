const { Board, ProjectMember } = require('../models');

module.exports = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.boardId);
    if (!board) {
      return res.status(404).json({ statusCode: 404, message: 'Board not found', error: 'Not Found' });
    }

    const membership = await ProjectMember.findOne({ projectId: board.projectId, user: req.user._id });
    if (!membership) {
      return res.status(403).json({ statusCode: 403, message: 'Access denied', error: 'Forbidden' });
    }

    req.board      = board;
    req.membership = membership;
    next();
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ statusCode: 404, message: 'Board not found', error: 'Not Found' });
    }
    res.status(500).json({ statusCode: 500, message: err.message, error: 'Internal Server Error' });
  }
};
