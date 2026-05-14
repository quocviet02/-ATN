const router             = require('express').Router();
const auth               = require('../middleware/authMiddleware');
const checkProjectMember = require('../middleware/checkProjectMember');
const checkRole          = require('../middleware/checkRole');
const projectCtrl        = require('../controllers/projectController');
const memberCtrl         = require('../controllers/memberController');
const invitationCtrl     = require('../controllers/invitationController');

router.use(auth);

// ─── Project CRUD ─────────────────────────────────────────────────────────────
// literal paths must be declared before /:id to avoid being captured as a param
router.get('/search',      projectCtrl.searchProjects);
router.get('/my-projects', projectCtrl.getMyProjects);

router.get('/',  projectCtrl.getProjects);
router.post('/', projectCtrl.createProject);

router.get('/:id',    checkProjectMember,                              projectCtrl.getProject);
router.put('/:id',    checkProjectMember, checkRole('owner', 'admin'), projectCtrl.updateProject);
router.delete('/:id', checkProjectMember, checkRole('owner'),          projectCtrl.deleteProject);

// ─── Last-accessed ────────────────────────────────────────────────────────────

router.put('/:id/last-accessed', checkProjectMember, memberCtrl.updateLastAccessed);

// ─── Member management ────────────────────────────────────────────────────────

router.get('/:id/members',
  checkProjectMember,
  memberCtrl.getMembers
);

router.post('/:id/members',
  checkProjectMember, checkRole('owner', 'admin'),
  memberCtrl.addMember
);

router.put('/:id/members/:userId',
  checkProjectMember, checkRole('owner'),
  memberCtrl.updateMemberRole
);

router.put('/:id/members/:userId/permissions',
  checkProjectMember, checkRole('owner'),
  memberCtrl.updateMemberPermissions
);

router.get('/:id/my-permissions',
  checkProjectMember,
  memberCtrl.getMyPermissions
);

router.delete('/:id/members/:userId',
  checkProjectMember, checkRole('owner', 'admin'),
  memberCtrl.removeMember
);

// ─── Invitation management ────────────────────────────────────────────────────

router.get('/:id/invitations',
  checkProjectMember, checkRole('owner', 'admin'),
  invitationCtrl.getInvitations
);

router.post('/:id/invitations',
  checkProjectMember, checkRole('owner', 'admin'),
  invitationCtrl.createInvitation
);

router.delete('/:id/invitations/:invitationId',
  checkProjectMember, checkRole('owner', 'admin'),
  invitationCtrl.deleteInvitation
);

module.exports = router;
