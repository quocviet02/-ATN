const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const orgCtx  = require('../middleware/orgContext');
const ctrl    = require('../controllers/timeOffController');

router.use(auth);

router.get('/my',           ctrl.listMine);
router.get('/',             ctrl.list);
router.post('/',            ctrl.create);
router.put('/:id/approve',  ctrl.approve);
router.put('/:id/reject',   ctrl.reject);
router.put('/:id/cancel',   ctrl.cancel);
router.get('/organizations/:orgId/calendar', orgCtx, ctrl.getOrgCalendar);

module.exports = router;
