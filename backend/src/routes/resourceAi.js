const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const orgCtx  = require('../middleware/orgContext');
const ctrl    = require('../controllers/resourceAiController');

router.use(auth);

router.get('/organizations/:orgId/ai/burnout-prediction', orgCtx, ctrl.burnoutPrediction);

module.exports = router;
