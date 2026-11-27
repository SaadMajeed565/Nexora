// Trello — Update card. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
//
// Expected credentials: { apiKey, token } (apiKey = Trello API key, token = Trello member token).
const { z } = require('zod');

function getCredentials(credentials) {
  const { apiKey, token } = credentials || {};
  if (!apiKey || !token) {
    throw new Error('trello: credentials are required (apiKey, token)');
  }
  return { apiKey, token };
}

module.exports = {
  toolkit: 'trello',
  name: 'Update card',
  description: 'Updates a Trello card (name, description, or archive state).',
  input: z
    .object({
      cardId: z.string().min(1, 'A card ID is required'),
      name: z.string().min(1, 'A card name is required').optional(),
      description: z.string().optional(),
      closed: z.boolean().optional(),
    })
    .refine(
      (o) => o.name !== undefined || o.description !== undefined || o.closed !== undefined,
      'At least one field to update is required'
    ),
  run: async (credentials, input) => {
    const { apiKey, token } = getCredentials(credentials);
    const authQuery = `key=${apiKey}&token=${token}`;
    const res = await fetch(`https://api.trello.com/1/cards/${input.cardId}?${authQuery}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { desc: input.description } : {}),
        ...(input.closed !== undefined ? { closed: input.closed } : {}),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(`trello: update card failed (${res.status}): ${(data && data.message) || 'unknown error'}`);
    }
    return {
      id: data.id,
      name: data.name,
    };
  },
};
