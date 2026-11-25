const express = require('express');
const auth = require('../middleware/auth');
const { validate, createBlueprintSchema } = require('../utils/validate');
const ctrl = require('../controllers/blueprint.controller');

const router = express.Router();

router.use(auth);
router.post('/', validate(createBlueprintSchema), ctrl.createBlueprint);
router.get('/', ctrl.listBlueprints);
router.get('/:id', ctrl.getBlueprint);
router.put('/:id', ctrl.updateBlueprint);
router.delete('/:id', ctrl.deleteBlueprint);

module.exports = router;
