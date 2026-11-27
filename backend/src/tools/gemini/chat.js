// Gemini — Chat. Self-contained: only requires @google/generative-ai + zod.
// Copyable verbatim into a generated agent project — no Nexora backend
// imports, no sibling tool files. Credentials are passed in by the caller
// (from the secrets store); this file never reads process.env and never
// hardcodes a key.
//
// Expected credentials: { apiKey } (a Google AI Studio API key).
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { z } = require('zod');

function getModel(credentials, modelName) {
  const { apiKey } = credentials || {};
  if (!apiKey) {
    throw new Error('gemini: credentials are required (apiKey)');
  }
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: modelName });
}

module.exports = {
  toolkit: 'gemini',
  name: 'Chat',
  description: 'Runs a chat completion with a Google Gemini model.',
  input: z.object({
    model: z.string().min(1, 'A model is required').optional().default('gemini-2.5-flash'),
    prompt: z.string().min(1, 'A prompt is required'),
  }),
  run: async (credentials, input) => {
    const result = await getModel(credentials, input.model).generateContent(input.prompt);
    return { content: result.response.text(), model: input.model };
  },
};
