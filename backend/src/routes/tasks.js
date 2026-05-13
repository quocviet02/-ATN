const router           = require('express').Router();
const auth             = require('../middleware/authMiddleware');
const checkTask        = require('../middleware/checkTask');
const checkTaskAccess  = require('../middleware/checkTaskAccess');
const checkPermission  = require('../middleware/checkPermission');
const taskCtrl         = require('../controllers/taskController');
const commentCtrl      = require('../controllers/commentController');
const activityCtrl     = require('../controllers/activityController');

router.use(auth);

// /:id/move must be declared before /:id to avoid being shadowed
router.put('/:id/move', checkTask, checkPermission('canDragTask'), taskCtrl.moveTask);

router.get(   '/:id', checkTask, taskCtrl.getTask);
router.put(   '/:id', checkTask, checkPermission('canEditTask'), taskCtrl.updateTask);
router.delete('/:id', checkTask, taskCtrl.deleteTask);

// ─── Comments + Activities (nested under task) ────────────────────────────────
router.get( '/:taskId/comments',   checkTaskAccess, commentCtrl.getComments);
router.post('/:taskId/comments',   checkTaskAccess, commentCtrl.createComment);
router.get( '/:taskId/activities', checkTaskAccess, activityCtrl.getActivities);

module.exports = router;
