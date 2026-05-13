const router = require('express').Router({ mergeParams: true });
const auth = require('../middleware/auth');
const { requireRole } = require('../middleware/projectAccess');
const ctrl = require('../controllers/boardController');

router.use(auth);

router.get('/',  requireRole(), ctrl.getBoards);
router.post('/', requireRole('owner', 'admin'), ctrl.createBoard);

// Full board view (with columns + tasks)
router.get('/:boardId',    requireRole(), ctrl.getBoard);
router.patch('/:boardId',  requireRole('owner', 'admin'), ctrl.updateBoard);
router.delete('/:boardId', requireRole('owner', 'admin'), ctrl.deleteBoard);

module.exports = router;
