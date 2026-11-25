const Agent = require('../models/Agent');
const Blueprint = require('../models/Blueprint');
const Workspace = require('../models/Workspace');
const { rankMatches } = require('../services/matching.service');
const { getMemberWorkspace } = require('../utils/workspace');

// UC-07: list prebuilt agents, with optional category + search.
async function listLibraryAgents(req, res, next) {
  try {
    const { category, search } = req.query;
    const filter = { isPrebuilt: true };
    if (category) filter.category = category;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { description: rx }, { capabilities: rx }];
    }
    const agents = await Agent.find(filter).sort({ name: 1 });
    res.json({ agents });
  } catch (err) {
    next(err);
  }
}

// UC-08: library agent details.
async function getLibraryAgent(req, res, next) {
  try {
    const agent = await Agent.findById(req.params.id);
    if (!agent || !agent.isPrebuilt) return res.status(404).json({ error: 'Agent not found' });
    res.json({ agent });
  } catch (err) {
    next(err);
  }
}

// FR-3.2: ranked matches for a blueprint.
async function matchAgents(req, res, next) {
  try {
    const { blueprintId } = req.query;
    if (!blueprintId) return res.status(400).json({ error: 'blueprintId is required' });
    const blueprint = await Blueprint.findById(blueprintId);
    if (!blueprint) return res.status(404).json({ error: 'Blueprint not found' });
    const isOwner = blueprint.owner.toString() === req.user._id.toString();
    if (!isOwner) {
      const workspace = await Workspace.findById(blueprint.workspace);
      const isMember =
        workspace && workspace.members.some((m) => m.user.toString() === req.user._id.toString());
      if (!isMember) return res.status(403).json({ error: 'Not your blueprint' });
    }
    const library = await Agent.find({ isPrebuilt: true });
    const matches = rankMatches(blueprint, library).map(({ agent, match }) => ({ agent, match }));
    res.json({ matches });
  } catch (err) {
    next(err);
  }
}

// UC-09: adopt a library agent — use directly, or customize with overrides.
// (Phase 1 customize = edit name/description/fallback at adopt time;
// the full pipeline customization is Module 4, Phase 2.)
const OVERRIDABLE = ['name', 'description', 'tools', 'workflow', 'triggers', 'fallback', 'capabilities', 'useCases'];

async function adoptAgent(req, res, next) {
  try {
    const { workspaceId, mode, overrides } = req.body;
    const libraryAgent = await Agent.findById(req.params.id);
    if (!libraryAgent || !libraryAgent.isPrebuilt) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    const { workspace, error } = await getMemberWorkspace(workspaceId, req.user._id);
    if (error) return res.status(error.status).json({ error: error.message });
    const base = libraryAgent.toObject();
    delete base._id;
    delete base.createdAt;
    delete base.updatedAt;
    delete base.__v;
    const edited = {};
    if (mode === 'customize' && overrides) {
      OVERRIDABLE.forEach((k) => {
        if (overrides[k] !== undefined) edited[k] = overrides[k];
      });
    }
    const agent = await Agent.create({
      ...base,
      ...edited,
      isPrebuilt: false,
      owner: req.user._id,
      workspace: workspace._id,
      sourceAgent: libraryAgent._id,
      status: 'active',
    });
    res.status(201).json({ agent });
  } catch (err) {
    next(err);
  }
}

module.exports = { listLibraryAgents, getLibraryAgent, matchAgents, adoptAgent };
