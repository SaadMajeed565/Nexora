// OpenAI — Create embedding. Self-contained: only requires openai + zod.
// Copyable verbatim into a generated agent project — no Nexora backend
// imports, no sibling tool files. Credentials are passed in by the caller
// (from the secrets store); this file never reads process.env and never
// hardcodes a key.
//
// Expected credentials: { apiKey } (an OpenAI API key).
const OpenAI = require('openai');
const { z } = require('zod');

function getClient(credentials) {
  const { apiKey } = credentials || {};
  if (!apiKey) {
    throw new Error('openai: credentials are required (apiKey)');
  }
  return new OpenAI({ apiKey });
}

module.exports = {
  toolkit: 'openai',
  name: 'Create embedding',
  description: 'Creates an embedding vector for text with an OpenAI model.',
  input: z.object({
    text: z.union([
      z.string().min(1, 'Text is required'),
      z.array(z.string().min(1, 'Text is required')).min(1, 'At least one text is required'),
    ]),
    model: z
      .string()
      .min(1, 'A model is required')
      .optional()
      .default('text-embedding-3-small'),
  }),
  run: async (credentials, input) => {
    const client = getClient(credentials);
    const res = await client.embeddings.create({
      model: input.model,
      input: input.text,
    });
    const first = (res.data || [])[0] || {};
    return {
      embedding: first.embedding || [],
      model: res.model || input.model,
      usage: res.usage || null,
    };
  },
};
