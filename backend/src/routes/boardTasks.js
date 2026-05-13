const router     = require('express').Router();
const auth       = require('../middleware/authMiddleware');
const checkBoard = require('../middleware/checkBoard');
const taskCtrl   = require('../controllers/taskController');

router.use(auth);

// GET /api/boards/:boardId/tasks?assigneeId=&priority=&search=&dueDateFrom=&dueDateTo=
router.get('/:boardId/tasks', checkBoard, taskCtrl.getBoardTasks);

module.exports = router;
