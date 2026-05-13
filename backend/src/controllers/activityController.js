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
      .sort({ createdAt: -1 });
    res.json({ activities });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
