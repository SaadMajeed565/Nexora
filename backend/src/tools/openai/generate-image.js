// OpenAI — Generate image. Self-contained: only requires openai + zod.
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
  name: 'Generate image',
  description: 'Generates an image with an OpenAI image model.',
  input: z.object({
    prompt: z.string().min(1, 'A prompt is required'),
    model: z.string().min(1, 'A model is required').optional().default('dall-e-3'),
    size: z.enum(['1024x1024', '1024x1792', '1792x1024']).optional().default('1024x1024'),
  }),
  run: async (credentials, input) => {
    const client = getClient(credentials);
    const res = await client.images.generate({
      model: input.model,
      prompt: input.prompt,
      size: input.size,
      n: 1,
    });
    const img = (res.data || [])[0] || {};
    return { url: img.url || null, revisedPrompt: img.revised_prompt || null };
  },
};
