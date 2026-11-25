const express = require('express');
const auth = require('../middleware/auth');
const { validate, registerSchema, loginSchema } = require('../utils/validate');
const ctrl = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', validate(registerSchema), ctrl.register);
router.post('/login', validate(loginSchema), ctrl.login);
router.post('/logout', auth, ctrl.logout);
router.get('/me', auth, ctrl.me);

module.exports = router;
