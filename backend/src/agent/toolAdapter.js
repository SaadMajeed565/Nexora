// src/agent/toolAdapter.js
// Bridges the Nexora tool catalog (tools/index.js) to Vercel AI SDK tools.
const { tools } = require('../tools');

const MAX_RESULT_CHARS = 50000;
const WRITE_PATTERN = /(send|create|update|append)/;

function slug(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toolId(t) {
  return `${slug(t.toolkit)}_${slug(t.name)}`; // e.g. gmail_send_email
}

// Keeps a huge Drive/GitHub file from flooding the model context.
function capResult(result) {
  const s = JSON.stringify(result);
  if (s.length <= MAX_RESULT_CHARS) return result;
  return { truncated: true, preview: s.slice(0, MAX_RESULT_CHARS) };
}

/**
 * @param {object}   opts
 * @param {object}   opts.credentialsByToolkit  e.g. { gmail: {...}, slack: { botToken } }
 * @param {string[]} [opts.allow]               optional allowlist of tool ids
 * @param {Function} [opts.confirm]             async (toolId, input) => boolean,
 *                                              called before any write tool runs
 * @returns {Promise<Record<string, object>>}  value to pass as `tools` to generateText
 */
async function buildAiSdkTools({ credentialsByToolkit, allow, confirm }) {
  // Dynamic import works whether or not the package ships CommonJS.
  const { tool } = await import('ai');
  const out = {};

  for (const t of tools) {
    const id = toolId(t);
    if (allow && !allow.includes(id)) continue;

    const credentials = credentialsByToolkit[t.toolkit];
    if (!credentials) continue; // user hasn't connected this toolkit

    const isWrite = WRITE_PATTERN.test(slug(t.name));

    out[id] = tool({
      description: t.description,
      inputSchema: t.input, // AI SDK 5+ uses inputSchema (older versions: parameters)
      execute: async (input) => {
        try {
          if (isWrite && confirm) {
            const ok = await confirm(id, input);
            if (!ok) return { error: 'Action was not approved by the user.' };
          }
          return capResult(await t.run(credentials, input));
        } catch (err) {
          return { error: String((err && err.message) || err).slice(0, 500) };
        }
      },
    });
  }
  return out;
}

module.exports = { buildAiSdkTools, toolId };
