// Pipedrive — Search deals. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
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
  name: 'Search deals',
  description: 'Searches Pipedrive deals by a term.',
  input: z.object({
    term: z.string().min(1, 'A search term is required'),
  }),
  run: async (credentials, input) => {
    const { apiKey } = getCredentials(credentials);
    const res = await fetch(
      `https://api.pipedrive.com/v1/deals/search?term=${encodeURIComponent(input.term)}&api_token=${apiKey}`,
      {
        method: 'GET',
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`pipedrive: search deals failed (${res.status}): ${data.error || 'unknown error'}`);
    }
    const deals = ((data.data && data.data.items) || []).map((i) => ({
      id: i.item.id,
      title: i.item.title,
      value: i.item.value !== undefined ? i.item.value : null,
      currency: i.item.currency || null,
    }));
    return {
      deals,
      count: deals.length,
    };
  },
};
