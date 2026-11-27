// Salesforce — Create record. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
//
// Expected credentials: { accessToken, instanceUrl } (accessToken = OAuth access token, instanceUrl = the Salesforce instance base URL).
const { z } = require('zod');

const API_VERSION = 'v59.0';

const nonEmptyRecord = (message) =>
  z.record(z.any()).refine((r) => Object.keys(r).length > 0, message);

function getCredentials(credentials) {
  const { accessToken, instanceUrl } = credentials || {};
  if (!accessToken || !instanceUrl) {
    throw new Error('salesforce: credentials are required (accessToken, instanceUrl)');
  }
  return { accessToken, instanceUrl };
}

module.exports = {
  toolkit: 'salesforce',
  name: 'Create record',
  description: 'Creates a record of any object type in Salesforce.',
  input: z.object({
    object: z.string().min(1, 'An object type is required'),
    fields: nonEmptyRecord('At least one field is required'),
  }),
  run: async (credentials, input) => {
    const { accessToken, instanceUrl } = getCredentials(credentials);
    const base = instanceUrl.replace(/\/+$/, '');
    const res = await fetch(`${base}/services/data/${API_VERSION}/sobjects/${input.object}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input.fields),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = Array.isArray(data) ? (data[0] && data[0].message) || 'unknown error' : data.message || 'unknown error';
      throw new Error(`salesforce: create record failed (${res.status}): ${msg}`);
    }
    return {
      id: data.id,
      success: !!data.success,
    };
  },
};
