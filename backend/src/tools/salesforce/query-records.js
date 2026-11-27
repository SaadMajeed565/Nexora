// Salesforce — Query records. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
//
// Expected credentials: { accessToken, instanceUrl } (accessToken = OAuth access token, instanceUrl = the Salesforce instance base URL).
const { z } = require('zod');

const API_VERSION = 'v59.0';

function getCredentials(credentials) {
  const { accessToken, instanceUrl } = credentials || {};
  if (!accessToken || !instanceUrl) {
    throw new Error('salesforce: credentials are required (accessToken, instanceUrl)');
  }
  return { accessToken, instanceUrl };
}

module.exports = {
  toolkit: 'salesforce',
  name: 'Query records',
  description: 'Queries Salesforce records with SOQL.',
  input: z.object({
    soql: z.string().min(1, 'A SOQL query is required'),
  }),
  run: async (credentials, input) => {
    const { accessToken, instanceUrl } = getCredentials(credentials);
    const base = instanceUrl.replace(/\/+$/, '');
    const res = await fetch(
      `${base}/services/data/${API_VERSION}/query?q=${encodeURIComponent(input.soql)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const data = await res.json();
    if (!res.ok) {
      const msg = Array.isArray(data) ? (data[0] && data[0].message) || 'unknown error' : data.message || 'unknown error';
      throw new Error(`salesforce: query records failed (${res.status}): ${msg}`);
    }
    return {
      records: data.records || [],
      total: data.totalSize || 0,
      count: (data.records || []).length,
    };
  },
};
