const router             = require('express').Router();
const auth               = require('../middleware/authMiddleware');
const checkCommentOwner  = require('../middleware/checkCommentOwner');
const ctrl               = require('../controllers/commentController');

router.use(auth);

// PUT  /api/comments/:id  — update (creator only)
// DELETE /api/comments/:id — delete (creator only)
router.put(   '/:id', checkCommentOwner, ctrl.updateComment);
router.delete('/:id', checkCommentOwner, ctrl.deleteComment);

module.exports = router;
