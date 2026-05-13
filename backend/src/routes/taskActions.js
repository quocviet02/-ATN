/**
 * Flat task routes — not nested under project/board/column.
 * Handles operations that cross column boundaries or need simple URLs.
 */
const router = require('express').Router();
const auth        = require('../middleware/auth');
const taskCtrl    = require('../controllers/taskController');
const commentCtrl = require('../controllers/commentController');

router.use(auth);

// Task
router.get('/:taskId',      taskCtrl.getTask);
router.put('/:taskId/move', taskCtrl.moveTask);

// Comments nested under task
router.get('/:taskId/comments',  commentCtrl.getComments);
router.post('/:taskId/comments', commentCtrl.createComment);

module.exports = router;
