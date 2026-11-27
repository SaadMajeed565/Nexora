// Ollama — List models. Self-contained: only uses Node's built-in global
// fetch + zod — no extra SDK. Copyable verbatim into a generated agent
// project — no Nexora backend imports, no sibling tool files. Credentials
// are passed in by the caller (from the secrets store); this file never
// reads process.env and never hardcodes a key.
//
// Expected credentials: { baseUrl? } (optional — Ollama runs locally
// without a key; defaults to http://localhost:11434).
const { z } = require('zod');

function getBaseUrl(credentials) {
  return ((credentials && credentials.baseUrl) || 'http://localhost:11434').replace(/\/+$/, '');
}

module.exports = {
  toolkit: 'ollama',
  name: 'List models',
  description: 'Lists the models available on a local Ollama server.',
  input: z.object({}),
  run: async (credentials, input) => {
    const baseUrl = getBaseUrl(credentials);
    const res = await fetch(`${baseUrl}/api/tags`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `ollama: list models failed (${res.status}): ${typeof data.error === 'string' ? data.error : 'unknown error'}`
      );
    }
    const models = (data.models || []).map((m) => ({
      name: m.name,
      size: m.size || null,
    }));
    return { models, count: models.length };
  },
};
