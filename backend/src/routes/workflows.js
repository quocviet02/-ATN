const express   = require('express');
const router    = express.Router({ mergeParams: true });
const auth      = require('../middleware/auth');
const checkTask = require('../middleware/checkTask');
const ctrl      = require('../controllers/workflowController');

// ── Project-scoped workflow routes (/api/projects/:projectId/workflows) ────────
router.get ('/:projectId/workflows',        auth, ctrl.listWorkflows);
router.post('/:projectId/workflows',        auth, ctrl.createWorkflow);

// ── Workflow-level routes (/api/workflows/:id) ────────────────────────────────
const wfRouter = express.Router();
wfRouter.get   ('/:id',           auth, ctrl.getWorkflow);
wfRouter.put   ('/:id',           auth, ctrl.updateWorkflow);
wfRouter.delete('/:id',           auth, ctrl.deleteWorkflow);
wfRouter.post  ('/:id/clone',     auth, ctrl.cloneWorkflow);
wfRouter.post  ('/:id/ai/analyze',auth, ctrl.aiAnalyzeWorkflow);

// ── Task workflow routes (/api/tasks/:id/...) ─────────────────────────────────
const taskWfRouter = express.Router({ mergeParams: true });
taskWfRouter.get ('/:id/available-transitions', auth, checkTask, ctrl.getAvailableTransitions);
taskWfRouter.get ('/:id/state-history',         auth, checkTask, ctrl.getStateHistory);
taskWfRouter.post('/:id/transitions',           auth, checkTask, ctrl.executeTaskTransition);
taskWfRouter.post('/:id/approve',               auth, checkTask, ctrl.approveTaskTransition);
taskWfRouter.post('/:id/assign-workflow',       auth, checkTask, ctrl.assignWorkflow);

module.exports = { projectWorkflowRouter: router, workflowRouter: wfRouter, taskWorkflowRouter: taskWfRouter };
