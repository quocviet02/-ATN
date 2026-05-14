const { Notification } = require('../models');

function err(res, status, message, error = 'Error') {
  return res.status(status).json({ statusCode: status, message, error });
}

// GET /api/notifications?page=1&limit=20&unread=true
exports.list = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;
    const filter = { recipient: req.user._id };
    if (req.query.unread === 'true') filter.isRead = false;

    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
    ]);

    res.json({ notifications: items, total, page, limit });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// GET /api/notifications/unread-count
exports.unreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ count });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { $set: { isRead: true } });
    res.json({ success: true });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};

// DELETE /api/notifications/:id
exports.remove = async (req, res) => {
  try {
    await Notification.deleteOne({ _id: req.params.id, recipient: req.user._id });
    res.json({ success: true });
  } catch (e) {
    err(res, 500, e.message, 'Internal Server Error');
  }
};
