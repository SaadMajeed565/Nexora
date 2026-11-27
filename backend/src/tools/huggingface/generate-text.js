// Hugging Face — Generate text. Self-contained: only uses Node's built-in
// global fetch + zod — no extra SDK. Copyable verbatim into a generated
// agent project — no Nexora backend imports, no sibling tool files.
// Credentials are passed in by the caller (from the secrets store); this
// file never reads process.env and never hardcodes a key.
//
// Expected credentials: { apiKey } (a Hugging Face access token).
const { z } = require('zod');

function getCredentials(credentials) {
  const { apiKey } = credentials || {};
  if (!apiKey) {
    throw new Error('huggingface: credentials are required (apiKey)');
  }
  return { apiKey };
}

module.exports = {
  toolkit: 'huggingface',
  name: 'Generate text',
  description: 'Generates text with a Hugging Face Inference API model.',
  input: z.object({
    model: z.string().min(1, 'A model is required'),
    prompt: z.string().min(1, 'A prompt is required'),
    maxNewTokens: z.number().int().min(1).max(1024).optional().default(200),
  }),
  run: async (credentials, input) => {
    const { apiKey } = getCredentials(credentials);
    const res = await fetch(
      `https://router.huggingface.co/hf-inference/models/${input.model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: input.prompt,
          parameters: { max_new_tokens: input.maxNewTokens },
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `huggingface: generate failed (${res.status}): ${typeof data.error === 'string' ? data.error : 'unknown error'}`
      );
    }
    const first = Array.isArray(data) ? data[0] : data;
    return { text: (first && first.generated_text) || '', model: input.model };
  },
};
