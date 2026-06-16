const ROLE_HIERARCHY = ['guest', 'member', 'team_lead', 'department_head', 'admin', 'owner'];

/**
 * checkOrgRole('owner', 'admin') — returns middleware that verifies
 * the user's org role is one of the allowed roles.
 * Requires orgContext middleware to run first.
 */
module.exports = (...allowedRoles) => (req, res, next) => {
  const role = req.orgRole;
  if (!role || !allowedRoles.includes(role)) {
    return res.status(403).json({
      statusCode: 403,
      message:    `Required org role: ${allowedRoles.join(' or ')}`,
      error:      'Forbidden',
    });
  }
  next();
};
