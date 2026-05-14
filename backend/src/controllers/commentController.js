const { Comment, Task } = require('../models');
const activityLogger = require('../utils/activityLogger');
const notifService   = require('../services/notificationService');

const USER_SELECT = 'id name email avatar';

function err(res, status, message, error) {
  return res.status(status).json({ statusCode: status, message, error });
}

// ─── GET /api/tasks/:taskId/comments ─────────────────────────────────────────

exports.getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ taskId: req.params.taskId })
      .populate('user', USER_SELECT)
      .sort({ createdAt: 1 });
    res.json({ comments });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── POST /api/tasks/:taskId/comments ────────────────────────────────────────

exports.createComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return err(res, 400, 'Content is required', 'Bad Request');

    const taskId  = req.params.taskId;
    const comment = await Comment.create({
      taskId,
      user:    req.user._id,
      content: content.trim(),
    });

    await comment.populate('user', USER_SELECT);

    // Non-blocking activity log
    activityLogger.log(taskId, req.user.id, 'commented', null, {
      commentId: comment.id,
      preview:   comment.content.slice(0, 100),
    });

    // Notify task assignee (if not the commenter)
    Task.findById(taskId).select('assignee title').then((task) => {
      if (!task) return;
      if (task.assignee && task.assignee.toString() !== req.user.id) {
        notifService.create({
          recipient: task.assignee,
          type:      'comment_added',
          title:     'Bình luận mới trên task của bạn',
          body:      `${req.user.name}: "${comment.content.slice(0, 80)}"`,
          link:      `/project/board`,
          meta:      { taskId, commentId: comment.id },
        });
      }
    }).catch(() => {});

    res.status(201).json({ comment });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── PUT /api/comments/:id ────────────────────────────────────────────────────

exports.updateComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return err(res, 400, 'Content is required', 'Bad Request');

    const comment   = req.comment;
    comment.content = content.trim();
    await comment.save();

    await comment.populate('user', USER_SELECT);

    res.json({ comment });
  } catch (e) {
    err(res, 400, e.message, 'Bad Request');
  }
};

// ─── DELETE /api/comments/:id ─────────────────────────────────────────────────

exports.deleteComment = async (req, res) => {
  try {
    await req.comment.softDelete();
    res.json({ statusCode: 200, message: 'Comment deleted' });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
