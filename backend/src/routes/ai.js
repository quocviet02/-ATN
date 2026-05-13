const router             = require('express').Router();
const auth               = require('../middleware/authMiddleware');
const checkProjectMember = require('../middleware/checkProjectMember');
const ctrl               = require('../controllers/aiController');

router.use(auth);

router.get ('/:id/ai/summary',    checkProjectMember, ctrl.getSummary);
router.get ('/:id/ai/statistics', checkProjectMember, ctrl.getStatistics);
router.post('/:id/ai/predict',    checkProjectMember, ctrl.predict);
router.post('/:id/ai/report',     checkProjectMember, ctrl.generateReport);

module.exports = router;
