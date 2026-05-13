const router             = require('express').Router();
const auth               = require('../middleware/authMiddleware');
const checkProjectMember = require('../middleware/checkProjectMember');
const checkRole          = require('../middleware/checkRole');
const projectCtrl        = require('../controllers/projectController');
const memberCtrl         = require('../controllers/memberController');

router.use(auth);

// ─── Project CRUD ─────────────────────────────────────────────────────────────
// /search must be declared before /:id to avoid being captured as a param
router.get('/search', projectCtrl.searchProjects);

router.get('/',  projectCtrl.getProjects);
router.post('/', projectCtrl.createProject);

router.get('/:id',    checkProjectMember,                              projectCtrl.getProject);
router.put('/:id',    checkProjectMember, checkRole('owner', 'admin'), projectCtrl.updateProject);
router.delete('/:id', checkProjectMember, checkRole('owner'),          projectCtrl.deleteProject);

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

module.exports = router;
