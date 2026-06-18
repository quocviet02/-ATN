const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const programCtrl = require('../controllers/programController');

router.use(auth);

router.get('/:id',          programCtrl.getOne);
router.put('/:id',          programCtrl.update);
router.delete('/:id',       programCtrl.remove);
router.get('/:id/projects', programCtrl.listProjects);
router.post('/:id/projects', programCtrl.addProject);
router.get('/:id/roadmap',  programCtrl.roadmap);

module.exports = router;
