const express    = require('express');
const auth       = require('../middleware/auth');
const ctrl       = require('../controllers/releasesController');

// ── /api/releases/* ───────────────────────────────────────────────────────────
const releasesRouter = express.Router();
releasesRouter.use(auth);

releasesRouter.get('/overview',    ctrl.getOverview);
releasesRouter.get('/timeline',    ctrl.getTimeline);
releasesRouter.get('/statistics',  ctrl.getStatistics);
releasesRouter.put('/:id',         ctrl.updateRelease);

// ── /api/projects/:id/* ───────────────────────────────────────────────────────
const projectReleasesRouter = express.Router({ mergeParams: true });
projectReleasesRouter.use(auth);

projectReleasesRouter.get( '/releases',         ctrl.getProjectReleases);
projectReleasesRouter.post('/releases',         ctrl.createRelease);
projectReleasesRouter.post('/status',           ctrl.changeProjectStatus);
projectReleasesRouter.get( '/suggest-version',  ctrl.suggestVersion);
projectReleasesRouter.get( '/done-tasks',       ctrl.getDoneTasks);

module.exports = { releasesRouter, projectReleasesRouter };
