// Google Drive — Read file. Self-contained: only requires googleapis +
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

const GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';

module.exports = {
  toolkit: 'googledrive',
  name: 'Read file',
  description:
    "Reads a file's text content. Google Docs are exported as plain text; other files are downloaded as text.",
  input: z.object({
    fileId: z.string().min(1, 'A file id is required'),
  }),
  run: async (credentials, input) => {
    const drive = google.drive({ version: 'v3', auth: getAuth(credentials) });
    const { data: meta } = await drive.files.get({
      fileId: input.fileId,
      fields: 'id, name, mimeType',
    });
    let content;
    if (meta.mimeType === GOOGLE_DOC_MIME) {
      const { data } = await drive.files.export({
        fileId: input.fileId,
        mimeType: 'text/plain',
      });
      content = typeof data === 'string' ? data : String(data);
    } else {
      const { data } = await drive.files.get({ fileId: input.fileId, alt: 'media' });
      content = typeof data === 'string' ? data : String(data);
    }
    return { id: meta.id, name: meta.name, mimeType: meta.mimeType, content };
  },
};
