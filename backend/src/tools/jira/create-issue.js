// Jira — Create issue. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
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
  name: 'Create issue',
  description: 'Creates an issue in a Jira project.',
  input: z.object({
    projectKey: z.string().min(1, 'A project key is required'),
    summary: z.string().min(1, 'A summary is required'),
    description: z.string().optional(),
    issueType: z.string().min(1, 'An issue type is required').optional().default('Task'),
  }),
  run: async (credentials, input) => {
    const { baseUrl, email, apiToken } = getCredentials(credentials);
    const base = baseUrl.replace(/\/+$/, '');
    const res = await fetch(`${base}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: input.projectKey },
          summary: input.summary,
          issuetype: { name: input.issueType },
          ...(input.description ? { description: adf(input.description) } : {}),
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        `jira: create issue failed (${res.status}): ${(data && data.errorMessages && data.errorMessages.join('; ')) || (data && data.message) || 'unknown error'}`
      );
    }
    return {
      id: data.id,
      key: data.key,
    };
  },
};
