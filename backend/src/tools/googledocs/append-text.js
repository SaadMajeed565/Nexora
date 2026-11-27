// Google Docs — Append text. Self-contained: only requires googleapis +
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
  name: 'Append text',
  description: 'Appends text to the end of a Google Doc.',
  input: z.object({
    documentId: z.string().min(1, 'A document id is required'),
    text: z.string().min(1, 'Text to append is required'),
  }),
  run: async (credentials, input) => {
    const docs = google.docs({ version: 'v1', auth: getAuth(credentials) });
    const { data } = await docs.documents.get({ documentId: input.documentId });
    const content = (data.body && data.body.content) || [];
    const lastEl = content[content.length - 1];
    const endIndex = lastEl && typeof lastEl.endIndex === 'number' ? lastEl.endIndex - 1 : 1;
    await docs.documents.batchUpdate({
      documentId: input.documentId,
      requestBody: {
        requests: [{ insertText: { location: { index: endIndex }, text: input.text } }],
      },
    });
    return { id: input.documentId, appendedChars: input.text.length };
  },
};
