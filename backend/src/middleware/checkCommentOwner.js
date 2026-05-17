const { Comment, Task, Board, ProjectMember } = require('../models');

module.exports = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ statusCode: 404, message: 'Comment not found', error: 'Not Found' });
    }

    // Creator can always edit or delete
    if (comment.user.toString() === req.user.id) {
      req.comment = comment;
      return next();
    }

    // For DELETE, also allow project owner / admin
    if (req.method === 'DELETE') {
      const task = await Task.findById(comment.taskId).select('boardId');
      if (task) {
        const board = await Board.findById(task.boardId).select('projectId');
        if (board) {
          const membership = await ProjectMember.findOne({
            projectId: board.projectId,
            user:      req.user._id,
          });
          if (membership && ['owner', 'admin'].includes(membership.role)) {
            req.comment = comment;
            return next();
          }
        }
      }
    }

    return res.status(403).json({
      statusCode: 403,
      message:    'Only the comment creator can perform this action',
      error:      'Forbidden',
    });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ statusCode: 404, message: 'Comment not found', error: 'Not Found' });
    }
    res.status(500).json({ statusCode: 500, message: err.message, error: 'Internal Server Error' });
  }
};
