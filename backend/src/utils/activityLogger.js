/**
 * Fire-and-forget activity logger.
 * Never throws — a logging failure must not break the main operation.
 *
 * action values : 'created' | 'updated' | 'moved' | 'assigned' | 'commented' | 'deleted'
 * oldValue/newValue: plain JS object (stored as JSONB), or null
 */
const { ActivityLog } = require('../models');

exports.log = async (taskId, userId, action, oldValue = null, newValue = null) => {
  try {
    await ActivityLog.create({ taskId, user: userId, action, oldValue, newValue });
  } catch (err) {
    console.error('[ActivityLog] Failed to write log:', err.message);
  }
};
