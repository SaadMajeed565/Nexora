// Trello — Create card. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
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
  name: 'Create card',
  description: 'Creates a card in a Trello list.',
  input: z.object({
    listId: z.string().min(1, 'A list ID is required'),
    name: z.string().min(1, 'A card name is required'),
    description: z.string().optional(),
  }),
  run: async (credentials, input) => {
    const { apiKey, token } = getCredentials(credentials);
    const authQuery = `key=${apiKey}&token=${token}`;
    const res = await fetch(`https://api.trello.com/1/cards?${authQuery}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idList: input.listId,
        name: input.name,
        ...(input.description ? { desc: input.description } : {}),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(`trello: create card failed (${res.status}): ${(data && data.message) || 'unknown error'}`);
    }
    return {
      id: data.id,
      name: data.name,
      url: data.shortUrl || data.url || null,
    };
  },
};
