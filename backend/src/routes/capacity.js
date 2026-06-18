const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const orgCtx  = require('../middleware/orgContext');
const ctrl    = require('../controllers/capacityController');

router.use(auth);

router.get('/users/:userId/capacity',     ctrl.getUserCapacity);
router.put('/users/:userId/capacity',     ctrl.updateUserCapacity);
router.get('/users/:userId/workload',     ctrl.getUserWorkload);
router.get('/projects/:projectId/workload', ctrl.getProjectWorkload);
router.get('/organizations/:orgId/capacity-overview', orgCtx, ctrl.getOrgCapacityOverview);

module.exports = router;
