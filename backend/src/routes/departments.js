const router       = require('express').Router();
const auth         = require('../middleware/authMiddleware');
const orgContext   = require('../middleware/orgContext');
const checkOrgRole = require('../middleware/checkOrgRole');
const deptCtrl     = require('../controllers/departmentController');

router.use(auth);

// These routes require orgContext via X-Org-Id header
router.put('/:id',
  orgContext, checkOrgRole('owner', 'admin', 'department_head'),
  deptCtrl.updateDepartment
);

router.delete('/:id',
  orgContext, checkOrgRole('owner', 'admin'),
  deptCtrl.deleteDepartment
);

router.get('/:id/members',
  orgContext,
  deptCtrl.getDepartmentMembers
);

router.post('/:id/members',
  orgContext, checkOrgRole('owner', 'admin', 'department_head'),
  deptCtrl.addDepartmentMember
);

module.exports = router;
