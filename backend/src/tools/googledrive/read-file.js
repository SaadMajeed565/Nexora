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

// Cap on returned text so a huge file cannot flood the model context.
const MAX_CONTENT_CHARS = 50000;

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
    let data;
    if (meta.mimeType === GOOGLE_DOC_MIME) {
      data = (await drive.files.export({
        fileId: input.fileId,
        mimeType: 'text/plain',
      })).data;
    } else {
      data = (await drive.files.get({ fileId: input.fileId, alt: 'media' })).data;
    }
    if (Buffer.isBuffer(data) && data.includes(0)) {
      throw new Error('googledrive: file is not readable as text (binary)');
    }
    const content = typeof data === 'string' ? data : String(data);
    if (content.length > MAX_CONTENT_CHARS) {
      return { id: meta.id, name: meta.name, mimeType: meta.mimeType, content: content.slice(0, MAX_CONTENT_CHARS), truncated: true };
    }
    return { id: meta.id, name: meta.name, mimeType: meta.mimeType, content };
  },
};
