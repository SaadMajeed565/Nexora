const Agent = require('../models/Agent');
const Blueprint = require('../models/Blueprint');
const Workspace = require('../models/Workspace');

// The user's own adopted agents (shown on the Dashboard).
async function listUserAgents(req, res, next) {
  try {
    const { workspaceId } = req.query;
    const filter = { owner: req.user._id, isPrebuilt: false };
    if (workspaceId) filter.workspace = workspaceId;
    const agents = await Agent.find(filter).sort({ createdAt: -1 });
    res.json({ agents });
  } catch (err) {
    next(err);
  }
}

async function getUserAgent(req, res, next) {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent || agent.isPrebuilt) return res.status(404).json({ error: 'Agent not found' });
    if (agent.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your agent' });
    }
    res.json({ agent });
  } catch (err) {
    next(err);
  }
}

// Create a live agent from one of the user's OWN blueprints — the
// build-from-scratch path, so a blueprint never forces adoption of a
// library agent. The agent copies the blueprint's name, purpose (as its
// description), tools, workflow and fallback, and chats in Phase 1 like
// an adopted agent (the build pipeline is Module 4, Phase 2).
async function createAgentFromBlueprint(req, res, next) {
  try {
    const blueprint = await Blueprint.findById(req.params.blueprintId);
    if (!blueprint) return res.status(404).json({ error: 'Blueprint not found' });
    const isOwner = blueprint.owner.toString() === req.user._id.toString();
    if (!isOwner) {
      const workspace = await Workspace.findById(blueprint.workspace);
      const isMember =
        workspace && workspace.members.some((m) => m.user.toString() === req.user._id.toString());
      if (!isMember) return res.status(403).json({ error: 'Not your blueprint' });
    }
    // One agent per blueprint per user: a repeat create (e.g. after a
    // page refresh) returns the existing agent instead of duplicating it.
    const existing = await Agent.findOne({
      owner: req.user._id,
      sourceBlueprint: blueprint._id,
      isPrebuilt: false,
    });
    if (existing) return res.status(200).json({ agent: existing, alreadyCreated: true });
    const agent = await Agent.create({
      name: blueprint.name,
      description: blueprint.purpose,
      category: 'custom',
      capabilities: [],
      tools: blueprint.tools,
      workflow: blueprint.workflow,
      triggers: blueprint.triggers,
      fallback: blueprint.fallback,
      useCases: [],
      isPrebuilt: false,
      owner: req.user._id,
      workspace: blueprint.workspace,
      sourceBlueprint: blueprint._id,
      status: 'active',
    });
    res.status(201).json({ agent });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUserAgents, getUserAgent, createAgentFromBlueprint };
