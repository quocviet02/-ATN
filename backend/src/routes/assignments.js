const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/assignmentController');

router.use(auth);

// Task-scoped
router.get('/tasks/:taskId/assignments',  ctrl.list);
router.post('/tasks/:taskId/assignments', ctrl.create);
router.post('/tasks/:taskId/ai/recommend-assignee', require('../controllers/resourceAiController').recommendAssignee);

// Assignment-level
router.put('/assignments/:id',            ctrl.update);
router.post('/assignments/:id/log-time',  ctrl.logTime);

// Project AI rebalance
router.post('/projects/:projectId/ai/rebalance', require('../controllers/resourceAiController').rebalanceWorkload);

module.exports = router;
