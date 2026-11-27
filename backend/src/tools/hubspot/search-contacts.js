// HubSpot — Search contacts. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
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
  name: 'Search contacts',
  description: 'Searches HubSpot contacts by a query string.',
  input: z.object({
    query: z.string().min(1, 'A search query is required'),
    limit: z.number().int().min(1).max(100).optional().default(10),
  }),
  run: async (credentials, input) => {
    const { apiKey } = getCredentials(credentials);
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: input.query,
        limit: input.limit,
        properties: ['email', 'firstname', 'lastname'],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`hubspot: search contacts failed (${res.status}): ${data.message || 'unknown error'}`);
    }
    return {
      contacts: (data.results || []).map((c) => ({
        id: c.id,
        email: c.properties ? c.properties.email || null : null,
        firstName: c.properties ? c.properties.firstname || null : null,
        lastName: c.properties ? c.properties.lastname || null : null,
      })),
      total: data.total || 0,
      count: (data.results || []).length,
    };
  },
};
