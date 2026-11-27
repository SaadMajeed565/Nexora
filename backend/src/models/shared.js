const mongoose = require('mongoose');

// Shared by Blueprint and Agent — one shape for tools and workflow steps.
const toolSubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    toolkit: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false }
);

// One branch out of a decision step: when the condition holds, go to
// the step whose id is `goto`.
const branchSubSchema = new mongoose.Schema(
  {
    when: { type: String, required: true },
    goto: { type: String, required: true },
  },
  { _id: false }
);

const stepSubSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['trigger', 'tool', 'decision', 'response'], required: true },
    tool: { type: String },
    config: { type: mongoose.Schema.Types.Mixed },
    next: { type: String },
    // Decision steps route with branches + else INSTEAD of next:
    // branches cover the named cases (if / case), else is the default.
    branches: [branchSubSchema],
    else: { type: String },
  },
  { _id: false }
);

module.exports = { toolSubSchema, stepSubSchema };
