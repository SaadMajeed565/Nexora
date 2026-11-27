// Airtable — List records. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
//
// Expected credentials: { apiKey } (a personal access token).
const { z } = require('zod');

function getCredentials(credentials) {
  const { apiKey } = credentials || {};
  if (!apiKey) {
    throw new Error('airtable: credentials are required (apiKey)');
  }
  return { apiKey };
}

module.exports = {
  toolkit: 'airtable',
  name: 'List records',
  description: 'Lists records from an Airtable table.',
  input: z.object({
    baseId: z.string().min(1, 'A base id is required'),
    table: z.string().min(1, 'A table name is required'),
    maxRecords: z.number().int().min(1).max(100).optional().default(20),
  }),
  run: async (credentials, input) => {
    const { apiKey } = getCredentials(credentials);
    const res = await fetch(
      `https://api.airtable.com/v0/${input.baseId}/${encodeURIComponent(input.table)}?maxRecords=${input.maxRecords}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `airtable: list failed (${res.status}): ${(data.error && (data.error.message || data.error)) || 'unknown error'}`
      );
    }
    const records = (data.records || []).map((r) => ({
      id: r.id,
      fields: r.fields || {},
      createdTime: r.createdTime || null,
    }));
    return { records, count: records.length };
  },
};
