/**
 * Checks that the authenticated user has a specific permission on the task's project.
 * Requires checkTask (or equivalent) to have already set req.membership.
 * Owner and admin roles pass automatically.
 */
module.exports = function checkPermission(permissionKey) {
  return (req, res, next) => {
    const membership = req.membership;
    if (!membership) {
      return res.status(403).json({ statusCode: 403, message: 'Access denied', error: 'Forbidden' });
    }

    const isOwnerOrAdmin = ['owner', 'admin'].includes(membership.role);
    if (isOwnerOrAdmin || membership[permissionKey]) {
      return next();
    }

    return res.status(403).json({
      statusCode: 403,
      message: `You do not have permission: ${permissionKey}`,
      error: 'Forbidden'
    });
  };
};
