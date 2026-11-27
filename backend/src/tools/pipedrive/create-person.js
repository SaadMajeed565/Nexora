// Pipedrive — Create person. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
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
  name: 'Create person',
  description: 'Creates a person (contact) in Pipedrive.',
  input: z.object({
    name: z.string().min(1, 'A name is required'),
    email: z.string().email().optional(),
    phone: z.string().min(1, 'A phone number is required').optional(),
  }),
  run: async (credentials, input) => {
    const { apiKey } = getCredentials(credentials);
    const res = await fetch(`https://api.pipedrive.com/v1/persons?api_token=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: input.name,
        ...(input.email ? { email: [{ value: input.email, primary: true }] } : {}),
        ...(input.phone ? { phone: [{ value: input.phone, primary: true }] } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`pipedrive: create person failed (${res.status}): ${data.error || 'unknown error'}`);
    }
    return {
      id: data.data.id,
      name: data.data.name,
    };
  },
};
