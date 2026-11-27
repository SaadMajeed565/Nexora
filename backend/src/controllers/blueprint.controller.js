const Blueprint = require('../models/Blueprint');
const Workspace = require('../models/Workspace');
const { blueprintSchema, generateBlueprint, validateWorkflowRefs } = require('../services/blueprint.service');
const { getMemberWorkspace } = require('../utils/workspace');

// UC-04: generate a blueprint from a plain-language prompt (FR-2.2).
async function createBlueprint(req, res, next) {
  try {
    const { prompt, workspaceId } = req.body;
    const { workspace, error } = await getMemberWorkspace(workspaceId, req.user._id);
    if (error) return res.status(error.status).json({ error: error.message });
    const generated = await generateBlueprint(prompt);
    const refError = validateWorkflowRefs(generated.workflow);
    if (refError) {
      const err = new Error(refError);
      err.status = 400;
      throw err;
    }
    const blueprint = await Blueprint.create({
      ...generated,
      prompt,
      workspace: workspace._id,
      owner: req.user._id,
      status: 'draft',
    });
    res.status(201).json({ blueprint });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function listBlueprints(req, res, next) {
  try {
    const { workspaceId } = req.query;
    const filter = { owner: req.user._id };
    if (workspaceId) {
      const { error } = await getMemberWorkspace(workspaceId, req.user._id);
      if (error) return res.status(error.status).json({ error: error.message });
      filter.workspace = workspaceId;
    }
    const blueprints = await Blueprint.find(filter).sort({ createdAt: -1 });
    res.json({ blueprints });
  } catch (err) {
    next(err);
  }
}

async function getBlueprint(req, res, next) {
  try {
    const blueprint = await Blueprint.findById(req.params.id);
    if (!blueprint) return res.status(404).json({ error: 'Blueprint not found' });
    const workspace = await Workspace.findById(blueprint.workspace);
    const isMember =
      workspace && workspace.members.some((m) => m.user.toString() === req.user._id.toString());
    if (blueprint.owner.toString() !== req.user._id.toString() && !isMember) {
      return res.status(403).json({ error: 'Not your blueprint' });
    }
    res.json({ blueprint });
  } catch (err) {
    next(err);
  }
}

// UC-05/UC-06: human-in-the-loop review — the edited blueprint must pass
// the same Zod schema the AI generated against (FR-2.4).
async function updateBlueprint(req, res, next) {
  try {
    const parsed = blueprintSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0].message });
    }
    const refError = validateWorkflowRefs(parsed.data.workflow);
    if (refError) {
      return res.status(400).json({ error: refError });
    }
    const blueprint = await Blueprint.findById(req.params.id);
    if (!blueprint) return res.status(404).json({ error: 'Blueprint not found' });
    if (blueprint.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your blueprint' });
    }
    Object.assign(blueprint, parsed.data, { status: 'reviewed' });
    await blueprint.save();
    res.json({ blueprint });
  } catch (err) {
    next(err);
  }
}

async function deleteBlueprint(req, res, next) {
  try {
    const blueprint = await Blueprint.findById(req.params.id);
    if (!blueprint) return res.status(404).json({ error: 'Blueprint not found' });
    if (blueprint.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not your blueprint' });
    }
    await blueprint.deleteOne();
    res.json({ message: 'Blueprint deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createBlueprint, listBlueprints, getBlueprint, updateBlueprint, deleteBlueprint };
