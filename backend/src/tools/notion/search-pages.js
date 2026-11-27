// Notion — Search pages. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
//
// Expected credentials: { apiKey } (an internal integration token).
const { z } = require('zod');

function getCredentials(credentials) {
  const { apiKey } = credentials || {};
  if (!apiKey) {
    throw new Error('notion: credentials are required (apiKey)');
  }
  return { apiKey };
}

function pageTitle(page) {
  const props = page.properties || {};
  for (const key of Object.keys(props)) {
    const prop = props[key];
    if (prop && prop.type === 'title' && Array.isArray(prop.title)) {
      const text = prop.title.map((t) => t.plain_text || '').join('');
      if (text) return text;
    }
  }
  return 'Untitled';
}

module.exports = {
  toolkit: 'notion',
  name: 'Search pages',
  description: 'Searches Notion pages the integration can see.',
  input: z.object({
    query: z.string().optional().default(''),
    limit: z.number().int().min(1).max(100).optional().default(10),
  }),
  run: async (credentials, input) => {
    const { apiKey } = getCredentials(credentials);
    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: input.query,
        filter: { property: 'object', value: 'page' },
        page_size: input.limit,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`notion: search failed (${res.status}): ${data.message || 'unknown error'}`);
    }
    const pages = (data.results || []).map((p) => ({
      id: p.id,
      title: pageTitle(p),
      url: p.url || null,
      lastEditedTime: p.last_edited_time || null,
    }));
    return { pages, count: pages.length };
  },
};
