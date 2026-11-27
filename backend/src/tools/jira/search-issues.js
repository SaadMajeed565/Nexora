// Jira — Search issues. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
//
// Expected credentials: { baseUrl, email, apiToken } (baseUrl = Jira site URL, email + apiToken used for Basic auth).
const { z } = require('zod');

function getCredentials(credentials) {
  const { baseUrl, email, apiToken } = credentials || {};
  if (!baseUrl || !email || !apiToken) {
    throw new Error('jira: credentials are required (baseUrl, email, apiToken)');
  }
  return { baseUrl, email, apiToken };
}

module.exports = {
  toolkit: 'jira',
  name: 'Search issues',
  description: 'Searches Jira issues with JQL.',
  input: z.object({
    jql: z.string().min(1, 'A JQL query is required'),
    maxResults: z.number().int().min(1).max(100).optional().default(20),
  }),
  run: async (credentials, input) => {
    const { baseUrl, email, apiToken } = getCredentials(credentials);
    const base = baseUrl.replace(/\/+$/, '');
    const res = await fetch(
      `${base}/rest/api/3/search?jql=${encodeURIComponent(input.jql)}&maxResults=${input.maxResults}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        `jira: search issues failed (${res.status}): ${(data && data.errorMessages && data.errorMessages.join('; ')) || (data && data.message) || 'unknown error'}`
      );
    }
    return {
      issues: (data.issues || []).map((i) => ({
        key: i.key,
        summary: i.fields ? i.fields.summary || null : null,
        status: i.fields && i.fields.status ? i.fields.status.name : null,
      })),
      total: data.total || 0,
      count: (data.issues || []).length,
    };
  },
};
