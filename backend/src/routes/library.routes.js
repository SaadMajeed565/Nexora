const express = require('express');
const auth = require('../middleware/auth');
const { validate, adoptSchema } = require('../utils/validate');
const ctrl = require('../controllers/library.controller');

const router = express.Router();

router.use(auth);
router.get('/', ctrl.listLibraryAgents);
// /match must come before /:id, or Express reads "match" as an id.
router.get('/match', ctrl.matchAgents);
router.get('/:id', ctrl.getLibraryAgent);
router.post('/:id/adopt', validate(adoptSchema), ctrl.adoptAgent);

module.exports = router;
