const mongoose = require('mongoose');
const { toolSubSchema, stepSubSchema } = require('./shared');

const blueprintSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    purpose: { type: String, required: true },
    // The user's original plain-language prompt (FR-2.1).
    prompt: { type: String, required: true },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tools: [toolSubSchema],
    workflow: [stepSubSchema],
    triggers: [String],
    fallback: { type: String, required: true },
    status: { type: String, enum: ['draft', 'reviewed', 'approved'], default: 'draft' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Blueprint', blueprintSchema);
