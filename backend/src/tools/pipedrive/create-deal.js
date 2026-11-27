// Pipedrive — Create deal. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
//
// Expected credentials: { apiKey } (the Pipedrive API token, sent as api_token in the query string).
const { z } = require('zod');

function getCredentials(credentials) {
  const { apiKey } = credentials || {};
  if (!apiKey) {
    throw new Error('pipedrive: credentials are required (apiKey)');
  }
  return { apiKey };
}

module.exports = {
  toolkit: 'pipedrive',
  name: 'Create deal',
  description: 'Creates a deal in Pipedrive.',
  input: z.object({
    title: z.string().min(1, 'A deal title is required'),
    value: z.number().optional(),
    currency: z.string().min(1, 'A currency is required').optional(),
    personId: z.number().int().optional(),
  }),
  run: async (credentials, input) => {
    const { apiKey } = getCredentials(credentials);
    const res = await fetch(`https://api.pipedrive.com/v1/deals?api_token=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: input.title,
        ...(input.value !== undefined ? { value: input.value } : {}),
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.personId ? { person_id: input.personId } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`pipedrive: create deal failed (${res.status}): ${data.error || 'unknown error'}`);
    }
    return {
      id: data.data.id,
      title: data.data.title,
    };
  },
};
