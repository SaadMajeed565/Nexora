// Trello — Get board lists. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
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
  name: 'Get board lists',
  description: 'Lists the lists on a Trello board.',
  input: z.object({
    boardId: z.string().min(1, 'A board ID is required'),
  }),
  run: async (credentials, input) => {
    const { apiKey, token } = getCredentials(credentials);
    const authQuery = `key=${apiKey}&token=${token}`;
    const res = await fetch(
      `https://api.trello.com/1/boards/${input.boardId}/lists?${authQuery}`,
      {
        method: 'GET',
      }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(`trello: get board lists failed (${res.status}): ${(data && data.message) || 'unknown error'}`);
    }
    const lists = (Array.isArray(data) ? data : []).map((l) => ({
      id: l.id,
      name: l.name,
    }));
    return {
      lists,
      count: lists.length,
    };
  },
};
