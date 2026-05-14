const router = require('express').Router();
const auth   = require('../middleware/authMiddleware');
const ctrl   = require('../controllers/invitationController');

// Public — check invitation info via token
router.get('/:token', ctrl.getByToken);

// Requires JWT — must be logged in to accept
router.post('/:token/accept', auth, ctrl.acceptToken);

// Public — no auth required to reject
router.post('/:token/reject', ctrl.rejectToken);

module.exports = router;
