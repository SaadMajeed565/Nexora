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

function toBase64Url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Header values come from an LLM, so they must never contain line breaks:
// a CR/LF would let the model (or text it read) inject extra headers such as Bcc.
function safeHeader(value, field) {
  const v = String(value);
  if (/[\r\n]/.test(v)) {
    throw new Error(`gmail: ${field} must not contain line breaks`);
  }
  return v;
}

// RFC 2047 encoding so non-ASCII subjects (e.g. Urdu, accents) arrive intact.
function encodeSubject(subject) {
  return /^[\x20-\x7e]*$/.test(subject)
    ? subject
    : `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
}

// Base64 body, wrapped at 76 chars as MIME expects.
function encodeBody(body) {
  return Buffer.from(body, 'utf8')
    .toString('base64')
    .replace(/(.{76})/g, '$1\r\n');
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
    const lines = [
      `To: ${safeHeader(input.to, 'to')}`,
      `Subject: ${encodeSubject(safeHeader(input.subject, 'subject'))}`,
      'MIME-Version: 1.0',
    ];
    if (input.inReplyTo) {
      const ref = safeHeader(input.inReplyTo, 'inReplyTo');
      lines.push(`In-Reply-To: ${ref}`, `References: ${ref}`);
    }
    lines.push(
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      encodeBody(input.body)
    );
    const { data } = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: toBase64Url(lines.join('\r\n')), threadId: input.threadId },
    });
    return { id: data.id, threadId: data.threadId };
  },
};
