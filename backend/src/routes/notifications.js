const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const ctrl   = require('../controllers/notificationController');

router.use(auth);

router.get('/',              ctrl.list);
router.get('/unread-count',  ctrl.unreadCount);
router.put('/read-all',      ctrl.markAllRead);
router.put('/:id/read',      ctrl.markRead);
router.delete('/:id',        ctrl.remove);

module.exports = router;
