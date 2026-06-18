const express = require('express');
const router  = express.Router();
const auth       = require('../middleware/auth');
const orgContext = require('../middleware/orgContext');
const portfolioCtrl   = require('../controllers/portfolioController');
const programCtrl     = require('../controllers/programController');
const portfolioAiCtrl = require('../controllers/portfolioAiController');
const riskCtrl        = require('../controllers/riskController');

router.use(auth, orgContext);

router.get('/',    portfolioCtrl.list);
router.post('/',   portfolioCtrl.create);

router.get('/:id',             portfolioCtrl.getOne);
router.put('/:id',             portfolioCtrl.update);
router.delete('/:id',          portfolioCtrl.remove);
router.get('/:id/dashboard',   portfolioCtrl.dashboard);
router.get('/:id/roadmap',     portfolioCtrl.roadmap);
router.get('/:id/dependencies', portfolioCtrl.dependencies);
router.get('/:id/risk-matrix', portfolioCtrl.riskMatrix);

// Programs nested under portfolio
router.get('/:portfolioId/programs',  programCtrl.listByPortfolio);
router.post('/:portfolioId/programs', programCtrl.create);

// AI
router.post('/:id/ai/health-check',    portfolioAiCtrl.healthCheck);
router.post('/:id/ai/risk-prediction', portfolioAiCtrl.riskPrediction);

module.exports = router;
