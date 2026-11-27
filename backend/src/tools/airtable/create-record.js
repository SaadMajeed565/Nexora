// Airtable — Create record. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
//
// Expected credentials: { apiKey } (a personal access token).
const { z } = require('zod');

const nonEmptyRecord = (message) =>
  z.record(z.any()).refine((r) => Object.keys(r).length > 0, message);

function getCredentials(credentials) {
  const { apiKey } = credentials || {};
  if (!apiKey) {
    throw new Error('airtable: credentials are required (apiKey)');
  }
  return { apiKey };
}

module.exports = {
  toolkit: 'airtable',
  name: 'Create record',
  description: 'Creates a record in an Airtable table.',
  input: z.object({
    baseId: z.string().min(1, 'A base id is required'),
    table: z.string().min(1, 'A table name is required'),
    fields: nonEmptyRecord('At least one field is required'),
  }),
  run: async (credentials, input) => {
    const { apiKey } = getCredentials(credentials);
    const res = await fetch(
      `https://api.airtable.com/v0/${input.baseId}/${encodeURIComponent(input.table)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: input.fields }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `airtable: create failed (${res.status}): ${(data.error && (data.error.message || data.error)) || 'unknown error'}`
      );
    }
    return { id: data.id, fields: data.fields || {} };
  },
};
