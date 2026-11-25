const express = require('express');
const auth = require('../middleware/auth');
const { validate, sendMessageSchema } = require('../utils/validate');
const ctrl = require('../controllers/chat.controller');

const router = express.Router();

router.use(auth);
router.post('/:agentId/messages', validate(sendMessageSchema), ctrl.sendMessage);
router.get('/conversations', ctrl.listConversations);
router.get('/conversations/:id', ctrl.getConversation);
router.delete('/conversations/:id', ctrl.deleteConversation);

module.exports = router;
