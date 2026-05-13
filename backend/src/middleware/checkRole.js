/**
 * Must be used after checkProjectMember (relies on req.membership).
 * Usage: checkRole('owner', 'admin')
 */
module.exports = (...roles) => (req, res, next) => {
  if (!roles.includes(req.membership.role)) {
    return res.status(403).json({
      statusCode: 403,
      message:    `Required role: ${roles.join(' or ')}`,
      error:      'Forbidden',
    });
  }
  next();
};
