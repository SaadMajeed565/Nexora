// Jira — Update issue. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
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

const adf = (text) => ({
  type: 'doc',
  version: 1,
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

module.exports = {
  toolkit: 'jira',
  name: 'Update issue',
  description: 'Updates a Jira issue (summary or description).',
  input: z
    .object({
      issueKey: z.string().min(1, 'An issue key is required'),
      summary: z.string().min(1, 'A summary is required').optional(),
      description: z.string().optional(),
    })
    .refine(
      (o) => o.summary !== undefined || o.description !== undefined,
      'At least one field to update is required'
    ),
  run: async (credentials, input) => {
    const { baseUrl, email, apiToken } = getCredentials(credentials);
    const base = baseUrl.replace(/\/+$/, '');
    const res = await fetch(`${base}/rest/api/3/issue/${input.issueKey}`, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          ...(input.summary ? { summary: input.summary } : {}),
          ...(input.description !== undefined ? { description: adf(input.description) } : {}),
        },
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(
        `jira: update issue failed (${res.status}): ${(data && data.errorMessages && data.errorMessages.join('; ')) || (data && data.message) || 'unknown error'}`
      );
    }
    return {
      key: input.issueKey,
      updated: true,
    };
  },
};
