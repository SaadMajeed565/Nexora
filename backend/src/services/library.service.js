const Agent = require('../models/Agent');
const prebuiltAgents = require('../data/prebuilt-agents');

// Idempotent: only seeds when no prebuilt agents exist yet.
async function seedPrebuiltAgents() {
  const count = await Agent.countDocuments({ isPrebuilt: true });
  if (count > 0) return;
  await Agent.insertMany(prebuiltAgents);
  console.log(`Seeded ${prebuiltAgents.length} prebuilt agents`);
}

module.exports = { seedPrebuiltAgents };
