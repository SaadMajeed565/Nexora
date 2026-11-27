// OpenAI — Chat completion. Self-contained: only requires openai + zod.
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
  name: 'Chat completion',
  description: 'Runs a chat completion with an OpenAI model.',
  input: z.object({
    model: z.string().min(1, 'A model is required').optional().default('gpt-4o-mini'),
    messages: z
      .array(
        z.object({
          role: z.enum(['system', 'user', 'assistant']),
          content: z.string().min(1, 'Message content is required'),
        })
      )
      .min(1, 'At least one message is required'),
    temperature: z.number().min(0).max(2).optional(),
  }),
  run: async (credentials, input) => {
    const client = getClient(credentials);
    const res = await client.chat.completions.create({
      model: input.model,
      messages: input.messages,
      ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
    });
    const choice = (res.choices || [])[0] || {};
    return {
      content: choice.message ? choice.message.content : null,
      model: res.model || input.model,
      usage: res.usage || null,
    };
  },
};
