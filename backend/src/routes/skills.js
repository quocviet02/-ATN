const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/skillController');
const orgCtx  = require('../middleware/orgContext');

router.use(auth);

router.get('/',        ctrl.listSkills);
router.post('/',       ctrl.createSkill);
router.post('/seed',   ctrl.seedSkills);

// Per-user skill routes
router.get('/users/:userId/skills',                      ctrl.getUserSkills);
router.put('/users/:userId/skills',                      ctrl.updateUserSkills);
router.delete('/users/:userId/skills/:skillId',          ctrl.removeUserSkill);
router.post('/users/:userId/skills/:skillId/endorse',    ctrl.endorseSkill);

// Org skills matrix (requires org context)
router.get('/organizations/:orgId/skills-matrix', orgCtx, ctrl.getOrgSkillsMatrix);

module.exports = router;
