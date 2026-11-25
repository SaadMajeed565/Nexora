// Gmail — Send email. Self-contained: only requires googleapis + zod.
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

function toBase64Url(str) {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

module.exports = {
  toolkit: 'gmail',
  name: 'Send email',
  description: 'Sends a new email, or a reply inside an existing thread.',
  input: z.object({
    to: z.string().min(1, 'A recipient address is required'),
    subject: z.string().min(1, 'A subject is required'),
    body: z.string().min(1, 'A message body is required'),
    threadId: z.string().optional(),
    inReplyTo: z.string().optional(),
  }),
  run: async (credentials, input) => {
    const gmail = google.gmail({ version: 'v1', auth: getAuth(credentials) });
    const lines = [`To: ${input.to}`, `Subject: ${input.subject}`];
    if (input.inReplyTo) {
      lines.push(`In-Reply-To: ${input.inReplyTo}`, `References: ${input.inReplyTo}`);
    }
    lines.push('Content-Type: text/plain; charset=utf-8', '', input.body);
    const { data } = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: toBase64Url(lines.join('\r\n')), threadId: input.threadId },
    });
    return { id: data.id, threadId: data.threadId };
  },
};
