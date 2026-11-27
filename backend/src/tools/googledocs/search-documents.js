// Google Docs — Search documents. Self-contained: only requires googleapis +
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
      'googledocs: Google OAuth credentials are required (clientId, clientSecret, and refreshToken or accessToken)'
    );
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return oauth2;
}

const DOC_MIME = 'application/vnd.google-apps.document';

module.exports = {
  toolkit: 'googledocs',
  name: 'Search documents',
  description: 'Searches Google Docs by title.',
  input: z.object({
    query: z.string().min(1, 'A search query is required'),
    maxResults: z.number().int().min(1).max(100).optional().default(10),
  }),
  run: async (credentials, input) => {
    const drive = google.drive({ version: 'v3', auth: getAuth(credentials) });
    // Drive query language: a single quote inside a quoted value is escaped
    // by doubling it.
    const escaped = input.query.replace(/'/g, "''");
    const { data } = await drive.files.list({
      q: `mimeType='${DOC_MIME}' and name contains '${escaped}'`,
      fields: 'files(id, name, modifiedTime)',
      pageSize: input.maxResults,
    });
    return {
      documents: (data.files || []).map((f) => ({ id: f.id, name: f.name, modifiedTime: f.modifiedTime })),
    };
  },
};
