// Ollama — Chat. Self-contained: only uses Node's built-in global fetch
// + zod — no extra SDK. Copyable verbatim into a generated agent project —
// no Nexora backend imports, no sibling tool files. Credentials are passed
// in by the caller (from the secrets store); this file never reads
// process.env and never hardcodes a key.
//
// Expected credentials: { baseUrl? } (optional — Ollama runs locally
// without a key; defaults to http://localhost:11434).
const { z } = require('zod');

function getBaseUrl(credentials) {
  return ((credentials && credentials.baseUrl) || 'http://localhost:11434').replace(/\/+$/, '');
}

module.exports = {
  toolkit: 'ollama',
  name: 'Chat',
  description: 'Runs a chat completion with a local Ollama model.',
  input: z.object({
    model: z.string().min(1, 'A model is required'),
    messages: z
      .array(
        z.object({
          role: z.string().min(1, 'A role is required'),
          content: z.string().min(1, 'Message content is required'),
        })
      )
      .min(1, 'At least one message is required'),
  }),
  run: async (credentials, input) => {
    const baseUrl = getBaseUrl(credentials);
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: input.model,
        messages: input.messages,
        stream: false,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `ollama: chat failed (${res.status}): ${typeof data.error === 'string' ? data.error : 'unknown error'}`
      );
    }
    return {
      content: data.message ? data.message.content : null,
      model: data.model || input.model,
    };
  },
};
