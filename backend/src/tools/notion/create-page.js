// Notion — Create page. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
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

module.exports = {
  toolkit: 'notion',
  name: 'Create page',
  description: 'Creates a Notion page in a database or under another page.',
  input: z.object({
    parentId: z.string().min(1, 'A parent id is required'),
    parentType: z.enum(['database', 'page']).optional().default('database'),
    title: z.string().min(1, 'A title is required'),
    content: z.string().optional(),
  }),
  run: async (credentials, input) => {
    const { apiKey } = getCredentials(credentials);
    const parent =
      input.parentType === 'database'
        ? { database_id: input.parentId }
        : { page_id: input.parentId };
    const properties =
      input.parentType === 'database'
        ? { Name: { title: [{ text: { content: input.title } }] } }
        : { title: [{ text: { content: input.title } }] };
    const body = { parent, properties };
    if (input.content && input.parentType === 'page') {
      body.children = [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: input.content } }],
          },
        },
      ];
    }
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`notion: create failed (${res.status}): ${data.message || 'unknown error'}`);
    }
    return { id: data.id, url: data.url || null };
  },
};
