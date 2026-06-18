const { Organization, OrganizationMember } = require('../models');

/**
 * Middleware: extract currentOrgId from header X-Org-Id,
 * verify user membership, attach req.organization and req.orgMembership.
 */
module.exports = async (req, res, next) => {
  try {
    const orgId = req.headers['x-org-id'] || req.query.orgId;
    if (!orgId) {
      return res.status(400).json({
        statusCode: 400,
        message:    'Organization ID is required (X-Org-Id header)',
        error:      'Bad Request',
      });
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({
        statusCode: 404,
        message:    'Organization not found',
        error:      'Not Found',
      });
    }

    const membership = await OrganizationMember.findOne({
      organizationId: org._id,
      userId:         req.user._id,
      status:         { $in: ['active', 'invited'] },
    });

    if (!membership) {
      return res.status(403).json({
        statusCode: 403,
        message:    'You are not a member of this organization',
        error:      'Forbidden',
      });
    }

    req.organization   = org;
    req.orgMembership  = membership;
    req.orgRole        = membership.orgRole;
    next();
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ statusCode: 400, message: 'Invalid Organization ID format', error: 'Bad Request' });
    }
    res.status(500).json({ statusCode: 500, message: err.message, error: 'Internal Server Error' });
  }
};
