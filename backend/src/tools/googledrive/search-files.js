// Google Drive — Search files. Self-contained: only requires googleapis +
// zod. Copyable verbatim into a generated agent project — no Nexora backend
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
      'googledrive: Google OAuth credentials are required (clientId, clientSecret, and refreshToken or accessToken)'
    );
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return oauth2;
}

module.exports = {
  toolkit: 'googledrive',
  name: 'Search files',
  description: 'Finds files by name or content (the knowledge base search).',
  input: z.object({
    query: z.string().min(1, 'A search query is required (e.g. "refund policy")'),
    maxResults: z.number().int().min(1).max(100).optional().default(10),
  }),
  run: async (credentials, input) => {
    const drive = google.drive({ version: 'v3', auth: getAuth(credentials) });
    const q = input.query.replace(/'/g, "\\'");
    const { data } = await drive.files.list({
      q: `name contains '${q}' or fullText contains '${q}'`,
      pageSize: input.maxResults,
      fields: 'files(id, name, mimeType, modifiedTime)',
    });
    return {
      files: (data.files || []).map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime,
      })),
    };
  },
};
