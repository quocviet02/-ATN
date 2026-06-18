const express   = require('express');
const router    = express.Router();
const auth      = require('../middleware/auth');
const riskCtrl  = require('../controllers/riskController');

router.use(auth);

router.get('/',       riskCtrl.list);
router.post('/',      riskCtrl.create);
router.get('/:id',    riskCtrl.getOne);
router.put('/:id',    riskCtrl.update);
router.delete('/:id', riskCtrl.remove);

module.exports = router;
