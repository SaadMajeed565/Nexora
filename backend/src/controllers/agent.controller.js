const Agent = require('../models/Agent');

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

module.exports = { listUserAgents, getUserAgent };
