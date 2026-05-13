const { Comment } = require('../models');

module.exports = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({ statusCode: 404, message: 'Comment not found', error: 'Not Found' });
    }

    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({
        statusCode: 403,
        message:    'Only the comment creator can perform this action',
        error:      'Forbidden',
      });
    }

    req.comment = comment;
    next();
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ statusCode: 404, message: 'Comment not found', error: 'Not Found' });
    }
    res.status(500).json({ statusCode: 500, message: err.message, error: 'Internal Server Error' });
  }
};
