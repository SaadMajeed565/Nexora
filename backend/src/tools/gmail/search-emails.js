// Gmail — Search emails. Self-contained: only requires googleapis + zod.
// Copyable verbatim into a generated agent project — no Nexora backend
// imports, no sibling tool files. Credentials are passed in by the caller
// (from the secrets store); this file never reads process.env and never
// hardcodes a key.
//
// Expected credentials: { clientId, clientSecret, refreshToken, accessToken? }
// (Google OAuth2 — refreshToken is preferred; accessToken alone also works
// until it expires.)
const { google } = require('googleapis');
const { z } = require('zod');

function getAuth(credentials) {
  const { clientId, clientSecret, refreshToken, accessToken } = credentials || {};
  if (!clientId || !clientSecret || (!refreshToken && !accessToken)) {
    throw new Error(
      'gmail: Google OAuth credentials are required (clientId, clientSecret, and refreshToken or accessToken)'
    );
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return oauth2;
}

module.exports = {
  toolkit: 'gmail',
  name: 'Search emails',
  description: 'Lists inbox messages matching a search query (from, subject, unread, etc.).',
  input: z.object({
    query: z.string().min(1, 'A search query is required (e.g. "from:shop.com" or "is:unread")'),
    maxResults: z.number().int().min(1).max(100).optional().default(10),
  }),
  run: async (credentials, input) => {
    const gmail = google.gmail({ version: 'v1', auth: getAuth(credentials) });
    const { data } = await gmail.users.messages.list({
      userId: 'me',
      q: input.query,
      maxResults: input.maxResults,
    });
    return {
      messages: (data.messages || []).map((m) => ({ id: m.id, threadId: m.threadId })),
    };
  },
};
