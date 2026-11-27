// Anthropic — Chat. Self-contained: only requires @anthropic-ai/sdk + zod.
// Copyable verbatim into a generated agent project — no Nexora backend
// imports, no sibling tool files. Credentials are passed in by the caller
// (from the secrets store); this file never reads process.env and never
// hardcodes a key.
//
// Expected credentials: { apiKey } (an Anthropic API key).
const Anthropic = require('@anthropic-ai/sdk');
const { z } = require('zod');

function getClient(credentials) {
  const { apiKey } = credentials || {};
  if (!apiKey) {
    throw new Error('anthropic: credentials are required (apiKey)');
  }
  return new Anthropic({ apiKey });
}

module.exports = {
  toolkit: 'anthropic',
  name: 'Chat',
  description: 'Runs a chat completion with an Anthropic Claude model.',
  input: z.object({
    model: z
      .string()
      .min(1, 'A model is required')
      .optional()
      .default('claude-sonnet-4-5'),
    messages: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().min(1, 'Message content is required'),
        })
      )
      .min(1, 'At least one message is required'),
    system: z.string().min(1, 'A system prompt is required').optional(),
    maxTokens: z.number().int().min(1).max(8192).optional().default(1024),
  }),
  run: async (credentials, input) => {
    const client = getClient(credentials);
    const res = await client.messages.create({
      model: input.model,
      max_tokens: input.maxTokens,
      messages: input.messages,
      ...(input.system ? { system: input.system } : {}),
    });
    const content = (res.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
    return {
      content,
      model: res.model || input.model,
      stopReason: res.stop_reason || null,
      usage: res.usage || null,
    };
  },
};
