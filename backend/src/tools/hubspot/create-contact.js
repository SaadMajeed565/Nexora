// HubSpot — Create contact. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
//
// Expected credentials: { apiKey } (a private app token).
const { z } = require('zod');

function getCredentials(credentials) {
  const { apiKey } = credentials || {};
  if (!apiKey) {
    throw new Error('hubspot: credentials are required (apiKey)');
  }
  return { apiKey };
}

module.exports = {
  toolkit: 'hubspot',
  name: 'Create contact',
  description: 'Creates a contact in HubSpot.',
  input: z.object({
    email: z.string().email('A valid email is required'),
    firstName: z.string().min(1, 'A first name is required').optional(),
    lastName: z.string().min(1, 'A last name is required').optional(),
    phone: z.string().min(1, 'A phone number is required').optional(),
  }),
  run: async (credentials, input) => {
    const { apiKey } = getCredentials(credentials);
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          email: input.email,
          ...(input.firstName ? { firstname: input.firstName } : {}),
          ...(input.lastName ? { lastname: input.lastName } : {}),
          ...(input.phone ? { phone: input.phone } : {}),
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`hubspot: create contact failed (${res.status}): ${data.message || 'unknown error'}`);
    }
    return {
      id: data.id,
      email: data.properties ? data.properties.email || null : null,
    };
  },
};
