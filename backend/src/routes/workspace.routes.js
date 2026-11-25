const express = require('express');
const auth = require('../middleware/auth');
const { loadWorkspace } = require('../middleware/workspace');
const { validate, workspaceSchema } = require('../utils/validate');
const ctrl = require('../controllers/workspace.controller');

const router = express.Router();

router.use(auth);
router.post('/', validate(workspaceSchema), ctrl.createWorkspace);
router.get('/', ctrl.listWorkspaces);
router.get('/:workspaceId', loadWorkspace, ctrl.getWorkspace);

module.exports = router;
