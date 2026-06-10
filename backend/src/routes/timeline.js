const router  = require('express').Router();
const auth    = require('../middleware/authMiddleware');
const ctrl    = require('../controllers/timelineController');

router.use(auth);

router.get('/projects',                  ctrl.getTimelineProjects);
router.get('/tasks',                     ctrl.getTimelineTasks);
router.put('/tasks/:id/reschedule',      ctrl.rescheduleTask);
router.get('/conflicts',                 ctrl.getConflicts);
router.get('/critical-path/:projectId',  ctrl.getCriticalPath);
router.post('/ai/resolve-conflict',      ctrl.aiResolveConflict);

module.exports = router;
