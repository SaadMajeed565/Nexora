// Outlook — Search email. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
//
// Expected credentials: { clientId, clientSecret, refreshToken } (Microsoft Graph OAuth — one Microsoft app registration covers Teams, Outlook and Excel.)
const { z } = require('zod');

async function getAccessToken(credentials) {
  const { clientId, clientSecret, refreshToken } = credentials || {};
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('outlook: Microsoft credentials are required (clientId, clientSecret, refreshToken)');
  }
  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/.default',
    }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(
      `outlook: could not get a Microsoft access token (${res.status}): ${data.error_description || data.error || 'unknown error'}`
    );
  }
  return data.access_token;
}

module.exports = {
  toolkit: 'outlook',
  name: 'Search email',
  description: 'Searches the Outlook mailbox for messages matching a query.',
  input: z.object({
    query: z.string().min(1, 'A search query is required'),
    maxResults: z.number().int().min(1).max(50).optional().default(10),
  }),
  run: async (credentials, input) => {
    const token = await getAccessToken(credentials);
    const url = 'https://graph.microsoft.com/v1.0/me/messages?' + new URLSearchParams({ $search: `"${input.query}"`, $top: String(input.maxResults), $orderby: 'receivedDateTime desc' }).toString();
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(`outlook: search failed (${res.status}): ${(data.error && data.error.message) || 'unknown error'}`);
    }
    const messages = (data.value || []).map((m) => ({ id: m.id, subject: m.subject || null, from: m.from && m.from.emailAddress ? m.from.emailAddress.address : null, receivedDateTime: m.receivedDateTime || null }));
    return { messages, count: messages.length };
  },
};
