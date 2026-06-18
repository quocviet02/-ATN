const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const depCtrl    = require('../controllers/dependencyController');

router.use(auth);

router.post('/',      depCtrl.create);
router.delete('/:id', depCtrl.remove);

module.exports = router;
