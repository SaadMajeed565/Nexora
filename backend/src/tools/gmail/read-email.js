// Gmail — Read email. Self-contained: only requires googleapis + zod.
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

function decodeBase64Url(s) {
  return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

// Prefer the text/plain part; fall back to any nested part that has a body.
function findTextPart(payload) {
  if (!payload) return '';
  if (payload.body && payload.body.data) return decodeBase64Url(payload.body.data);
  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    for (const part of payload.parts) {
      const text = findTextPart(part);
      if (text) return text;
    }
  }
  return '';
}

function headerValue(headers, name) {
  const h = (headers || []).find((x) => String(x.name).toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

module.exports = {
  toolkit: 'gmail',
  name: 'Read email',
  description: 'Reads the full body of one email, with its sender, subject and date.',
  input: z.object({
    messageId: z.string().min(1, 'A message id is required'),
  }),
  run: async (credentials, input) => {
    const gmail = google.gmail({ version: 'v1', auth: getAuth(credentials) });
    const { data } = await gmail.users.messages.get({
      userId: 'me',
      id: input.messageId,
      format: 'full',
    });
    return {
      id: data.id,
      threadId: data.threadId,
      from: headerValue(data.payload && data.payload.headers, 'From'),
      subject: headerValue(data.payload && data.payload.headers, 'Subject'),
      date: headerValue(data.payload && data.payload.headers, 'Date'),
      body: findTextPart(data.payload),
      snippet: data.snippet || '',
    };
  },
};
