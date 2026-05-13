const router      = require('express').Router();
const auth        = require('../middleware/authMiddleware');
const checkColumn = require('../middleware/checkColumn');
const taskCtrl    = require('../controllers/taskController');

router.use(auth);

// GET  /api/columns/:columnId/tasks
// POST /api/columns/:columnId/tasks
router.get( '/:columnId/tasks', checkColumn, taskCtrl.getColumnTasks);
router.post('/:columnId/tasks', checkColumn, taskCtrl.createTask);

module.exports = router;
