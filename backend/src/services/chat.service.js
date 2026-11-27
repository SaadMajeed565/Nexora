const { streamText } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');

// The agent's identity becomes the system prompt: name, description,
// capabilities, tools, workflow, and fallback — in plain sentences. Tool
// descriptions have trailing periods stripped so the sentence never ends
// with "..". (Phase 1 has no live tool execution; the prompt describes
// the tools and workflow the agent is designed to follow. Live tools
// from the self-hosted catalog (backend/src/tools/) arrive with
// Module 4 in Phase 2.)
// Every field is read defensively: a legacy or sparse agent record can
// carry nulls (the user's DB predates the current seed), and a missing
// description must degrade to a sane default, never break the chat.
function buildSystemPrompt(agent) {
  const lines = [`You are ${agent.name || 'Assistant'}, an AI agent.`];
  if (agent.description) lines.push(agent.description);
  if (agent.capabilities?.length) {
    lines.push(`You can: ${agent.capabilities.join(', ')}.`);
  }
  if (agent.tools?.length) {
    const toolText = agent.tools
      .map(
        (t) =>
          `${t.name || 'Tool'} (${t.toolkit || 'custom'}) — ${String(t.description ?? '').replace(/\.+$/, '')}`
      )
      .join('; ');
    lines.push(`Tools you use: ${toolText}.`);
  }
  if (agent.workflow?.length) {
    const steps = agent.workflow
      .map((s, i) => `${i + 1}. ${s.name || 'Step'} (${s.type || 'step'})`)
      .join('; ');
    lines.push(`Your workflow: ${steps}. Follow it when helping.`);
  }
  if (agent.fallback) {
    lines.push(`If you cannot complete a task: ${agent.fallback}`);
  }
  lines.push('Answer in character, helpfully and concisely.');
  return lines.join('\n');
}

// UC-16: stream a reply from the agent. Returns the streamText result;
// the caller reads result.fullStream and saves the full text afterwards.
async function streamChatReply(agent, history) {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error('AI service not configured: set GEMINI_API_KEY in backend/.env');
    err.status = 503;
    throw err;
  }
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  return streamText({
    model: google(model),
    system: buildSystemPrompt(agent),
    messages: history,
  });
}

module.exports = { buildSystemPrompt, streamChatReply };
