const router       = require('express').Router();
const auth         = require('../middleware/authMiddleware');
const orgContext   = require('../middleware/orgContext');
const checkOrgRole = require('../middleware/checkOrgRole');
const orgCtrl      = require('../controllers/organizationController');
const deptCtrl     = require('../controllers/departmentController');
const memberCtrl   = require('../controllers/orgMemberController');

// All routes require auth
router.use(auth);

// ─── Public org routes (no org context needed) ────────────────────────────────

router.get('/my',  orgCtrl.getMyOrganizations);
router.post('/',   orgCtrl.createOrganization);

// Switch org — no context middleware (user may not be in the org yet per header)
router.post('/:id/switch', orgCtrl.switchOrganization);

// ─── Routes that need org context ─────────────────────────────────────────────

router.get('/:id',    orgContext, orgCtrl.getOrganization);
router.put('/:id',    orgContext, checkOrgRole('owner', 'admin'), orgCtrl.updateOrganization);
router.delete('/:id', orgContext, checkOrgRole('owner'),          orgCtrl.deleteOrganization);

router.post('/:id/transfer-ownership',
  orgContext, checkOrgRole('owner'),
  orgCtrl.transferOwnership
);

// ─── Department routes ────────────────────────────────────────────────────────

router.get('/:orgId/departments',
  orgContext,
  deptCtrl.getDepartments
);

router.post('/:orgId/departments',
  orgContext, checkOrgRole('owner', 'admin'),
  deptCtrl.createDepartment
);

// ─── Member routes ─────────────────────────────────────────────────────────────

router.get('/:id/members',
  orgContext,
  memberCtrl.getMembers
);

router.post('/:id/members/invite',
  orgContext, checkOrgRole('owner', 'admin', 'department_head'),
  memberCtrl.inviteMember
);

router.post('/:id/members/bulk-invite',
  orgContext, checkOrgRole('owner', 'admin'),
  memberCtrl.bulkInvite
);

router.put('/:orgId/members/:userId',
  orgContext, checkOrgRole('owner', 'admin'),
  memberCtrl.updateMember
);

router.delete('/:orgId/members/:userId',
  orgContext, checkOrgRole('owner', 'admin'),
  memberCtrl.removeMember
);

router.post('/:orgId/members/:userId/suspend',
  orgContext, checkOrgRole('owner', 'admin'),
  memberCtrl.suspendMember
);

router.post('/:orgId/members/:userId/activate',
  orgContext, checkOrgRole('owner', 'admin'),
  memberCtrl.activateMember
);

module.exports = router;
