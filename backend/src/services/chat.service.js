const { streamText, embed, stepCountIs } = require('ai');
const { createGoogleGenerativeAI } = require('@ai-sdk/google');
const { buildChatTools } = require('../agent/chatTools');

// The agent's identity becomes the system prompt: name, description,
// capabilities, tools, workflow, and fallback — in plain sentences. Tool
// descriptions have trailing periods stripped so the sentence never ends
// with "..". The agent's platforms also run LIVE in chat (user decision
// 2026-11-28): every tool of every toolkit the agent uses is attached
// for real — see agent/chatTools.js.
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

// --- Layered long-term memory (RAG over the conversation itself) ---
// The model sees the last RECENT_WINDOW messages verbatim; anything older
// would fall out of view, so every message also carries an embedding and
// the most similar earlier messages from the SAME conversation are pulled
// back in as a labelled block. Memory is best-effort throughout: a failed
// embedding or lookup returns null/[] and the chat runs on the recent
// window alone, exactly as it did before this layer existed.
const RECENT_WINDOW = 10;
const MEMORY_TOP_K = 4;

// text-embedding-004 is the first choice, but some keys reject it (not
// found for embedContent) — the first rejection flips the process to
// gemini-embedding-001 for good. EMBEDDING_MODEL pins an exact model and
// disables the fallback.
let embeddingModelId = process.env.EMBEDDING_MODEL || 'text-embedding-004';

async function embedText(text) {
  try {
    if (!process.env.GEMINI_API_KEY || !text || !String(text).trim()) return null;
    const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
    try {
      const { embedding } = await embed({
        model: google.embeddingModel(embeddingModelId),
        value: text,
      });
      return Array.isArray(embedding) && embedding.length ? embedding : null;
    } catch (err) {
      if (process.env.EMBEDDING_MODEL || embeddingModelId === 'gemini-embedding-001') {
        return null;
      }
      embeddingModelId = 'gemini-embedding-001';
      const { embedding } = await embed({
        model: google.embeddingModel(embeddingModelId),
        value: text,
      });
      return Array.isArray(embedding) && embedding.length ? embedding : null;
    }
  } catch (err) {
    return null;
  }
}

function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Score one conversation's messages OLDER than the recent window against
// the new message's embedding; return the top MEMORY_TOP_K in
// chronological order. Messages without embeddings (older records, or a
// failed embedding call) are skipped. Retrieval never crosses
// conversations: the caller passes only this conversation's messages.
function retrieveRelevantMessages(
  messages,
  queryEmbedding,
  { window = RECENT_WINDOW, topK = MEMORY_TOP_K } = {}
) {
  if (!queryEmbedding?.length || !messages?.length) return [];
  const older = messages.slice(0, Math.max(0, messages.length - window));
  return older
    .map((message, index) => ({
      message,
      index,
      score: cosineSimilarity(queryEmbedding, message.embedding),
    }))
    .filter((entry) => entry.message.embedding?.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.message);
}

// The retrieved earlier messages as a labelled block, appended to the
// system prompt so the model can use facts from earlier in this
// conversation that have fallen out of the recent window. The framing
// states plainly that these are real messages from THIS conversation —
// without it, models tend to deny remembering anything said earlier.
function buildMemoryBlock(messages) {
  if (!messages?.length) return '';
  const lines = messages.map((m) => `- ${m.role}: ${m.content}`);
  return (
    'Relevant earlier messages from this conversation ' +
    '(said before the recent messages below — treat them as part of this conversation and use them to answer):\n' +
    lines.join('\n')
  );
}

// UC-16: stream a reply from the agent. Returns the streamText result;
// the caller reads result.fullStream and saves the full text afterwards.
// memoryBlock (optional) is the retrieved long-term memory, appended to
// the system prompt. When the agent has a runnable platform, its tools
// are attached for real and the model may call them over several steps;
// tool failures degrade to talk-only, never break the chat.
async function streamChatReply(agent, history, memoryBlock = '') {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error('AI service not configured: set GEMINI_API_KEY in backend/.env');
    err.status = 503;
    throw err;
  }
  const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  let system = memoryBlock
    ? `${buildSystemPrompt(agent)}\n\n${memoryBlock}`
    : buildSystemPrompt(agent);
  let tools = {};
  try {
    tools = await buildChatTools(agent);
  } catch (err) {
    tools = {};
  }
  const hasTools = Object.keys(tools).length > 0;
  if (hasTools) {
    system +=
      '\nYou have real tools available. Use them when you need to look something up or take an action. Do not say you are searching or checking something unless you used a tool for it.';
  }
  return streamText({
    model: google(model),
    system,
    messages: history,
    ...(hasTools ? { tools, stopWhen: stepCountIs(8) } : {}),
  });
}

module.exports = {
  buildSystemPrompt,
  streamChatReply,
  embedText,
  cosineSimilarity,
  retrieveRelevantMessages,
  buildMemoryBlock,
  RECENT_WINDOW,
  MEMORY_TOP_K,
};
