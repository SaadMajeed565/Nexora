// Google Sheets — Find row. Self-contained: only requires googleapis +
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
  name: 'Find row',
  description:
    'Looks up the first row where a column matches a value (e.g. order number -> order status). Returns the row and its 1-based row number, or null.',
  input: z.object({
    spreadsheetId: z.string().min(1, 'A spreadsheet id is required'),
    range: z.string().min(1, 'A range is required (e.g. "Orders!A1:F100")'),
    column: z.number().int().min(0, 'Column is a 0-based index (0 = first column)'),
    value: z.string().min(1, 'A value to match is required'),
  }),
  run: async (credentials, input) => {
    const sheets = google.sheets({ version: 'v4', auth: getAuth(credentials) });
    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: input.spreadsheetId,
      range: input.range,
    });
    const rows = data.values || [];
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][input.column] ?? '') === input.value) {
        return { rowIndex: i + 1, row: rows[i] };
      }
    }
    return { rowIndex: null, row: null };
  },
};
