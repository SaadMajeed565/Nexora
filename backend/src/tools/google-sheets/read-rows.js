// Google Sheets — Read rows. Self-contained: only requires googleapis +
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
      'google-sheets: Google OAuth credentials are required (clientId, clientSecret, and refreshToken or accessToken)'
    );
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return oauth2;
}

module.exports = {
  toolkit: 'google-sheets',
  name: 'Read rows',
  description: 'Reads a range of rows from a sheet.',
  input: z.object({
    spreadsheetId: z.string().min(1, 'A spreadsheet id is required'),
    range: z.string().min(1, 'A range is required (e.g. "Orders!A1:F100")'),
  }),
  run: async (credentials, input) => {
    const sheets = google.sheets({ version: 'v4', auth: getAuth(credentials) });
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: input.spreadsheetId,
      range: input.range,
    });
    return { range: data.range, values: data.values || [] };
  },
};
