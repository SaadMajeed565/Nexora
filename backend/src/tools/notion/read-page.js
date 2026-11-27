// Notion — Read page. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
//
// Expected credentials: { apiKey } (an internal integration token).
const { z } = require('zod');

const MAX_CONTENT_CHARS = 50000;

function getCredentials(credentials) {
  const { apiKey } = credentials || {};
  if (!apiKey) {
    throw new Error('notion: credentials are required (apiKey)');
  }
  return { apiKey };
}

function blockText(block) {
  const body = block && block[block.type];
  if (!body || !Array.isArray(body.rich_text)) return '';
  return body.rich_text.map((t) => t.plain_text || '').join('');
}

module.exports = {
  toolkit: 'notion',
  name: 'Read page',
  description: 'Reads a Notion page as plain text.',
  input: z.object({
    pageId: z.string().min(1, 'A page id is required'),
  }),
  run: async (credentials, input) => {
    const { apiKey } = getCredentials(credentials);
    const res = await fetch(
      `https://api.notion.com/v1/blocks/${input.pageId}/children?page_size=100`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`notion: read failed (${res.status}): ${data.message || 'unknown error'}`);
    }
    const full = (data.results || [])
      .map(blockText)
      .filter((s) => s.length > 0)
      .join('\n');
    const truncated = full.length > MAX_CONTENT_CHARS;
    return {
      id: input.pageId,
      content: truncated ? full.slice(0, MAX_CONTENT_CHARS) : full,
      truncated,
    };
  },
};
