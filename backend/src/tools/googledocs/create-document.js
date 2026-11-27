// Google Docs — Create document. Self-contained: only requires googleapis +
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

module.exports = {
  toolkit: 'googledocs',
  name: 'Create document',
  description: 'Creates a new Google Doc, optionally with starting text.',
  input: z.object({
    title: z.string().min(1, 'A title is required'),
    text: z.string().optional(),
  }),
  run: async (credentials, input) => {
    const docs = google.docs({ version: 'v1', auth: getAuth(credentials) });
    const { data } = await docs.documents.create({ requestBody: { title: input.title } });
    if (input.text) {
      await docs.documents.batchUpdate({
        documentId: data.documentId,
        requestBody: {
          requests: [{ insertText: { location: { index: 1 }, text: input.text } }],
        },
      });
    }
    return { id: data.documentId, title: data.title };
  },
};
