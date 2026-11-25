const Workspace = require('../models/Workspace');

// Loads a workspace and enforces multi-tenant isolation (FR-1.4):
// only members of the workspace may access it.
async function loadWorkspace(req, res, next) {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });
    const isMember = workspace.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (!isMember) return res.status(403).json({ error: 'Not a member of this workspace' });
    req.workspace = workspace;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { loadWorkspace };
