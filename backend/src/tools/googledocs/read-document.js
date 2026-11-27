// Google Docs — Read document. Self-contained: only requires googleapis +
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

// Cap on returned text so a huge document cannot flood the model context.
const MAX_CONTENT_CHARS = 50000;

module.exports = {
  toolkit: 'googledocs',
  name: 'Read document',
  description: 'Reads a Google Doc as plain text.',
  input: z.object({
    documentId: z.string().min(1, 'A document id is required'),
  }),
  run: async (credentials, input) => {
    const docs = google.docs({ version: 'v1', auth: getAuth(credentials) });
    const { data } = await docs.documents.get({ documentId: input.documentId });
    let content = '';
    for (const el of (data.body && data.body.content) || []) {
      if (!el.paragraph) continue;
      for (const pe of el.paragraph.elements || []) {
        if (pe.textRun && typeof pe.textRun.content === 'string') content += pe.textRun.content;
      }
    }
    if (content.length > MAX_CONTENT_CHARS) {
      return { id: data.documentId, title: data.title, content: content.slice(0, MAX_CONTENT_CHARS), truncated: true };
    }
    return { id: data.documentId, title: data.title, content };
  },
};
