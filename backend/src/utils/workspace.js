const Workspace = require('../models/Workspace');

// Returns { workspace } or { error: { status, message } }.
async function getMemberWorkspace(workspaceId, userId) {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { error: { status: 404, message: 'Workspace not found' } };
  const isMember = workspace.members.some((m) => m.user.toString() === userId.toString());
  if (!isMember) return { error: { status: 403, message: 'Not a member of this workspace' } };
  return { workspace };
}

module.exports = { getMemberWorkspace };
