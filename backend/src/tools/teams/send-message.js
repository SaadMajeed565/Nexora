// Teams — Send message. Self-contained: only uses Node's built-in global fetch + zod — no extra SDK. Copyable verbatim into a generated agent project — no Nexora backend imports, no sibling tool files. Credentials are passed in by the caller (from the secrets store); this file never reads process.env and never hardcodes a key.
//
// Expected credentials: { clientId, clientSecret, refreshToken } (Microsoft Graph OAuth).
const { z } = require('zod');

async function getAccessToken(credentials) {
  const { clientId, clientSecret, refreshToken } = credentials || {};
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('teams: Microsoft credentials are required (clientId, clientSecret, refreshToken)');
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
      `teams: could not get a Microsoft access token (${res.status}): ${data.error_description || data.error || 'unknown error'}`
    );
  }
  return data.access_token;
}

module.exports = {
  toolkit: 'teams',
  name: 'Send message',
  description: 'Sends a message to a Microsoft Teams channel.',
  input: z.object({
    teamId: z.string().min(1, 'A team id is required'),
    channelId: z.string().min(1, 'A channel id is required'),
    message: z.string().min(1, 'A message is required'),
  }),
  run: async (credentials, input) => {
    const token = await getAccessToken(credentials);
    const res = await fetch(
      `https://graph.microsoft.com/v1.0/teams/${input.teamId}/channels/${input.channelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: { content: input.message } }),
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        `teams: send failed (${res.status}): ${(data.error && data.error.message) || 'unknown error'}`
      );
    }
    return { messageId: data.id, teamId: input.teamId, channelId: input.channelId };
  },
};
