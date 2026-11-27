// Notion — Append text. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
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
  name: 'Append text',
  description: 'Appends a paragraph of text to a Notion page.',
  input: z.object({
    pageId: z.string().min(1, 'A page id is required'),
    text: z.string().min(1, 'Text to append is required'),
  }),
  run: async (credentials, input) => {
    const { apiKey } = getCredentials(credentials);
    const res = await fetch(
      `https://api.notion.com/v1/blocks/${input.pageId}/children`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          children: [
            {
              object: 'block',
              type: 'paragraph',
              paragraph: {
                rich_text: [{ type: 'text', text: { content: input.text } }],
              },
            },
          ],
        }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`notion: append failed (${res.status}): ${data.message || 'unknown error'}`);
    }
    return { id: input.pageId, appendedChars: input.text.length };
  },
};
