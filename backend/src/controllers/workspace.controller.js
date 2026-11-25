const Workspace = require('../models/Workspace');

// UC-03: create an isolated workspace; creator becomes Owner.
async function createWorkspace(req, res, next) {
  try {
    const { name, description } = req.body;
    const workspace = await Workspace.create({
      name,
      description: description || '',
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'Owner' }],
    });
    res.status(201).json({ workspace });
  } catch (err) {
    next(err);
  }
}

async function listWorkspaces(req, res, next) {
  try {
    const workspaces = await Workspace.find({ 'members.user': req.user._id }).sort({ createdAt: -1 });
    res.json({ workspaces });
  } catch (err) {
    next(err);
  }
}

async function getWorkspace(req, res) {
  res.json({ workspace: req.workspace });
}

module.exports = { createWorkspace, listWorkspaces, getWorkspace };
