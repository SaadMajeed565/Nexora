// Outlook — Send email. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
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
  name: 'Send email',
  description: 'Sends an email from the Outlook mailbox.',
  input: z.object({
    to: z.string().email('A valid recipient email is required'),
    subject: z.string().min(1, 'A subject is required'),
    body: z.string().min(1, 'A message body is required'),
  }),
  run: async (credentials, input) => {
    const token = await getAccessToken(credentials);
    const res = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: { subject: input.subject, body: { contentType: 'Text', content: input.body }, toRecipients: [{ emailAddress: { address: input.to } }] }, saveToSentItems: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(`outlook: send failed (${res.status}): ${(data.error && data.error.message) || 'unknown error'}`);
    }
    return { sent: true, to: input.to };
  },
};
