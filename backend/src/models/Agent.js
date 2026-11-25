const mongoose = require('mongoose');
const { toolSubSchema, stepSubSchema } = require('./shared');

const agentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    capabilities: [String],
    tools: [toolSubSchema],
    workflow: [stepSubSchema],
    triggers: [String],
    fallback: { type: String, required: true },
    useCases: [String],
    // Prebuilt library templates are shared by everyone; adopted agents
    // belong to one user in one workspace.
    isPrebuilt: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    sourceAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'Agent' },
    sourceBlueprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Blueprint' },
    status: { type: String, enum: ['active', 'paused', 'draft'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Agent', agentSchema);
