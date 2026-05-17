const { ActivityLog } = require('../models');

const USER_SELECT = 'id name email avatar';

function err(res, status, message, error) {
  return res.status(status).json({ statusCode: status, message, error });
}

// ─── GET /api/tasks/:taskId/activities ───────────────────────────────────────

exports.getActivities = async (req, res) => {
  try {
    const activities = await ActivityLog.find({ taskId: req.params.taskId })
      .populate('user', USER_SELECT)
      .sort({ createdAt: 1 });
    res.json({ activities });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// ─── GET /api/tasks/:taskId/feed ─────────────────────────────────────────────

exports.getFeed = async (req, res) => {
  try {
    const { Comment } = require('../models');
    const taskId = req.params.taskId;

    const [activities, comments] = await Promise.all([
      ActivityLog.find({ taskId }).populate('user', USER_SELECT).sort({ createdAt: 1 }),
      Comment.find({ taskId, deletedAt: null }).populate('user', USER_SELECT).sort({ createdAt: 1 }),
    ]);

    const feed = [
      ...activities.map(a => ({
        feedType:  'activity',
        id:        a._id,
        action:    a.action,
        oldValue:  a.oldValue,
        newValue:  a.newValue,
        createdAt: a.createdAt,
        user:      a.user,
      })),
      ...comments.map(c => ({
        feedType:  'comment',
        id:        c._id,
        content:   c.content,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        user:      c.user,
      })),
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json({ feed });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
