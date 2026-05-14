const { Notification } = require('../models');

let _io = null;

exports.setIO = (io) => { _io = io; };

exports.create = async ({ recipient, type, title, body = '', link = '', meta = {} }) => {
  try {
    const notif = await Notification.create({ recipient, type, title, body, link, isRead: false, meta });
    if (_io) {
      _io.to(`user_${recipient.toString()}`).emit('notification', {
        id:        notif._id,
        type:      notif.type,
        title:     notif.title,
        body:      notif.body,
        link:      notif.link,
        isRead:    false,
        createdAt: notif.createdAt,
      });
    }
    return notif;
  } catch (e) {
    console.error('[NotificationService] create error:', e.message);
  }
};
