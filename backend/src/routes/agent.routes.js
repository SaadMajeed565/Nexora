const express = require('express');
const auth = require('../middleware/auth');
const ctrl = require('../controllers/agent.controller');

const router = express.Router();

router.use(auth);
router.get('/', ctrl.listUserAgents);
router.get('/:id', ctrl.getUserAgent);

module.exports = router;
