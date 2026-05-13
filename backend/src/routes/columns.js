const router = require('express').Router({ mergeParams: true });
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/projectAccess');
const ctrl = require('../controllers/columnController');

router.use(auth);

router.get('/',  requireRole(), ctrl.getColumns);
router.post('/', requireRole('owner', 'admin'), ctrl.createColumn);

router.patch('/:columnId',      requireRole('owner', 'admin'), ctrl.updateColumn);
router.put('/:columnId/move',   requireRole(),                 ctrl.moveColumn);
router.delete('/:columnId',     requireRole('owner', 'admin'), ctrl.deleteColumn);

module.exports = router;
